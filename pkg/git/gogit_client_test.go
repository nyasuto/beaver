package git

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewGoGitClient(t *testing.T) {
	client := NewGoGitClient()
	assert.NotNil(t, client)

	goGitClient, ok := client.(*GoGitClient)
	assert.True(t, ok)
	assert.Equal(t, 30*time.Second, goGitClient.timeout)
}

func TestNewGoGitClientWithAuth(t *testing.T) {
	token := "test-token"
	client := NewGoGitClientWithAuth(token)
	assert.NotNil(t, client)

	goGitClient, ok := client.(*GoGitClient)
	assert.True(t, ok)
	assert.NotNil(t, goGitClient.auth)
}

func TestCreateInMemoryWorkspace(t *testing.T) {
	client := NewGoGitClient()

	repo, fs, err := client.CreateInMemoryWorkspace()
	require.NoError(t, err)
	assert.NotNil(t, repo)
	assert.NotNil(t, fs)
}

func TestGoGitClientInterfaceCompliance(t *testing.T) {
	// Ensure GoGitClient implements GitClient interface
	var _ GitClient = (*GoGitClient)(nil)
}

func TestFactoryNewGitClient(t *testing.T) {
	tests := []struct {
		name         string
		clientType   GitClientType
		shouldError  bool
		expectedType interface{}
	}{
		{
			name:         "GoGit client",
			clientType:   ClientTypeGoGit,
			shouldError:  false,
			expectedType: (*GoGitClient)(nil),
		},
		{
			name:         "Cmd client",
			clientType:   ClientTypeCmd,
			shouldError:  false,
			expectedType: (*CmdGitClient)(nil),
		},
		{
			name:        "Invalid client type",
			clientType:  "invalid",
			shouldError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, err := NewGitClient(tt.clientType)

			if tt.shouldError {
				assert.Error(t, err)
				assert.Nil(t, client)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, client)
				assert.IsType(t, tt.expectedType, client)
			}
		})
	}
}

func TestNewDefaultGitClient(t *testing.T) {
	client, err := NewDefaultGitClient()
	require.NoError(t, err)
	assert.NotNil(t, client)

	// Default should be GoGitClient
	_, ok := client.(*GoGitClient)
	assert.True(t, ok)
}

func TestNewDefaultGitClientWithAuth(t *testing.T) {
	token := "test-token"
	client, err := NewDefaultGitClientWithAuth(token)
	require.NoError(t, err)
	assert.NotNil(t, client)

	// Default should be GoGitClient with auth
	goGitClient, ok := client.(*GoGitClient)
	assert.True(t, ok)
	assert.NotNil(t, goGitClient.auth)
}
