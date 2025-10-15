# Synapse Backend API

FastAPI-based backend service for Synapse intelligent note-taking app.

## Setup

### Prerequisites
- Python 3.12+
- PostgreSQL 14+ with pgvector extension
- Redis 7+

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your configuration
```

## Development

### Run Development Server

```bash
# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at:
- **API**: http://localhost:8000
- **Docs (Swagger)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_api/test_main.py

# Run with verbose output
pytest -v
```

### Code Quality

```bash
# Format code with black
black app tests

# Lint with ruff
ruff check app tests

# Type check with mypy
mypy app
```

## Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Show migration history
alembic history
```

## Docker Development

```bash
# Start all services (API, PostgreSQL, Redis)
docker-compose up

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build
```

## Project Structure

```
backend/
├── app/
│   ├── api/          # API route handlers
│   ├── core/         # Security, dependencies
│   ├── models/       # SQLAlchemy models
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Business logic
│   ├── config.py     # Configuration management
│   └── main.py       # FastAPI app entry point
├── alembic/          # Database migrations
├── tests/            # Test suite
│   ├── test_api/     # API endpoint tests
│   └── test_services/# Service logic tests
├── requirements.txt  # Python dependencies
├── pytest.ini        # Pytest configuration
└── pyproject.toml    # Tool configurations
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens (change in production!)
- `EMBEDDING_MODEL`: Sentence transformer model name
- `CORS_ORIGINS`: Allowed origins for CORS

## API Documentation

Once the server is running, visit:
- http://localhost:8000/docs - Interactive API documentation (Swagger UI)
- http://localhost:8000/redoc - Alternative API documentation (ReDoc)

## Performance Targets

- AI recommendation API: <500ms
- Embedding generation: <1s per note
- Sync endpoint: <10s for 100 notes
