# Synapse

> Offline-first intelligent note-taking mobile app with AI-powered recommendations and weekly insights

[![Mobile Tests](https://github.com/yourusername/synapse/workflows/Mobile%20Tests/badge.svg)](https://github.com/yourusername/synapse/actions)
[![Backend Tests](https://github.com/yourusername/synapse/workflows/Backend%20Tests/badge.svg)](https://github.com/yourusername/synapse/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

**Synapse** is an offline-first intelligent note-taking mobile application built with React Native and FastAPI. It provides seamless offline functionality with AI-powered recommendations and weekly insights to help users connect their thoughts and reflect on their notes.

**Core Principle**: Local SQLite is the single source of truth. The server provides analysis, recommendations, backup, and sync coordination only.

## Key Features

- **100% Offline Operation**: All core features work without internet connection using local SQLite database
- **Smart Bidirectional Sync**: Push/pull synchronization with Last-Write-Wins (LWW) conflict resolution
- **AI-Powered Recommendations**: Semantic similarity-based note recommendations using multilingual embeddings
- **Lightning-Fast Search**: FTS5 full-text search with <150ms P95 latency for 10,000 notes
- **Weekly Insights**: KMeans clustering and keyword analysis for weekly reflections
- **Korean Language Support**: Advanced Korean morphological analysis with Kiwipiepy

## Architecture

### Tech Stack

#### Mobile (React Native + Expo)
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript (strict mode enabled)
- **Database**: SQLite with expo-sqlite, FTS5 for search
- **State Management**: Zustand for global state
- **Data Fetching**: TanStack React Query (v5)
- **Navigation**: React Navigation v6
- **Authentication**: react-native-keychain for secure token storage
- **Minimum Android**: SDK 24 (Android 7.0)

#### Backend (FastAPI + Python)
- **Framework**: FastAPI with async support
- **Language**: Python 3.12+
- **Database**: PostgreSQL with pgvector extension
- **ORM**: SQLAlchemy 2.0
- **AI/ML**:
  - Sentence Transformers (multilingual-e5-large) for 1024-dim embeddings
  - Kiwipiepy for Korean morphological analysis
  - scikit-learn for KMeans clustering
- **Caching**: Redis with hiredis
- **Logging**: Structured logging with structlog

### Project Structure

```
synapse/
├── mobile/                      # React Native mobile app
│   ├── src/
│   │   ├── services/
│   │   │   ├── database/        # SQLite operations, schema, FTS5
│   │   │   ├── sync/            # Push/pull sync, conflict resolution
│   │   │   └── api/             # HTTP client, API endpoints
│   │   ├── screens/             # UI screens (Home, Search, Reflection, Settings)
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # React Query hooks
│   │   ├── store/               # Zustand stores (notes, auth, sync)
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Utility functions
│   │   ├── constants/           # App constants
│   │   └── navigation/          # Navigation configuration
│   ├── app.json                 # Expo configuration
│   ├── package.json             # Dependencies and scripts
│   └── tsconfig.json            # TypeScript configuration
│
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── api/                 # API route handlers
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── sync.py          # Sync endpoints (push/pull)
│   │   │   ├── recommend.py     # Recommendation endpoints
│   │   │   └── reports.py       # Weekly report endpoints
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   │   ├── embedding.py     # Text embedding generation
│   │   │   ├── keyword.py       # Korean keyword extraction
│   │   │   ├── recommendation.py # Similarity scoring
│   │   │   └── report.py        # Weekly insight generation
│   │   ├── core/                # Security, dependencies, middleware
│   │   ├── config.py            # Application settings
│   │   ├── database.py          # Database connection
│   │   └── main.py              # FastAPI app entry point
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # pytest tests
│   ├── Dockerfile               # Multi-stage Docker build
│   ├── docker-compose.yml       # Development environment
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Environment variables template
│
├── .github/workflows/           # CI/CD pipelines
│   ├── test-mobile.yml          # Mobile tests (Node.js 18.x/20.x)
│   ├── test-backend.yml         # Backend tests (Python 3.12)
│   └── docker-build.yml         # Docker build + security scan
│
└── tasks/                       # Project documentation
    ├── tasks-0001-prd-synapse-mobile-mvp.md  # Task tracking
    └── Synapse_Mobile_MVP_v3.1_Final.md      # Product requirements
```

### Offline-First Architecture

**Data Flow**:
1. **Local SQLite**: Single source of truth for all note data
2. **Change Log**: Tracks all local modifications for sync
3. **Sync State**: Stores checkpoint for incremental sync
4. **Bidirectional Sync**: Push local changes, pull remote changes
5. **Conflict Resolution**: Last-Write-Wins (LWW) with timestamp comparison

**Sync Protocol**:

**Push Sync**:
1. Client queries `change_log` for unsynced entries (max 100 or 1MB)
2. POST to `/sync/push` with batch of changes
3. Server processes changes, generates embeddings/keywords
4. Server returns success/failure per item + new checkpoint
5. Client marks successful items as synced

**Pull Sync**:
1. Client sends last checkpoint to POST `/sync/pull`
2. Server queries changes since checkpoint
3. Server returns delta (upsert/delete operations)
4. Client applies changes with LWW conflict resolution
5. Client saves new checkpoint

**Conflict Resolution (LWW)**:
1. Compare `updated_at` timestamps
2. If equal, compare `server_timestamp`
3. If still equal, use `entity_id` lexicographic order

## Prerequisites

### Development Environment

- **Node.js**: 18.x or 20.x (LTS recommended)
- **Python**: 3.12 or higher
- **Docker**: Latest stable version with Docker Compose
- **Git**: For version control

### Mobile Development (Additional)

- **Android**: Android Studio with Android SDK 24+ (for Android development)
- **iOS**: macOS with Xcode 14+ (for iOS development)
- **Expo CLI**: Installed globally via npm

### Backend Development (Additional)

- **PostgreSQL**: 14+ with pgvector extension (or use Docker Compose)
- **Redis**: 7+ (or use Docker Compose)

## Getting Started

### Quick Start with Docker Compose (Recommended for Backend)

The fastest way to get the backend running with all dependencies:

```bash
# Clone the repository
git clone https://github.com/yourusername/synapse.git
cd synapse

# Start backend services (PostgreSQL, Redis, API)
cd backend
docker-compose up

# The API will be available at http://localhost:8000
# API documentation at http://localhost:8000/docs
```

### Mobile Development Setup

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on specific platform
npm run android        # Android emulator/device
npm run ios            # iOS simulator (macOS only)
npm run web            # Web browser

# Development tools
npm test               # Run Jest tests
npm run test:watch     # Watch mode for tests
npm run test:coverage  # Generate coverage report
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format with Prettier
npm run type-check     # TypeScript validation
```

### Backend Development Setup (Manual)

If you prefer not to use Docker Compose:

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Unix/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env and configure your settings

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload

# The API will be available at http://localhost:8000
```

### Backend Testing

```bash
cd backend

# Run all tests
pytest

# Run with coverage report
pytest --cov=app

# Run specific test directory
pytest backend/tests/test_api
pytest backend/tests/test_services

# Run with verbose output
pytest -v

# Run in watch mode (requires pytest-watch)
ptw
```

### Environment Configuration

#### Backend (.env)

Copy `.env.example` to `.env` and configure:

```bash
# Required settings
DATABASE_URL=postgresql://user:password@localhost:5432/synapse
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-secret-key-change-in-production

# Optional settings (have defaults)
ENVIRONMENT=development
DEBUG=true
EMBEDDING_MODEL=intfloat/multilingual-e5-large
EMBEDDING_DEVICE=cpu
```

**Important**: Change `JWT_SECRET_KEY` in production! Generate with:
```bash
openssl rand -hex 32
```

#### Mobile (.env)

Create a `.env` file in the `mobile/` directory:

```bash
API_BASE_URL=http://localhost:8000
```

For Android emulator, use `http://10.0.2.2:8000` instead of localhost.

## Development Workflow

### Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Mobile: Work in `mobile/src/`
   - Backend: Work in `backend/app/`

3. **Run Tests Frequently**
   ```bash
   # Mobile
   cd mobile && npm test

   # Backend
   cd backend && pytest
   ```

4. **Code Quality Checks**
   ```bash
   # Mobile
   npm run lint && npm run type-check

   # Backend
   ruff check . && mypy app/
   ```

5. **Commit Changes**
   Use conventional commits:
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git commit -m "refactor: improve code structure"
   git commit -m "test: add test coverage"
   git commit -m "docs: update documentation"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

### Testing Strategy

#### Mobile Tests
- **Location**: Co-located with code (`*.test.ts` or `*.test.tsx`)
- **Framework**: Jest + React Testing Library
- **Coverage Target**: >80% for service logic
- **Run**: `npm test` from `mobile/` directory

#### Backend Tests
- **Location**: `backend/tests/` directory hierarchy
- **Framework**: pytest + httpx
- **Coverage Target**: >80% services, >70% API endpoints
- **Run**: `pytest` from `backend/` directory

### Code Organization Standards

- **Naming Conventions**: Follow language standards (camelCase for JS/TS, snake_case for Python)
- **TypeScript**: Strict mode enabled, all types must be explicit
- **Path Aliases**: Use `@/` prefix for mobile imports (e.g., `@/services/database`)
- **File Organization**: Keep tests co-located with code in mobile, separate in backend

## API Documentation

Once the backend is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main API Endpoints

**Authentication**:
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get access/refresh tokens
- `POST /auth/refresh` - Refresh access token

**Sync**:
- `POST /sync/push` - Push local changes to server
- `POST /sync/pull` - Pull remote changes from server

**Recommendations**:
- `GET /recommendations/{note_id}` - Get recommended notes for a note

**Reports**:
- `GET /reports/weekly` - Get weekly insight report
- `GET /reports/weekly?start_date=2025-10-01&end_date=2025-10-07` - Get report for specific week

**Health**:
- `GET /` - Basic health check
- `GET /health` - Detailed health check with database/redis status

## Performance Targets

The application is designed to meet these performance targets:

| Metric | Target | Measurement |
|--------|--------|-------------|
| App Cold Start | <2s | Time to interactive |
| Note Save | <1s (P95) | Local write to confirmation |
| Search | <150ms (P95) | Query to results (10,000 notes) |
| Sync Completion | <10s | 100 notes bidirectional sync |
| AI Recommendation API | <500ms | API request to response |

## Data Model

### Note
- **Fields**: `id` (UUIDv7), `body` (text), `importance` (1-3), `source_url`, `image_path`, timestamps
- **Title**: No separate title field - first line (max 50 chars) displayed as title
- **Deletion**: Soft delete via `deleted_at` field

### Search
- **Engine**: FTS5 (Full-Text Search) with unicode61 tokenizer
- **Implementation**: Virtual table `notes_fts` with auto-sync triggers
- **Performance**: <150ms P95 for 10,000 notes

### Sync State
- **Change Log**: Tracks all local modifications for push sync
- **Sync State**: Stores checkpoint for incremental pull sync
- **Queue Limit**: 10,000 entries (app enters read-only mode if exceeded)

## CI/CD

### GitHub Actions Workflows

**Mobile Tests** (`.github/workflows/test-mobile.yml`):
- Runs on: Push to main/develop, Pull requests
- Node.js versions: 18.x and 20.x (matrix)
- Steps: Install dependencies → Type check → Lint → Test with coverage

**Backend Tests** (`.github/workflows/test-backend.yml`):
- Runs on: Push to main/develop, Pull requests
- Python version: 3.12
- Services: PostgreSQL 14 with pgvector, Redis 7
- Steps: Install dependencies → Lint (ruff) → Type check (mypy) → Test with coverage

**Docker Build** (`.github/workflows/docker-build.yml`):
- Runs on: Push to main
- Platforms: linux/amd64, linux/arm64
- Steps: Build multi-stage Docker image → Trivy security scan

## Project Status

**Current Phase**: M1 MVP Development (In Progress)

### Completed Phases
- [x] **Phase 1**: Project scaffolding and infrastructure
  - Backend project setup with FastAPI
  - Mobile project setup with Expo
  - CI/CD pipelines (GitHub Actions)
  - Docker development environment

- [x] **Phase 2-6**: Mobile database and offline features
  - SQLite schema and migrations
  - Note CRUD operations
  - FTS5 full-text search
  - Change log and sync state management
  - Bidirectional sync implementation
  - LWW conflict resolution

- [x] **Phase 7.0.1-7.0.2**: Testing infrastructure (Partial)
  - Utility functions and integration tests

### Remaining Work
- [ ] **Phase 7.0.3+**: Complete mobile test coverage
- [ ] **Phase 8**: Backend AI services
  - Text embedding service
  - Keyword extraction
  - Recommendation engine
  - Weekly report generation
- [ ] **Phase 9**: Mobile AI features integration
- [ ] **Phase 10**: UI/UX polish and optimization

See [tasks/tasks-0001-prd-synapse-mobile-mvp.md](tasks/tasks-0001-prd-synapse-mobile-mvp.md) for detailed task tracking.

## Documentation

- **[Product Requirements Document](tasks/Synapse_Mobile_MVP_v3.1_Final.md)**: Complete PRD with feature specifications
- **[Task List](tasks/tasks-0001-prd-synapse-mobile-mvp.md)**: Detailed implementation task tracking
- **[Architecture Guide](CLAUDE.md)**: Developer guidance for Claude Code
- **[Deployment Guide](DEPLOYMENT.md)**: Production deployment instructions

## Security

- **Authentication**: JWT tokens (Access: 1h, Refresh: 30d)
- **Token Storage**: react-native-keychain for secure mobile storage
- **Password Hashing**: bcrypt with salt
- **API Security**: CORS configuration, rate limiting (planned)
- **Container Security**: Non-root user, multi-stage builds, Trivy scanning

## Troubleshooting

### Mobile Development

**Problem**: Metro bundler won't start
```bash
# Clear cache and restart
cd mobile
rm -rf node_modules
npm install
npm start -- --reset-cache
```

**Problem**: Android emulator can't connect to API
```bash
# Use 10.0.2.2 instead of localhost in .env
API_BASE_URL=http://10.0.2.2:8000
```

**Problem**: iOS build fails
```bash
# Clear iOS build and pods
cd mobile/ios
rm -rf Pods Podfile.lock
pod install
```

### Backend Development

**Problem**: Database connection fails
```bash
# Check PostgreSQL is running
docker-compose ps

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

**Problem**: AI model download is slow
```bash
# Pre-download model
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-large')"
```

**Problem**: Tests fail with database errors
```bash
# Ensure test database is clean
alembic downgrade base
alembic upgrade head
pytest
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow code style**: ESLint/Prettier for mobile, Black/Ruff for backend
3. **Write tests**: Maintain >80% coverage for new code
4. **Use conventional commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
5. **Update documentation**: Keep README and inline docs current
6. **Submit PR**: Provide clear description of changes and motivation

### Development Setup for Contributors

```bash
# Fork and clone
git clone https://github.com/your-username/synapse.git
cd synapse

# Setup mobile
cd mobile
npm install
npm test

# Setup backend
cd ../backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest

# Create feature branch
git checkout -b feature/your-feature
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Sentence Transformers**: For multilingual text embeddings
- **Kiwipiepy**: For Korean morphological analysis
- **FastAPI**: For the high-performance Python backend
- **Expo**: For the excellent React Native development experience
- **pgvector**: For efficient vector similarity search

## Support

For questions, issues, or feature requests:
- **Issues**: [GitHub Issues](https://github.com/yourusername/synapse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/synapse/discussions)

---

**Built with** ❤️ **for better note-taking and knowledge management**
