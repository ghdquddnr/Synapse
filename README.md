# Synapse

> Offline-first intelligent note-taking mobile app with AI-powered recommendations and weekly insights

## Overview

**Synapse**는 오프라인 우선(offline-first) 아키텍처를 기반으로 한 지능형 노트 앱입니다. 로컬 SQLite 데이터베이스를 단일 소스로 사용하며, AI 기반 추천과 주간 회고 기능을 제공합니다.

## Key Features

- **Offline-First**: 100% 오프라인 동작 보장 (SQLite 기반)
- **Smart Sync**: 양방향 동기화 with LWW conflict resolution
- **AI Recommendations**: 시맨틱 유사도 기반 연결된 노트 추천
- **Full-Text Search**: FTS5를 활용한 빠른 검색 (<150ms P95)
- **Weekly Insights**: KMeans 클러스터링 기반 주간 회고

## Architecture

### Monorepo Structure

```
synapse/
├── mobile/              # React Native (Expo SDK 54)
│   ├── src/
│   │   ├── services/    # Database, sync, API
│   │   ├── screens/     # UI screens
│   │   ├── hooks/       # React Query hooks
│   │   └── store/       # Zustand state management
│   └── package.json
├── backend/             # FastAPI (Python 3.12+)
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   └── services/    # AI services (embedding, keywords, recommendations)
│   └── requirements.txt
└── .github/workflows/   # CI/CD pipelines
```

### Tech Stack

**Mobile**:
- React Native + Expo SDK 54
- TypeScript (strict mode)
- SQLite (expo-sqlite) with FTS5
- Zustand (state management)
- React Query (data fetching)

**Backend**:
- FastAPI (Python 3.12+)
- PostgreSQL with pgvector
- SQLAlchemy ORM
- Sentence Transformers (multilingual-e5-large)
- Kiwipiepy (Korean morphological analysis)

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- Python 3.12+
- Docker & Docker Compose (for backend)

### Mobile Development

```bash
cd mobile
npm install
npm start              # Start Expo dev server
npm run android        # Run on Android emulator
npm run ios            # Run on iOS (macOS only)
npm test               # Run Jest tests
npm run lint           # Run ESLint
npm run type-check     # TypeScript validation
```

### Backend Development

```bash
cd backend

# Using Docker Compose (recommended)
docker-compose up

# Or manually
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Run tests
pytest --cov=app

# Database migrations
alembic upgrade head
```

## Development Workflow

1. **Feature Branch**: Create from `main` or `develop`
2. **Local Development**: Mobile or backend changes
3. **Testing**: Run `npm test` or `pytest`
4. **Code Quality**: `npm run lint && npm run type-check`
5. **Commit**: Use conventional commits (`feat:`, `fix:`, `refactor:`)
6. **CI/CD**: Automated tests run on push/PR

## CI/CD

- **Mobile Tests**: Node.js 18.x/20.x matrix, Jest + coverage
- **Backend Tests**: Python 3.12, PostgreSQL + Redis services
- **Docker Build**: Multi-platform (amd64/arm64) + Trivy security scan

## Performance Targets

- App cold start: <2s
- Note save: <1s (P95)
- Search: <150ms (P95)
- Sync: <10s (100 notes)
- AI recommendation API: <500ms

## Project Status

**Current Phase**: M1 MVP Development
- [x] Phase 1: Project scaffolding, backend setup, CI/CD
- [ ] Phase 2: Mobile database & offline features
- [ ] Phase 3: Sync implementation
- [ ] Phase 4: Backend AI services
- [ ] Phase 5: Mobile AI features & weekly insights

## Documentation

- [PRD (Product Requirements Document)](tasks/prd-synapse-mobile-mvp.md)
- [Task List](tasks/tasks-0001-prd-synapse-mobile-mvp.md)
- [Architecture Guide](CLAUDE.md)

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.
