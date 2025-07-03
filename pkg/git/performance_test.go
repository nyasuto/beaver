package git

import (
	"testing"
	"time"
)

func BenchmarkCreateGoGitInMemoryWorkspace(b *testing.B) {
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

func BenchmarkCreatePureInMemoryWorkspace(b *testing.B) {
	client := NewInMemoryGitClient()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		repo, fs, err := client.CreateWorkspace()
		if err != nil {
			b.Fatalf("Failed to create pure in-memory workspace: %v", err)
		}
		_ = repo
		_ = fs
	}
}

func TestPerformanceComparison(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	// Test existing GoGitClient in-memory workspace creation performance
	goGitClient := NewGoGitClient()

	// Benchmark existing GoGitClient in-memory workspace creation
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

	// Test new pure InMemoryGitClient performance
	inMemoryClient := NewInMemoryGitClient()

	start = time.Now()
	for i := 0; i < 100; i++ {
		repo, fs, err := inMemoryClient.CreateWorkspace()
		if err != nil {
			t.Fatalf("Failed to create pure in-memory workspace: %v", err)
		}
		_ = repo
		_ = fs
	}
	inMemoryDuration := time.Since(start)

	t.Logf("InMemoryGitClient: Created 100 pure in-memory workspaces in %v (avg: %v per workspace)",
		inMemoryDuration, inMemoryDuration/100)

	// Performance comparison
	if inMemoryDuration < goGitDuration {
		improvement := float64(goGitDuration) / float64(inMemoryDuration)
		t.Logf("✅ Pure in-memory implementation is %.2fx faster than GoGitClient", improvement)
	} else {
		t.Logf("⚠️ Pure in-memory implementation took %v vs GoGitClient %v", inMemoryDuration, goGitDuration)
	}

	// Basic performance validation
	avgTimePerWorkspace := inMemoryDuration / 100
	if avgTimePerWorkspace > 10*time.Millisecond {
		t.Logf("Warning: Pure in-memory workspace creation took %v per workspace, might be slower than expected", avgTimePerWorkspace)
	} else {
		t.Logf("Good performance: Pure in-memory workspace creation took %v per workspace", avgTimePerWorkspace)
	}
}
