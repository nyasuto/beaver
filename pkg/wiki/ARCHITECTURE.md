# WikiPublisher Architecture Design

## Overview

This document describes the WikiPublisher interface design and architecture for Beaver's Git clone-based GitHub Wiki publishing system, implemented as the solution to Issue #49's research findings.

## Background

GitHub Wiki REST API limitations (404 errors, non-existent endpoints) necessitated a Git clone-based approach for reliable Wiki management. This architecture provides a flexible, testable, and maintainable foundation for Wiki publishing operations.

## Architecture Components

### 1. WikiPublisher Interface

The core abstraction that defines all Wiki publishing operations:

```go
type WikiPublisher interface {
    // Repository Management
    Initialize(ctx context.Context) error
    Clone(ctx context.Context) error
    Cleanup() error

    // Page Operations
    CreatePage(ctx context.Context, page *WikiPage) error
    UpdatePage(ctx context.Context, page *WikiPage) error
    DeletePage(ctx context.Context, pageName string) error
    PageExists(ctx context.Context, pageName string) (bool, error)

    // Batch Operations
    PublishPages(ctx context.Context, pages []*WikiPage) error
    GenerateAndPublishWiki(ctx context.Context, issues []models.Issue, projectName string) error

    // Repository Operations
    Commit(ctx context.Context, message string) error
    Push(ctx context.Context) error
    Pull(ctx context.Context) error

    // Status and Information
    GetStatus(ctx context.Context) (*PublisherStatus, error)
    ListPages(ctx context.Context) ([]*WikiPageInfo, error)
}
```

#### Design Principles

1. **Context-Aware**: All operations accept `context.Context` for cancellation and timeouts
2. **Error Handling**: Structured error types with user-friendly messages and suggestions
3. **Batch Operations**: Efficient handling of multiple pages
4. **Status Transparency**: Detailed status information for monitoring and debugging
5. **Resource Management**: Explicit cleanup and lifecycle management

### 2. Configuration System

#### PublisherConfig

Centralized configuration with validation and sensible defaults:

```go
type PublisherConfig struct {
    // Repository Configuration
    Owner       string
    Repository  string
    Token       string
    
    // Git Configuration
    WorkingDir  string
    BranchName  string
    AuthorName  string
    AuthorEmail string
    
    // Performance Configuration
    UseShallowClone bool
    CloneDepth      int
    Timeout         time.Duration
    RetryAttempts   int
    RetryDelay      time.Duration
    
    // Feature Flags
    EnableConflictResolution bool
    EnableBatchOperations    bool
    EnablePerformanceLogging bool
}
```

#### Features

- **Validation**: Comprehensive validation with specific error messages
- **URL Generation**: Automatic repository URL construction
- **Authentication**: Secure token-based authentication URL generation
- **Defaults**: Production-ready default values

### 3. Error Handling System

#### Structured Error Types

```go
type ErrorType int

const (
    ErrorTypeNetwork ErrorType = iota
    ErrorTypeAuthentication
    ErrorTypePermission
    ErrorTypeRepository
    ErrorTypeGitOperation
    ErrorTypeFileSystem
    ErrorTypeConfiguration
    ErrorTypeConflict
    ErrorTypeValidation
)
```

#### WikiError Structure

```go
type WikiError struct {
    Type        ErrorType
    Operation   string
    Cause       error
    UserMessage string
    RetryAfter  time.Duration
    Suggestions []string
    Context     map[string]interface{}
}
```

#### Error Handling Features

- **Categorization**: Clear error type classification
- **User-Friendly Messages**: Japanese language user messages
- **Actionable Suggestions**: Specific steps to resolve issues
- **Retry Logic**: Guidance on retryable errors with backoff
- **Context Information**: Rich error context for debugging

### 4. Git Client Abstraction

#### GitClient Interface

Abstraction layer for Git operations to support testing and different backends:

```go
type GitClient interface {
    Clone(ctx context.Context, url, dir string, options *CloneOptions) error
    Pull(ctx context.Context, dir string) error
    Push(ctx context.Context, dir string, options *PushOptions) error
    Add(ctx context.Context, dir string, files []string) error
    Commit(ctx context.Context, dir string, message string, options *CommitOptions) error
    Status(ctx context.Context, dir string) (*GitStatus, error)
    // ... more operations
}
```

#### Benefits

- **Testability**: Mock implementations for unit testing
- **Flexibility**: Support for different Git backends (command-line, libgit2, etc.)
- **Configuration**: Rich options for Git operations
- **Status Monitoring**: Detailed repository status information

### 5. Status and Monitoring

#### PublisherStatus

Comprehensive status information for monitoring and debugging:

```go
type PublisherStatus struct {
    IsInitialized   bool
    LastUpdate      time.Time
    TotalPages      int
    PendingChanges  int
    RepositoryURL   string
    WorkingDir      string
    LastCommitSHA   string
    BranchName      string
    HasUncommitted  bool
    LastError       error
}
```

#### Features

- **Initialization State**: Clear indication of publisher readiness
- **Change Tracking**: Monitoring of pending and committed changes
- **Repository Information**: Complete repository state visibility
- **Error Tracking**: Last error for debugging

## Implementation Strategy

### Phase 1: Interface and Error System ✅

- [x] WikiPublisher interface definition
- [x] Error handling system implementation
- [x] Configuration system with validation
- [x] Git client interface abstraction
- [x] Comprehensive unit tests
- [x] Architecture documentation

### Phase 2: Git Implementation (Issue #51)

- [ ] GitHubWikiPublisher concrete implementation
- [ ] Command-line Git client implementation
- [ ] Authentication and security handling
- [ ] Repository lifecycle management

### Phase 3: Advanced Features (Issues #52-#57)

- [ ] Conflict resolution system
- [ ] Performance optimizations
- [ ] File management and naming conventions
- [ ] Integration testing
- [ ] Error recovery mechanisms

## Design Benefits

### 1. Modularity

- Clear separation of concerns
- Pluggable implementations
- Independent testing of components

### 2. Testability

- Mock implementations provided
- Interface-based design enables easy testing
- Comprehensive test coverage

### 3. Error Handling

- Structured error types with context
- User-friendly Japanese error messages
- Actionable suggestions for problem resolution

### 4. Performance

- Batch operations for efficiency
- Shallow clone support
- Configurable timeouts and retries

### 5. Maintainability

- Clear interface contracts
- Comprehensive documentation
- Type-safe configuration

### 6. Extensibility

- Interface-based design supports multiple implementations
- Feature flags for gradual rollout
- Plugin architecture potential

## Usage Examples

### Basic Usage

```go
config := NewPublisherConfig("owner", "repo", "token")
publisher := NewGitHubWikiPublisher(config)

ctx := context.Background()
err := publisher.Initialize(ctx)
if err != nil {
    // Handle error with suggestions
    if wikiErr, ok := err.(*WikiError); ok {
        log.Printf("Error: %s", wikiErr.UserFriendlyMessage())
        for _, suggestion := range wikiErr.GetSuggestions() {
            log.Printf("Suggestion: %s", suggestion)
        }
    }
}

page := &WikiPage{
    Title:    "Documentation",
    Filename: "Documentation.md",
    Content:  "# Project Documentation\n\nThis is the main documentation.",
}

err = publisher.CreatePage(ctx, page)
// ... handle errors and continue
```

### Batch Operations

```go
pages := []*WikiPage{
    {Title: "Home", Filename: "Home.md", Content: "# Welcome"},
    {Title: "Guide", Filename: "Guide.md", Content: "# Usage Guide"},
}

err := publisher.PublishPages(ctx, pages)
// ... handle errors
```

### Status Monitoring

```go
status, err := publisher.GetStatus(ctx)
if err == nil {
    log.Printf("Repository: %s", status.RepositoryURL)
    log.Printf("Pages: %d", status.TotalPages)
    log.Printf("Uncommitted: %v", status.HasUncommitted)
}
```

## Security Considerations

### 1. Token Management

- Secure token storage in configuration
- No token logging or exposure
- Authentication URL generation with proper escaping

### 2. Git Operations

- Working directory isolation
- Cleanup of temporary files
- Secure authentication with Personal Access Tokens

### 3. Error Information

- No sensitive information in error messages
- Safe error context without credentials
- User-friendly messages without internal details

## Performance Considerations

### 1. Git Operations

- Shallow clone by default (depth=1)
- Single branch clone to reduce data transfer
- Configurable timeouts to prevent hanging

### 2. Batch Processing

- Efficient batch operations for multiple pages
- Minimal Git operations per batch
- Configurable batch sizes

### 3. Resource Management

- Automatic cleanup of working directories
- Memory-conscious file operations
- Configurable performance logging

## Future Enhancements

### 1. Multiple Platform Support

- Notion Wiki publisher implementation
- Confluence publisher implementation
- Generic Git-based Wiki support

### 2. Advanced Git Features

- Branch-based publishing
- Tag-based versioning
- Merge request workflows

### 3. Performance Optimizations

- Parallel page processing
- Incremental updates
- Caching mechanisms

### 4. Monitoring and Observability

- Metrics collection
- Performance dashboards
- Health checks

## Conclusion

This WikiPublisher architecture provides a robust, flexible, and maintainable foundation for Git-based Wiki publishing. The interface-driven design enables testing, extensibility, and clear error handling while solving the fundamental limitations of GitHub's Wiki REST API.

The implementation successfully addresses the requirements identified in Issue #49 and provides a solid base for the subsequent implementation phases outlined in Issues #51-#60.