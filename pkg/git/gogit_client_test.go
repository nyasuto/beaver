package git

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)





func TestFactoryNewGitClient(t *testing.T) {
	tests := []struct {
		name         string
		clientType   GitClientType
		shouldError  bool
		expectedType interface{}
	}{
		{
			name:         "InMemory client",
			clientType:   ClientTypeInMemory,
			shouldError:  false,
			expectedType: (*InMemoryGitClientAdapter)(nil),
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

	// Default should be InMemoryGitClientAdapter
	_, ok := client.(*InMemoryGitClientAdapter)
	assert.True(t, ok)
}

func TestNewDefaultGitClientWithAuth(t *testing.T) {
	token := "test-token"
	client, err := NewDefaultGitClientWithAuth(token)
	require.NoError(t, err)
	assert.NotNil(t, client)

	// Default should be InMemoryGitClientAdapter with auth
	_, ok := client.(*InMemoryGitClientAdapter)
	assert.True(t, ok)
}
