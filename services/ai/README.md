# 🐍 Beaver AI Services

AI processing services for Beaver knowledge dam construction tool. Provides real OpenAI/Anthropic integration for GitHub Issue summarization and content analysis.

## 🚀 Features

- **Real AI Summarization**: Live OpenAI/Anthropic integration for GitHub Issues
- **Multi-Provider Support**: OpenAI GPT-4 and Anthropic Claude API integration
- **Structured Analysis**: Category detection, complexity assessment, key points extraction
- **Fallback System**: Graceful degradation when AI services fail
- **RESTful API**: FastAPI-based REST API with automatic documentation
- **Health Monitoring**: Comprehensive health check endpoints
- **Docker Support**: Production-ready containerization with uv
- **Async Processing**: High-performance async request handling

## 📋 Requirements

- Python 3.9+
- At least one AI API key (OpenAI or Anthropic)
- uv (recommended) or pip

## 🏗️ Installation

### Using uv (Recommended)

```bash
cd services/ai
uv sync
uv run python -m app.main
```

### Using pip

```bash
cd services/ai
pip install -e .
```

### Using Docker

```bash
cd services/ai
docker-compose up --build
```

## ⚙️ Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your AI API keys in `.env`:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
```

3. Adjust other settings as needed (see `.env.example` for all options)

## 🚀 Running the Service

### Development Mode

```bash
# Using uv (recommended)
uv run python -m app.main

# Using uvicorn directly with uv
uv run uvicorn app.main:app --reload --port 8000

# Using Python directly
python -m app.main
```

### Production Mode

```bash
# Using Docker Compose
docker-compose -f docker-compose.yml --profile production up

# Using uv
ENVIRONMENT=production uv run python -m app.main
```

## 📡 API Endpoints

### Health Check
- `GET /api/v1/health/` - Full health status
- `GET /api/v1/health/ready` - Readiness check
- `GET /api/v1/health/live` - Liveness check

### AI Processing
- `POST /api/v1/summarize/` - Summarize single issue
- `POST /api/v1/summarize/batch` - Batch summarize multiple issues
- `POST /api/v1/classify/` - Classify content
- `GET /api/v1/classify/categories` - Get available categories

### Documentation
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation (ReDoc)

## 📝 API Usage Examples

### Summarize an Issue

```bash
curl -X POST "http://localhost:8000/api/v1/summarize/" \
  -H "Content-Type: application/json" \
  -d '{
    "issue": {
      "id": 1,
      "number": 42,
      "title": "Add new feature",
      "body": "We need to implement a new feature for...",
      "state": "open",
      "labels": ["feature", "enhancement"],
      "comments": [],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "user": "developer"
    },
    "provider": "openai",
    "language": "ja"
  }'
```

### Classify Content

```bash
curl -X POST "http://localhost:8000/api/v1/classify/" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This is a bug report about a critical error in the authentication system",
    "provider": "openai"
  }'
```

## 🧪 Testing

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=app --cov-report=html

# Run specific test file
uv run pytest tests/test_health.py -v

# Run with development dependencies
uv sync --group dev
uv run pytest
```

## 🐳 Docker Usage

### Development

```bash
# Build and run development container
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f beaver-ai
```

### Production

```bash
# Run production container
docker-compose --profile production up -d

# Scale service
docker-compose --profile production up --scale beaver-ai-prod=3
```

## 📊 Monitoring

### Health Checks

The service provides multiple health check endpoints:

- **Health**: `/api/v1/health/` - Complete system status
- **Ready**: `/api/v1/health/ready` - Service readiness
- **Live**: `/api/v1/health/live` - Service liveness

### Logging

Structured logging with configurable levels:
- `DEBUG`: Detailed debugging information
- `INFO`: General operational messages
- `WARNING`: Warning conditions
- `ERROR`: Error conditions
- `CRITICAL`: Critical error conditions

## 🔧 Development

### Code Quality

```bash
# Format code
uv run black app/ tests/
uv run isort app/ tests/

# Lint code
uv run flake8 app/ tests/

# Type checking
uv run mypy app/

# All quality checks
uv run black app/ && uv run isort app/ && uv run flake8 app/ && uv run mypy app/
```

### Adding New Features

1. Create feature modules in `app/`
2. Add API routes in `app/routers/`
3. Define schemas in `app/models/schemas.py`
4. Add tests in `tests/`
5. Update documentation

## 🔍 Architecture

```
services/ai/
├── app/
│   ├── core/           # Core configuration and AI clients
│   │   ├── ai_client.py    # OpenAI/Anthropic integration
│   │   ├── config.py       # Settings management
│   │   └── logging.py      # Structured logging
│   ├── models/         # Pydantic schemas
│   ├── routers/        # API route handlers
│   └── main.py         # FastAPI application
├── tests/              # Test files
├── Dockerfile          # Multi-stage Docker build (uv-based)
├── docker-compose.yml  # Container orchestration
├── pyproject.toml      # Modern PEP 621 configuration
└── uv.lock            # Locked dependencies for reproducible builds
```

## 🤝 Integration with Go Services

The AI services are designed to integrate seamlessly with Beaver's Go backend:

1. **REST API**: Standard HTTP JSON API for easy integration
2. **Health Checks**: Compatible with Go service monitoring
3. **Error Handling**: Structured error responses
4. **Configuration**: Environment variable compatibility

Example Go integration:
```go
// Call AI summarization service
resp, err := http.Post("http://localhost:8000/api/v1/summarize/", 
    "application/json", bytes.NewBuffer(jsonData))
```

## 📄 License

MIT License - Part of the Beaver project.

## 🚨 Important Notes

- **Live AI Integration**: Real OpenAI/Anthropic API integration implemented
- **Fallback System**: Graceful degradation when AI services fail
- **Security**: API keys required for AI providers
- **Performance**: Production deployment requires proper resource allocation
- **Dependency Management**: Uses modern uv for fast, reliable builds

## 🔄 Development Workflow

```bash
# Setup development environment
uv sync --group dev

# Run development server
uv run uvicorn app.main:app --reload

# Run tests
uv run pytest

# Format and lint
uv run black app/ && uv run flake8 app/

# Docker development
docker-compose up --build
```

---

**Powering Beaver's AI knowledge extraction with real intelligence! 🦫🧠✨**