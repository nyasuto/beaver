package logger

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"testing"
)

func TestInitLogger(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	t.Run("Text format with default output", func(t *testing.T) {
		globalLogger = nil
		config := Config{
			Level:  LevelInfo,
			Format: "text",
			Output: nil, // Should default to os.Stdout
		}

		InitLogger(config)

		if globalLogger == nil {
			t.Error("InitLogger() should set globalLogger")
		}

		// Test that the default logger was set
		if slog.Default() != globalLogger {
			t.Error("InitLogger() should set the default slog logger")
		}
	})

	t.Run("JSON format with custom output", func(t *testing.T) {
		globalLogger = nil
		var buf bytes.Buffer
		config := Config{
			Level:  LevelDebug,
			Format: "json",
			Output: &buf,
		}

		InitLogger(config)

		if globalLogger == nil {
			t.Error("InitLogger() should set globalLogger")
		}

		// Test logging
		globalLogger.Info("test message", "key", "value")
		output := buf.String()

		// JSON output should contain structured data
		if !strings.Contains(output, `"msg":"test message"`) {
			t.Errorf("JSON output should contain message, got: %s", output)
		}
		if !strings.Contains(output, `"key":"value"`) {
			t.Errorf("JSON output should contain key-value pair, got: %s", output)
		}
	})

	t.Run("Text format with custom output", func(t *testing.T) {
		globalLogger = nil
		var buf bytes.Buffer
		config := Config{
			Level:  LevelWarn,
			Format: "text",
			Output: &buf,
		}

		InitLogger(config)

		// Test that debug messages are filtered out
		globalLogger.Debug("debug message")
		if buf.String() != "" {
			t.Errorf("Debug message should be filtered out at WARN level, got: %s", buf.String())
		}

		// Test that warn messages are logged
		buf.Reset()
		globalLogger.Warn("warn message", "component", "test")
		output := buf.String()

		if !strings.Contains(output, "warn message") {
			t.Errorf("Warn message should be logged, got: %s", output)
		}
		if !strings.Contains(output, "component=test") {
			t.Errorf("Text output should contain key=value format, got: %s", output)
		}
	})

	t.Run("Unknown format defaults to text", func(t *testing.T) {
		globalLogger = nil
		var buf bytes.Buffer
		config := Config{
			Level:  LevelInfo,
			Format: "unknown",
			Output: &buf,
		}

		InitLogger(config)

		globalLogger.Info("test message")
		output := buf.String()

		// Should use text format (not JSON)
		if strings.Contains(output, `"msg":`) {
			t.Errorf("Unknown format should default to text, but got JSON-like output: %s", output)
		}
	})
}

func TestGetLogger(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	t.Run("Returns existing logger", func(t *testing.T) {
		var buf bytes.Buffer
		InitLogger(Config{
			Level:  LevelInfo,
			Format: "text",
			Output: &buf,
		})

		logger1 := GetLogger()
		logger2 := GetLogger()

		if logger1 != logger2 {
			t.Error("GetLogger() should return the same instance")
		}
		if logger1 != globalLogger {
			t.Error("GetLogger() should return the global logger")
		}
	})

	t.Run("Initializes with defaults when nil", func(t *testing.T) {
		globalLogger = nil

		logger := GetLogger()

		if logger == nil {
			t.Error("GetLogger() should not return nil")
		}
		if globalLogger == nil {
			t.Error("GetLogger() should initialize globalLogger")
		}
		if logger != globalLogger {
			t.Error("GetLogger() should return the initialized global logger")
		}
	})
}

func TestLogFunctions(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	var buf bytes.Buffer
	InitLogger(Config{
		Level:  LevelDebug,
		Format: "text",
		Output: &buf,
	})

	t.Run("Info logging", func(t *testing.T) {
		buf.Reset()
		Info("info message", "key", "value")
		output := buf.String()

		if !strings.Contains(output, "info message") {
			t.Errorf("Info() should log message, got: %s", output)
		}
		if !strings.Contains(output, "key=value") {
			t.Errorf("Info() should log key-value pairs, got: %s", output)
		}
	})

	t.Run("Debug logging", func(t *testing.T) {
		buf.Reset()
		Debug("debug message", "component", "test")
		output := buf.String()

		if !strings.Contains(output, "debug message") {
			t.Errorf("Debug() should log message, got: %s", output)
		}
		if !strings.Contains(output, "component=test") {
			t.Errorf("Debug() should log key-value pairs, got: %s", output)
		}
	})

	t.Run("Warn logging", func(t *testing.T) {
		buf.Reset()
		Warn("warn message", "error_code", 500)
		output := buf.String()

		if !strings.Contains(output, "warn message") {
			t.Errorf("Warn() should log message, got: %s", output)
		}
		if !strings.Contains(output, "error_code=500") {
			t.Errorf("Warn() should log key-value pairs, got: %s", output)
		}
	})

	t.Run("Error logging", func(t *testing.T) {
		buf.Reset()
		Error("error message", "fatal", true)
		output := buf.String()

		if !strings.Contains(output, "error message") {
			t.Errorf("Error() should log message, got: %s", output)
		}
		if !strings.Contains(output, "fatal=true") {
			t.Errorf("Error() should log key-value pairs, got: %s", output)
		}
	})
}

func TestWith(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	var buf bytes.Buffer
	InitLogger(Config{
		Level:  LevelInfo,
		Format: "text",
		Output: &buf,
	})

	childLogger := With("component", "test", "version", "1.0")

	if childLogger == nil {
		t.Error("With() should return a logger")
	}

	if childLogger == globalLogger {
		t.Error("With() should return a new logger instance")
	}

	// Test that child logger includes context
	buf.Reset()
	childLogger.Info("test message")
	output := buf.String()

	if !strings.Contains(output, "component=test") {
		t.Errorf("Child logger should include component context, got: %s", output)
	}
	if !strings.Contains(output, "version=1.0") {
		t.Errorf("Child logger should include version context, got: %s", output)
	}
	if !strings.Contains(output, "test message") {
		t.Errorf("Child logger should log the message, got: %s", output)
	}
}

func TestLogLevel(t *testing.T) {
	tests := []struct {
		input    string
		expected Level
	}{
		{"debug", LevelDebug},
		{"info", LevelInfo},
		{"warn", LevelWarn},
		{"warning", LevelWarn},
		{"error", LevelError},
		{"invalid", LevelInfo}, // Should default to Info
		{"", LevelInfo},        // Should default to Info
		{"DEBUG", LevelInfo},   // Case sensitive, should default to Info
		{"Info", LevelInfo},    // Case sensitive, should default to Info
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := LogLevel(tt.input)
			if result != tt.expected {
				t.Errorf("LogLevel(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestLevelConstants(t *testing.T) {
	// Test that our constants match slog constants
	if LevelDebug != slog.LevelDebug {
		t.Error("LevelDebug should equal slog.LevelDebug")
	}
	if LevelInfo != slog.LevelInfo {
		t.Error("LevelInfo should equal slog.LevelInfo")
	}
	if LevelWarn != slog.LevelWarn {
		t.Error("LevelWarn should equal slog.LevelWarn")
	}
	if LevelError != slog.LevelError {
		t.Error("LevelError should equal slog.LevelError")
	}
}

func TestLogLevelFiltering(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	t.Run("Debug level logs everything", func(t *testing.T) {
		var buf bytes.Buffer
		InitLogger(Config{
			Level:  LevelDebug,
			Format: "text",
			Output: &buf,
		})

		Debug("debug msg")
		Info("info msg")
		Warn("warn msg")
		Error("error msg")

		output := buf.String()
		if !strings.Contains(output, "debug msg") {
			t.Error("Debug level should log debug messages")
		}
		if !strings.Contains(output, "info msg") {
			t.Error("Debug level should log info messages")
		}
		if !strings.Contains(output, "warn msg") {
			t.Error("Debug level should log warn messages")
		}
		if !strings.Contains(output, "error msg") {
			t.Error("Debug level should log error messages")
		}
	})

	t.Run("Info level filters debug", func(t *testing.T) {
		var buf bytes.Buffer
		InitLogger(Config{
			Level:  LevelInfo,
			Format: "text",
			Output: &buf,
		})

		Debug("debug msg")
		Info("info msg")
		Warn("warn msg")
		Error("error msg")

		output := buf.String()
		if strings.Contains(output, "debug msg") {
			t.Error("Info level should not log debug messages")
		}
		if !strings.Contains(output, "info msg") {
			t.Error("Info level should log info messages")
		}
		if !strings.Contains(output, "warn msg") {
			t.Error("Info level should log warn messages")
		}
		if !strings.Contains(output, "error msg") {
			t.Error("Info level should log error messages")
		}
	})

	t.Run("Error level filters debug, info, warn", func(t *testing.T) {
		var buf bytes.Buffer
		InitLogger(Config{
			Level:  LevelError,
			Format: "text",
			Output: &buf,
		})

		Debug("debug msg")
		Info("info msg")
		Warn("warn msg")
		Error("error msg")

		output := buf.String()
		if strings.Contains(output, "debug msg") {
			t.Error("Error level should not log debug messages")
		}
		if strings.Contains(output, "info msg") {
			t.Error("Error level should not log info messages")
		}
		if strings.Contains(output, "warn msg") {
			t.Error("Error level should not log warn messages")
		}
		if !strings.Contains(output, "error msg") {
			t.Error("Error level should log error messages")
		}
	})
}

func TestConfigStruct(t *testing.T) {
	var buf bytes.Buffer
	config := Config{
		Level:  LevelWarn,
		Format: "json",
		Output: &buf,
	}

	if config.Level != LevelWarn {
		t.Errorf("Config.Level = %v, want %v", config.Level, LevelWarn)
	}
	if config.Format != "json" {
		t.Errorf("Config.Format = %q, want %q", config.Format, "json")
	}
	if config.Output != &buf {
		t.Errorf("Config.Output = %v, want %v", config.Output, &buf)
	}
}

func TestConcurrentLogging(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	var buf bytes.Buffer
	InitLogger(Config{
		Level:  LevelInfo,
		Format: "text",
		Output: &buf,
	})

	// Test concurrent access to logger
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(id int) {
			Info("concurrent message", "goroutine", id)
			done <- true
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}

	output := buf.String()
	// Should contain messages from all goroutines
	if !strings.Contains(output, "concurrent message") {
		t.Error("Concurrent logging should work without race conditions")
	}
}

func TestWithContext(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	var buf bytes.Buffer
	InitLogger(Config{
		Level:  LevelInfo,
		Format: "text",
		Output: &buf,
	})

	t.Run("WithContext extracts context values", func(t *testing.T) {
		ctx := context.Background()
		ctx = context.WithValue(ctx, "request_id", "req-123")
		ctx = context.WithValue(ctx, "user_id", "user-456")
		ctx = context.WithValue(ctx, "service", "beaver")

		logger := WithContext(ctx, "extra", "value")

		buf.Reset()
		logger.Info("test message")
		output := buf.String()

		if !strings.Contains(output, "request_id=req-123") {
			t.Errorf("Should contain request_id, got: %s", output)
		}
		if !strings.Contains(output, "user_id=user-456") {
			t.Errorf("Should contain user_id, got: %s", output)
		}
		if !strings.Contains(output, "service=beaver") {
			t.Errorf("Should contain service, got: %s", output)
		}
		if !strings.Contains(output, "extra=value") {
			t.Errorf("Should contain extra attributes, got: %s", output)
		}
	})

	t.Run("WithContext handles missing context values", func(t *testing.T) {
		ctx := context.Background()
		logger := WithContext(ctx, "test", "value")

		buf.Reset()
		logger.Info("test message")
		output := buf.String()

		if !strings.Contains(output, "test=value") {
			t.Errorf("Should contain provided attributes, got: %s", output)
		}
		// Should not contain context values that weren't set
		if strings.Contains(output, "request_id=") {
			t.Errorf("Should not contain request_id when not set, got: %s", output)
		}
	})
}

func TestFromContext(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	var buf bytes.Buffer
	InitLogger(Config{
		Level:  LevelInfo,
		Format: "text",
		Output: &buf,
	})

	t.Run("FromContext returns stored logger", func(t *testing.T) {
		customLogger := GetLogger().With("component", "test")
		ctx := ToContext(context.Background(), customLogger)

		retrieved := FromContext(ctx)
		if retrieved != customLogger {
			t.Error("FromContext should return the stored logger")
		}
	})

	t.Run("FromContext returns global logger when no logger in context", func(t *testing.T) {
		ctx := context.Background()
		retrieved := FromContext(ctx)

		if retrieved != GetLogger() {
			t.Error("FromContext should return global logger when none in context")
		}
	})
}

func TestToContext(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	InitLogger(Config{
		Level:  LevelInfo,
		Format: "text",
		Output: &bytes.Buffer{},
	})

	customLogger := GetLogger().With("component", "test")
	ctx := ToContext(context.Background(), customLogger)

	retrieved := FromContext(ctx)
	if retrieved != customLogger {
		t.Error("ToContext/FromContext should preserve logger instance")
	}
}

func TestWithComponent(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	var buf bytes.Buffer
	InitLogger(Config{
		Level:  LevelInfo,
		Format: "text",
		Output: &buf,
	})

	logger := WithComponent("auth-service")

	buf.Reset()
	logger.Info("authentication successful")
	output := buf.String()

	if !strings.Contains(output, "component=auth-service") {
		t.Errorf("Should contain component attribute, got: %s", output)
	}
	if !strings.Contains(output, "authentication successful") {
		t.Errorf("Should contain log message, got: %s", output)
	}
}

func TestWithError(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	var buf bytes.Buffer
	InitLogger(Config{
		Level:  LevelInfo,
		Format: "text",
		Output: &buf,
	})

	testErr := errors.New("database connection failed")
	logger := WithError(testErr)

	buf.Reset()
	logger.Error("operation failed")
	output := buf.String()

	if !strings.Contains(output, "error=\"database connection failed\"") {
		t.Errorf("Should contain error attribute, got: %s", output)
	}
	if !strings.Contains(output, "operation failed") {
		t.Errorf("Should contain log message, got: %s", output)
	}
}

func TestWithFields(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	var buf bytes.Buffer
	InitLogger(Config{
		Level:  LevelInfo,
		Format: "text",
		Output: &buf,
	})

	fields := map[string]any{
		"user_id":    "123",
		"session_id": "abc-def",
		"action":     "login",
		"attempt":    3,
	}

	logger := WithFields(fields)

	buf.Reset()
	logger.Info("user action logged")
	output := buf.String()

	if !strings.Contains(output, "user_id=123") {
		t.Errorf("Should contain user_id field, got: %s", output)
	}
	if !strings.Contains(output, "session_id=abc-def") {
		t.Errorf("Should contain session_id field, got: %s", output)
	}
	if !strings.Contains(output, "action=login") {
		t.Errorf("Should contain action field, got: %s", output)
	}
	if !strings.Contains(output, "attempt=3") {
		t.Errorf("Should contain attempt field, got: %s", output)
	}
}

func TestEnabled(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	t.Run("Enabled returns true for levels at or above threshold", func(t *testing.T) {
		InitLogger(Config{
			Level:  LevelWarn,
			Format: "text",
			Output: &bytes.Buffer{},
		})

		if Enabled(LevelDebug) {
			t.Error("Debug should not be enabled at Warn level")
		}
		if Enabled(LevelInfo) {
			t.Error("Info should not be enabled at Warn level")
		}
		if !Enabled(LevelWarn) {
			t.Error("Warn should be enabled at Warn level")
		}
		if !Enabled(LevelError) {
			t.Error("Error should be enabled at Warn level")
		}
	})
}

func TestLazyLoggingFunctions(t *testing.T) {
	// Reset global logger for testing
	originalLogger := globalLogger
	defer func() { globalLogger = originalLogger }()

	var buf bytes.Buffer
	InitLogger(Config{
		Level:  LevelInfo,
		Format: "text",
		Output: &buf,
	})

	called := false
	expensiveFunc := func() []any {
		called = true
		return []any{"expensive", "computation"}
	}

	t.Run("DebugFunc skips execution when debug disabled", func(t *testing.T) {
		called = false
		buf.Reset()

		DebugFunc("debug message", expensiveFunc)

		if called {
			t.Error("Expensive function should not be called when debug is disabled")
		}
		if buf.String() != "" {
			t.Error("Debug message should not be logged when debug is disabled")
		}
	})

	t.Run("InfoFunc executes when info enabled", func(t *testing.T) {
		called = false
		buf.Reset()

		InfoFunc("info message", expensiveFunc)

		if !called {
			t.Error("Expensive function should be called when info is enabled")
		}
		output := buf.String()
		if !strings.Contains(output, "info message") {
			t.Errorf("Should contain info message, got: %s", output)
		}
		if !strings.Contains(output, "expensive=computation") {
			t.Errorf("Should contain expensive computation result, got: %s", output)
		}
	})

	t.Run("WarnFunc executes when warn enabled", func(t *testing.T) {
		called = false
		buf.Reset()

		WarnFunc("warn message", expensiveFunc)

		if !called {
			t.Error("Expensive function should be called when warn is enabled")
		}
		output := buf.String()
		if !strings.Contains(output, "warn message") {
			t.Errorf("Should contain warn message, got: %s", output)
		}
	})

	t.Run("ErrorFunc executes when error enabled", func(t *testing.T) {
		called = false
		buf.Reset()

		ErrorFunc("error message", expensiveFunc)

		if !called {
			t.Error("Expensive function should be called when error is enabled")
		}
		output := buf.String()
		if !strings.Contains(output, "error message") {
			t.Errorf("Should contain error message, got: %s", output)
		}
	})
}

func TestContextConfig(t *testing.T) {
	config := ContextConfig{
		RequestIDKey: "req_id",
		UserIDKey:    "uid",
		ServiceKey:   "svc",
	}

	if config.RequestIDKey != "req_id" {
		t.Errorf("ContextConfig.RequestIDKey = %q, want %q", config.RequestIDKey, "req_id")
	}
	if config.UserIDKey != "uid" {
		t.Errorf("ContextConfig.UserIDKey = %q, want %q", config.UserIDKey, "uid")
	}
	if config.ServiceKey != "svc" {
		t.Errorf("ContextConfig.ServiceKey = %q, want %q", config.ServiceKey, "svc")
	}
}
