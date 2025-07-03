package git

import (
	"testing"
	"time"
)

func BenchmarkInMemoryWorkspaceCreation(b *testing.B) {
	client := NewInMemoryGitClient()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		repo, fs, err := client.CreateWorkspace()
		if err != nil {
			b.Fatalf("Failed to create in-memory workspace: %v", err)
		}
		_ = repo
		_ = fs
	}
}

func BenchmarkInMemoryGitClientCreation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		client := NewInMemoryGitClient()
		_ = client
	}
}

func BenchmarkDefaultGitClientCreation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		client, err := NewDefaultGitClient()
		if err != nil {
			b.Fatalf("Failed to create default git client: %v", err)
		}
		_ = client
	}
}

func TestInMemoryGitClientPerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	// Test InMemoryGitClient performance
	inMemoryClient := NewInMemoryGitClient()

	start := time.Now()
	workspaceCount := 100
	for i := 0; i < workspaceCount; i++ {
		repo, fs, err := inMemoryClient.CreateWorkspace()
		if err != nil {
			t.Fatalf("Failed to create in-memory workspace: %v", err)
		}
		_ = repo
		_ = fs
	}
	inMemoryDuration := time.Since(start)

	t.Logf("InMemoryGitClient: Created %d in-memory workspaces in %v (avg: %v per workspace)",
		workspaceCount, inMemoryDuration, inMemoryDuration/time.Duration(workspaceCount))

	// Performance validation
	avgTimePerWorkspace := inMemoryDuration / time.Duration(workspaceCount)
	if avgTimePerWorkspace > 10*time.Millisecond {
		t.Logf("Warning: In-memory workspace creation took %v per workspace, might be slower than expected", avgTimePerWorkspace)
	} else {
		t.Logf("Good performance: In-memory workspace creation took %v per workspace", avgTimePerWorkspace)
	}

	// Test adapter performance
	defaultClient, err := NewDefaultGitClient()
	if err != nil {
		t.Fatalf("Failed to create default git client: %v", err)
	}

	start = time.Now()
	for i := 0; i < workspaceCount; i++ {
		repo, fs, err := defaultClient.CreateInMemoryWorkspace()
		if err != nil {
			t.Fatalf("Failed to create workspace via adapter: %v", err)
		}
		_ = repo
		_ = fs
	}
	adapterDuration := time.Since(start)

	t.Logf("DefaultGitClient (adapter): Created %d workspaces in %v (avg: %v per workspace)",
		workspaceCount, adapterDuration, adapterDuration/time.Duration(workspaceCount))

	// Compare adapter vs direct performance
	if adapterDuration < inMemoryDuration*2 {
		t.Logf("✅ Adapter performance is reasonable (less than 2x overhead)")
	} else {
		t.Logf("⚠️ Adapter has significant overhead: %v vs %v direct", adapterDuration, inMemoryDuration)
	}
}
