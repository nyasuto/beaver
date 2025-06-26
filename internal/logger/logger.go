package logger

import (
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
