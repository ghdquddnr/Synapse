# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Synapse** is an offline-first intelligent note-taking mobile app with AI-powered recommendations and weekly insights. The project uses a React Native (Expo) frontend with FastAPI backend architecture.

**Core Principle**: Offline-first - Local SQLite is the single source of truth. The server provides analysis, recommendations, backup, and sync coordination only.

## Project Structure

```
synapse/
├── mobile/              # React Native (Expo SDK 54) mobile app
│   ├── src/
│   │   ├── services/    # Database, sync, API client logic
│   │   ├── screens/     # Screen components
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # React Query hooks
│   │   ├── store/       # Zustand state management
│   │   ├── types/       # TypeScript type definitions
│   │   ├── utils/       # Utility functions
│   │   ├── constants/   # App constants
│   │   └── navigation/  # Navigation configuration
│   └── package.json
├── backend/             # FastAPI backend (Python 3.12+)
│   ├── app/
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── api/         # API route handlers
│   │   ├── services/    # Business logic (embedding, keyword, recommendation)
│   │   └── core/        # Security, deps
│   ├── alembic/         # Database migrations
│   ├── tests/           # pytest tests
│   ├── requirements.txt
│   └── docker-compose.yml
└── tasks/               # Project task lists and PRDs
```

## Development Commands

### Mobile (React Native/Expo)

**Directory**: Always run mobile commands from `mobile/` directory.

```bash
# Install dependencies
cd mobile && npm install

# Start development server
npm start              # Interactive menu
npm run android        # Start on Android emulator
npm run ios            # Start on iOS (macOS only)

# Testing
npm test               # Run Jest tests
npm run test:watch     # Watch mode
npm run test:coverage  # Generate coverage report

# Code quality
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format with Prettier
npm run type-check     # TypeScript type checking (tsc --noEmit)
```

### Backend (FastAPI)

**Directory**: Always run backend commands from `backend/` directory.

```bash
# Setup virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload

# Testing
pytest                        # Run all tests
pytest --cov=app              # With coverage report
pytest backend/tests/test_api # Specific test directory

# Database migrations
alembic upgrade head          # Apply migrations
alembic revision --autogenerate -m "message"  # Create new migration

# Docker development
docker-compose up             # Start API, PostgreSQL, Redis
docker-compose down           # Stop all services
```

## Architecture Highlights

### Mobile Architecture (Offline-First)

**Data Flow**:
- Local SQLite → Single source of truth
- All CRUD operations work 100% offline
- Change log tracks all modifications for sync
- Sync is bidirectional (Push + Pull) with LWW conflict resolution

**Key Services**:
- `services/database/`: SQLite operations (schema, CRUD, FTS5 search)
- `services/sync/`: Push/Pull sync, conflict resolution, queue management
- `services/api/`: HTTP client for backend communication

**State Management**:
- Zustand stores: `notesStore`, `authStore`, `syncStore`
- React Query hooks: Data fetching, caching, optimistic updates

### Backend Architecture (Analysis & Sync)

**Responsibilities**:
- AI features: Text embedding (multilingual-e5-large), keyword extraction (Kiwipiepy)
- Recommendations: Semantic similarity using pgvector
- Weekly reports: KMeans clustering, keyword aggregation
- Sync coordination: Delta generation, checkpoint management

**Key Services**:
- `services/embedding.py`: Generate 1024-dim embeddings
- `services/keyword.py`: Korean morphological analysis + TF-IDF
- `services/recommendation.py`: Hybrid similarity scoring
- `services/report.py`: Weekly insight generation

### Sync Protocol

**Push Sync**:
1. Client queries change_log for unsynced entries (max 100 or 1MB)
2. POST /sync/push with batch
3. Server processes changes, generates embeddings/keywords
4. Returns success/failure per item, new checkpoint
5. Client marks successful items as synced

**Pull Sync**:
1. Client sends last checkpoint to POST /sync/pull
2. Server queries changes since checkpoint
3. Returns delta (upsert/delete operations)
4. Client applies changes with LWW conflict resolution
5. Client saves new checkpoint

**Conflict Resolution (LWW)**:
1. Compare `updated_at` timestamps
2. If equal, compare `server_timestamp`
3. If still equal, use `entity_id` lexicographic order

## Testing Strategy

### Mobile Tests
- **Location**: Co-located with code (`*.test.ts(x)`)
- **Framework**: Jest + React Testing Library
- **Coverage target**: >80% for service logic
- **Run**: `npm test` from `mobile/` directory

### Backend Tests
- **Location**: `backend/tests/` directory hierarchy
- **Framework**: pytest + httpx
- **Coverage target**: >80% services, >70% API endpoints
- **Run**: `pytest` from `backend/` directory

### Test Organization
```
mobile/src/services/database/notes.ts
mobile/src/services/database/notes.test.ts  # Co-located

backend/tests/
├── conftest.py
├── test_api/
│   ├── test_auth.py
│   └── test_sync.py
└── test_services/
    ├── test_embedding.py
    └── test_keyword.py
```

## Task Management Protocol

**Follow process-task-list.md guidelines**:
1. Work one sub-task at a time
2. Ask user permission before starting next sub-task
3. When sub-task completes:
   - Mark as `[x]` immediately
   - Update "Relevant Files" section
4. When all sub-tasks complete:
   - Run test suite (`npm test` or `pytest`)
   - Only if tests pass: `git add .`
   - Clean up temporary files
   - Commit with conventional format
   - Mark parent task as `[x]`

**Task File**: `tasks/tasks-0001-prd-synapse-mobile-mvp.md`

## Data Model Core Concepts

**Note**:
- No separate title - first line (max 50 chars) displayed as title
- Fields: `id` (UUIDv7), `body`, `importance` (1-3), `source_url`, `image_path`, timestamps
- Soft delete: `deleted_at` field instead of hard delete

**Search**:
- FTS5 (Full-Text Search) with unicode61 tokenizer
- Virtual table `notes_fts` with triggers for auto-sync
- Target: <150ms (P95) for 10,000 notes

**Sync State**:
- `change_log`: Tracks all local modifications for push sync
- `sync_state`: Stores checkpoint for pull sync
- Queue limit: 10,000 entries (read-only mode if exceeded)

## Performance Targets

- App cold start: <2s
- Note save: <1s (P95)
- Search: <150ms (P95)
- Sync completion: <10s (100 notes)
- AI recommendation API: <500ms

## Development Workflow

1. **Feature development**: Create feature branch from main
2. **Mobile changes**: Work in `mobile/` directory, run `npm test` frequently
3. **Backend changes**: Work in `backend/` directory, run `pytest` frequently
4. **Code quality**: Run `npm run lint && npm run type-check` before commit
5. **Commit**: Use conventional commits (`feat:`, `fix:`, `refactor:`)
6. **Sync test**: Test offline → online sync flow for data-related changes

## Important Notes

- **Path aliases**: Use `@/` prefix for imports (configured in tsconfig.json)
- **TypeScript**: Strict mode enabled - all types must be explicit
- **Environment**: Mobile uses `.env` for API URLs, backend uses `.env` for secrets
- **Database**: SQLite WAL mode for mobile, PostgreSQL with pgvector for backend
- **Authentication**: JWT tokens (Access: 1h, Refresh: 30d) stored in react-native-keychain
- **Minimum Android SDK**: 24 (Android 7.0)
