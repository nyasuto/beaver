# 🐍 Beaver AI Services

AI processing services for Beaver knowledge dam construction tool. Provides LangChain + OpenAI/Anthropic integration for content analysis, summarization, and classification.

## 🚀 Features

- **AI-Powered Summarization**: Convert GitHub Issues into concise summaries
- **Content Classification**: Automatically categorize content into predefined categories
- **Multi-Provider Support**: OpenAI and Anthropic API integration
- **RESTful API**: FastAPI-based REST API with automatic documentation
- **Health Monitoring**: Comprehensive health check endpoints
- **Docker Support**: Production-ready containerization
- **Async Processing**: High-performance async request handling

## 📋 Requirements

- Python 3.9+
- At least one AI API key (OpenAI or Anthropic)
- Poetry (recommended) or pip

## 🏗️ Installation

### Using Poetry (Recommended)

```bash
cd services/ai
poetry install
poetry shell
```

### Using pip

```bash
cd services/ai
pip install -r requirements.txt
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
# Using Poetry
poetry run python -m app.main

# Using Python directly
python -m app.main

# Using uvicorn directly
uvicorn app.main:app --reload --port 8000
```

### Production Mode

```bash
# Using Docker Compose
docker-compose -f docker-compose.yml --profile production up

# Using Poetry
ENVIRONMENT=production poetry run python -m app.main
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
poetry run pytest

# Run with coverage
poetry run pytest --cov=app --cov-report=html

# Run specific test file
poetry run pytest tests/test_health.py -v
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
poetry run black app/ tests/
poetry run isort app/ tests/

# Lint code
poetry run flake8 app/ tests/

# Type checking
poetry run mypy app/

# All quality checks
poetry run black app/ && poetry run isort app/ && poetry run flake8 app/ && poetry run mypy app/
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
│   ├── core/           # Core configuration and utilities
│   ├── models/         # Pydantic schemas
│   ├── routers/        # API route handlers
│   └── main.py         # FastAPI application
├── tests/              # Test files
├── Dockerfile          # Multi-stage Docker build
├── docker-compose.yml  # Container orchestration
├── pyproject.toml      # Poetry configuration
└── requirements.txt    # Pip-compatible dependencies
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

- **Mock Implementation**: Current endpoints return mock responses for testing
- **Phase 1 Implementation**: Real AI integration will be implemented in Phase 1 MVP
- **Security**: API keys are required but validation is lenient for development
- **Performance**: Production deployment requires proper resource allocation

---

**Ready to power Beaver's AI knowledge extraction! 🦫🧠**