package git

import (
	"testing"
	"time"
)

func BenchmarkCreateInMemoryWorkspace(b *testing.B) {
	client := NewGoGitClient()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		repo, fs, err := client.CreateInMemoryWorkspace()
		if err != nil {
			b.Fatalf("Failed to create in-memory workspace: %v", err)
		}
		_ = repo
		_ = fs
	}
}

func BenchmarkCmdGitClientCreation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		client, err := NewCmdGitClient()
		if err != nil {
			b.Fatalf("Failed to create cmd git client: %v", err)
		}
		_ = client
	}
}

func BenchmarkGoGitClientCreation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		client := NewGoGitClient()
		_ = client
	}
}

func TestPerformanceComparison(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	// Test in-memory workspace creation performance
	goGitClient := NewGoGitClient()

	// Benchmark in-memory workspace creation
	start := time.Now()
	for i := 0; i < 100; i++ {
		repo, fs, err := goGitClient.CreateInMemoryWorkspace()
		if err != nil {
			t.Fatalf("Failed to create in-memory workspace: %v", err)
		}
		_ = repo
		_ = fs
	}
	goGitDuration := time.Since(start)

	t.Logf("GoGitClient: Created 100 in-memory workspaces in %v (avg: %v per workspace)",
		goGitDuration, goGitDuration/100)

	// Basic performance validation
	avgTimePerWorkspace := goGitDuration / 100
	if avgTimePerWorkspace > 10*time.Millisecond {
		t.Logf("Warning: In-memory workspace creation took %v per workspace, might be slower than expected", avgTimePerWorkspace)
	} else {
		t.Logf("Good performance: In-memory workspace creation took %v per workspace", avgTimePerWorkspace)
	}
}
