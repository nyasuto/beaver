package logger

import (
	"bytes"
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
