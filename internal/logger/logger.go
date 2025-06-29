package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
)

var globalLogger *slog.Logger

// Level represents logging levels
type Level = slog.Level

const (
	LevelDebug = slog.LevelDebug
	LevelInfo  = slog.LevelInfo
	LevelWarn  = slog.LevelWarn
	LevelError = slog.LevelError
)

// Config holds logger configuration
type Config struct {
	Level  Level
	Format string // "json" or "text"
	Output io.Writer
}

// ContextConfig holds additional configuration for context-aware logging
type ContextConfig struct {
	RequestIDKey string // Key name for request ID in context
	UserIDKey    string // Key name for user ID in context
	ServiceKey   string // Key name for service name in context
}

// contextKey is the type for logger context keys
type contextKey string

const (
	loggerContextKey contextKey = "logger"
)

// InitLogger initializes the global logger with the given configuration
func InitLogger(config Config) {
	if config.Output == nil {
		config.Output = os.Stdout
	}

	var handler slog.Handler
	opts := &slog.HandlerOptions{
		Level: config.Level,
	}

	switch config.Format {
	case "json":
		handler = slog.NewJSONHandler(config.Output, opts)
	default:
		handler = slog.NewTextHandler(config.Output, opts)
	}

	globalLogger = slog.New(handler)
	slog.SetDefault(globalLogger)
}

// GetLogger returns the global logger instance
func GetLogger() *slog.Logger {
	if globalLogger == nil {
		// Initialize with default settings if not already initialized
		InitLogger(Config{
			Level:  LevelInfo,
			Format: "text",
			Output: os.Stdout,
		})
	}
	return globalLogger
}

// Info logs an info message
func Info(msg string, args ...any) {
	GetLogger().Info(msg, args...)
}

// Debug logs a debug message
func Debug(msg string, args ...any) {
	GetLogger().Debug(msg, args...)
}

// Warn logs a warning message
func Warn(msg string, args ...any) {
	GetLogger().Warn(msg, args...)
}

// Error logs an error message
func Error(msg string, args ...any) {
	GetLogger().Error(msg, args...)
}

// With returns a new logger with the given attributes
func With(args ...any) *slog.Logger {
	return GetLogger().With(args...)
}

// LogLevel parses a string level to slog.Level
func LogLevel(level string) Level {
	switch level {
	case "debug":
		return LevelDebug
	case "info":
		return LevelInfo
	case "warn", "warning":
		return LevelWarn
	case "error":
		return LevelError
	default:
		return LevelInfo
	}
}

// WithContext creates a new logger with context information
func WithContext(ctx context.Context, attrs ...any) *slog.Logger {
	logger := GetLogger()

	// Extract common context values and add them as attributes
	var contextAttrs []any

	// Add request ID if present
	if requestID := ctx.Value("request_id"); requestID != nil {
		contextAttrs = append(contextAttrs, "request_id", requestID)
	}

	// Add user ID if present
	if userID := ctx.Value("user_id"); userID != nil {
		contextAttrs = append(contextAttrs, "user_id", userID)
	}

	// Add service name if present
	if service := ctx.Value("service"); service != nil {
		contextAttrs = append(contextAttrs, "service", service)
	}

	// Combine context attributes with provided attributes
	allAttrs := append(contextAttrs, attrs...)

	return logger.With(allAttrs...)
}

// FromContext retrieves a logger from context, or returns the global logger
func FromContext(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(loggerContextKey).(*slog.Logger); ok {
		return logger
	}
	return GetLogger()
}

// ToContext stores a logger in the context
func ToContext(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerContextKey, logger)
}

// WithComponent creates a logger with a component name for better tracing
func WithComponent(component string) *slog.Logger {
	return GetLogger().With("component", component)
}

// WithError creates a logger with error information
func WithError(err error) *slog.Logger {
	return GetLogger().With("error", err.Error())
}

// WithFields creates a logger with multiple key-value pairs
func WithFields(fields map[string]any) *slog.Logger {
	logger := GetLogger()
	for key, value := range fields {
		logger = logger.With(key, value)
	}
	return logger
}

// Enabled checks if a log level is enabled for performance optimization
func Enabled(level Level) bool {
	return GetLogger().Enabled(context.Background(), level)
}

// Performance optimization: Only format expensive operations if logging level permits
func DebugFunc(msg string, fn func() []any) {
	if Enabled(LevelDebug) {
		Debug(msg, fn()...)
	}
}

// InfoFunc logs info with lazy evaluation
func InfoFunc(msg string, fn func() []any) {
	if Enabled(LevelInfo) {
		Info(msg, fn()...)
	}
}

// WarnFunc logs warn with lazy evaluation
func WarnFunc(msg string, fn func() []any) {
	if Enabled(LevelWarn) {
		Warn(msg, fn()...)
	}
}

// ErrorFunc logs error with lazy evaluation
func ErrorFunc(msg string, fn func() []any) {
	if Enabled(LevelError) {
		Error(msg, fn()...)
	}
}
