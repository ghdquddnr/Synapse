# Task List: Synapse 모바일 MVP

## Current State Assessment

**프로젝트 상태**: 완전히 새로운 프로젝트 (코드베이스 없음)
**아키텍처**: Offline-First, React Native + FastAPI 풀스택
**범위**: M1 (첫 출시) - 노트 CRUD, 검색, 동기화, AI 추천, 회고

---

## Relevant Files

### 모바일 앱 (React Native/Expo)

**프로젝트 설정**
- `mobile/app.json` - Expo 프로젝트 설정 (SDK 54, 앱 이름, 패키지명, permissions, plugins)
- `mobile/package.json` - 의존성 및 스크립트 (jest, lint, format, type-check)
- `mobile/tsconfig.json` - TypeScript 설정 (strict mode, path aliases @/*)
- `mobile/.eslintrc.js` - ESLint 설정 (TypeScript, React, React Hooks)
- `mobile/.prettierrc` - Prettier 설정 (single quote, trailing comma)
- `mobile/.prettierignore` - Prettier ignore 패턴
- `mobile/.gitignore` - Git ignore 패턴 (node_modules, .expo, coverage, IDE files)

**CI/CD**
- `.github/workflows/test-mobile.yml` - 모바일 앱 Jest 테스트 워크플로우
- `.github/workflows/test-backend.yml` - 백엔드 pytest 테스트 워크플로우
- `.github/workflows/docker-build.yml` - Docker 이미지 빌드 및 보안 스캔 워크플로우

**진입점 및 내비게이션**
- `src/App.tsx` - 앱 진입점, 프로바이더 설정
- `src/navigation/RootNavigator.tsx` - 루트 내비게이션 (Stack)
- `src/navigation/BottomTabNavigator.tsx` - 하단 탭 바 (홈, 검색, 회고, 설정)

**타입 정의**
- `src/types/index.ts` - Note, Relation, Keyword, Reflection 등 공통 타입, Input/Filter 타입
- `src/types/database.ts` - SQLite 관련 타입, DatabaseError 클래스
- `src/types/sync.ts` - 동기화 프로토콜 타입 (SyncBatch, Delta, ConflictLog 등)
- `src/types/api.ts` - API 요청/응답 타입 (Login, Token, Recommendation, WeeklyReport 등)

**상수**
- `src/constants/colors.ts` - 컬러 팔레트 (라이트/다크 모드)
- `src/constants/database.ts` - DB 관련 상수 (테이블명, 인덱스명, 동기화 설정, 검색 설정)
- `src/constants/api.ts` - API 엔드포인트 URL

**데이터베이스 서비스**
- `src/services/database/schema.ts` - SQLite 스키마 정의 및 생성 (테이블, FTS5, 트리거, 인덱스, PRAGMA)
- `src/services/database/schema.test.ts` - 스키마 생성 및 무결성 제약 테스트
- `src/services/database/migrations.ts` - DB 마이그레이션 로직
- `src/services/database/connection.ts` - DB 연결 관리 (싱글톤, 트랜잭션 지원)
- `src/services/database/notes.ts` - 노트 CRUD 함수
- `src/services/database/notes.test.ts` - 노트 CRUD 테스트
- `src/services/database/search.ts` - FTS5 검색 로직
- `src/services/database/search.test.ts` - 검색 테스트
- `src/services/database/relations.ts` - 연결 관리 함수
- `src/services/database/relations.test.ts` - 연결 테스트
- `src/services/database/reflections.ts` - 회고 CRUD 함수
- `src/services/database/reflections.test.ts` - 회고 테스트
- `src/services/database/changeLog.ts` - 변경 로그 기록 및 조회
- `src/services/database/changeLog.test.ts` - 변경 로그 테스트

**동기화 서비스**
- `src/services/sync/types.ts` - 동기화 타입 정의
- `src/services/sync/push.ts` - Push 동기화 로직
- `src/services/sync/push.test.ts` - Push 테스트
- `src/services/sync/pull.ts` - Pull 동기화 로직
- `src/services/sync/pull.test.ts` - Pull 테스트
- `src/services/sync/conflict.ts` - LWW 충돌 해결
- `src/services/sync/conflict.test.ts` - 충돌 해결 테스트
- `src/services/sync/queue.ts` - 동기화 큐 관리
- `src/services/sync/retry.ts` - 재시도 메커니즘

**API 클라이언트**
- `src/services/api/client.ts` - Axios 클라이언트 설정 (인터셉터, 타임아웃)
- `src/services/api/auth.ts` - 인증 API (로그인, 토큰 갱신)
- `src/services/api/sync.ts` - 동기화 API (push, pull)
- `src/services/api/recommendations.ts` - 추천 API
- `src/services/api/reports.ts` - 리포트 API

**상태 관리 (Zustand)**
- `src/store/notesStore.ts` - 노트 상태 (로컬 캐시)
- `src/store/authStore.ts` - 인증 상태 (토큰, 사용자 정보)
- `src/store/syncStore.ts` - 동기화 상태 (진행률, 에러)

**React Query Hooks**
- `src/hooks/useNotes.ts` - 노트 CRUD hooks
- `src/hooks/useSync.ts` - 동기화 hooks
- `src/hooks/useRecommendations.ts` - 추천 hooks
- `src/hooks/useSearch.ts` - 검색 hooks
- `src/hooks/useReflections.ts` - 회고 hooks

**화면 (Screens)**
- `src/screens/HomeScreen.tsx` - 홈 탭 (노트 작성/목록)
- `src/screens/HomeScreen.test.tsx` - 홈 화면 테스트
- `src/screens/NoteDetailScreen.tsx` - 노트 상세
- `src/screens/NoteDetailScreen.test.tsx` - 노트 상세 테스트
- `src/screens/SearchScreen.tsx` - 검색 탭
- `src/screens/SearchScreen.test.tsx` - 검색 화면 테스트
- `src/screens/ReflectionScreen.tsx` - 회고 탭
- `src/screens/ReflectionScreen.test.tsx` - 회고 화면 테스트
- `src/screens/SettingsScreen.tsx` - 설정 탭
- `src/screens/SettingsScreen.test.tsx` - 설정 화면 테스트

**컴포넌트**
- `src/components/NoteCard.tsx` - 노트 카드 컴포넌트
- `src/components/NoteCard.test.tsx` - 노트 카드 테스트
- `src/components/NoteInput.tsx` - 노트 입력창 (다중 라인)
- `src/components/NoteInput.test.tsx` - 입력창 테스트
- `src/components/SearchBar.tsx` - 검색 바
- `src/components/SearchBar.test.tsx` - 검색 바 테스트
- `src/components/RelationList.tsx` - 연결 목록
- `src/components/RelationList.test.tsx` - 연결 목록 테스트
- `src/components/RecommendationCard.tsx` - 추천 노트 카드
- `src/components/RecommendationCard.test.tsx` - 추천 카드 테스트
- `src/components/SyncStatusBanner.tsx` - 동기화 상태 배너
- `src/components/SyncStatusBanner.test.tsx` - 동기화 배너 테스트
- `src/components/OfflineBanner.tsx` - 오프라인 배너
- `src/components/OfflineBanner.test.tsx` - 오프라인 배너 테스트
- `src/components/LoadingSpinner.tsx` - 로딩 스피너
- `src/components/SkeletonLoader.tsx` - Skeleton UI

**유틸리티**
- `src/utils/uuid.ts` - UUIDv7 생성 함수
- `src/utils/uuid.test.ts` - UUID 생성 테스트
- `src/utils/date.ts` - 날짜 포맷팅 및 계산
- `src/utils/date.test.ts` - 날짜 유틸 테스트
- `src/utils/highlight.ts` - 검색어 하이라이팅
- `src/utils/highlight.test.ts` - 하이라이팅 테스트
- `src/utils/validation.ts` - 데이터 검증 함수
- `src/utils/validation.test.ts` - 검증 테스트

### 백엔드 (FastAPI)

**프로젝트 설정**
- `backend/requirements.txt` - Python 의존성 (FastAPI, SQLAlchemy, sentence-transformers 등)
- `backend/.env.example` - 환경 변수 템플릿 (DB, Redis, JWT, AI 모델 설정)
- `backend/.gitignore` - Git ignore 패턴 (venv, .env, cache, models)
- `backend/pytest.ini` - pytest 설정 (coverage, markers)
- `backend/pyproject.toml` - black, ruff, mypy 설정
- `backend/README.md` - 백엔드 개발 가이드 (설치, 실행, 테스트 방법)

**Docker 설정**
- `backend/Dockerfile` - 멀티스테이지 빌드, non-root 사용자, health check
- `backend/docker-compose.yml` - API, PostgreSQL (pgvector), Redis 서비스
- `backend/docker-compose.dev.yml` - 개발 환경 오버라이드 (hot reload)
- `backend/.dockerignore` - Docker 빌드 제외 파일
- `backend/init-db.sql` - PostgreSQL pgvector 확장 초기화

**개발 스크립트**
- `backend/Makefile` - 공통 개발 명령어 (Unix/Linux/macOS)
- `backend/scripts/dev.ps1` - PowerShell 개발 스크립트 (Windows)

**앱 코드**
- `backend/app/__init__.py` - 패키지 초기화 (version 정보)
- `backend/app/main.py` - FastAPI 앱 진입점, CORS 미들웨어, health check (DB 연결 확인)
- `backend/app/config.py` - pydantic-settings 기반 환경 변수 관리 (DB, Redis, JWT, AI 설정)
- `backend/app/database.py` - SQLAlchemy engine, SessionLocal, Base, get_db dependency, DB health check

**모델 (SQLAlchemy)**
- `backend/app/models/__init__.py` - 모델 패키지
- `backend/app/models/user.py` - User 모델
- `backend/app/models/note.py` - Note 모델 (임베딩 벡터 포함)
- `backend/app/models/keyword.py` - Keyword 모델
- `backend/app/models/note_keyword.py` - NoteKeyword 관계 모델
- `backend/app/models/relation.py` - Relation 모델
- `backend/app/models/reflection.py` - Reflection 모델
- `backend/app/models/weekly_report.py` - WeeklyReport 모델
- `backend/app/models/device.py` - Device 모델

**스키마 (Pydantic)**
- `backend/app/schemas/__init__.py` - 스키마 패키지
- `backend/app/schemas/auth.py` - LoginRequest, TokenResponse 등
- `backend/app/schemas/sync.py` - SyncPushRequest, SyncPullResponse, Delta 등
- `backend/app/schemas/recommendation.py` - RecommendationResult 등
- `backend/app/schemas/report.py` - WeeklyReport, ClusterSummary 등

**API 라우터**
- `backend/app/api/__init__.py` - API 패키지
- `backend/app/api/auth.py` - POST /auth/login, POST /auth/refresh
- `backend/app/api/sync.py` - POST /sync/push, POST /sync/pull
- `backend/app/api/recommend.py` - GET /recommend/{note_id}
- `backend/app/api/reports.py` - GET /reports/weekly

**서비스**
- `backend/app/services/__init__.py` - 서비스 패키지
- `backend/app/services/embedding.py` - 임베딩 생성 (multilingual-e5-large)
- `backend/app/services/keyword.py` - 키워드 추출 (Kiwipiepy)
- `backend/app/services/recommendation.py` - 관련 노트 추천 로직
- `backend/app/services/report.py` - 주간 리포트 생성 (클러스터링)

**코어 유틸리티**
- `backend/app/core/__init__.py` - 코어 패키지
- `backend/app/core/security.py` - JWT 토큰 생성/검증
- `backend/app/core/deps.py` - 의존성 주입 (get_db, get_current_user)

**마이그레이션 (Alembic)**
- `backend/alembic.ini` - Alembic 설정 (환경 변수 사용, black 포매팅)
- `backend/alembic/env.py` - Alembic 환경 설정 (app.config, app.database 통합)
- `backend/alembic/script.py.mako` - 마이그레이션 템플릿
- `backend/alembic/versions/001_enable_pgvector.py` - pgvector 확장 활성화

**테스트**
- `backend/tests/conftest.py` - pytest fixture 설정 (client, test_db, test_user)
- `backend/tests/test_api/__init__.py` - API 테스트 패키지
- `backend/tests/test_api/test_main.py` - 메인 엔드포인트 테스트 (root, health)
- `backend/tests/test_api/test_auth.py` - 인증 API 테스트 (TODO)
- `backend/tests/test_api/test_sync.py` - 동기화 API 테스트 (TODO)
- `backend/tests/test_api/test_recommend.py` - 추천 API 테스트 (TODO)
- `backend/tests/test_services/__init__.py` - 서비스 테스트 패키지
- `backend/tests/test_services/test_embedding.py` - 임베딩 생성 테스트 (TODO)
- `backend/tests/test_services/test_keyword.py` - 키워드 추출 테스트 (TODO)
- `backend/tests/test_services/test_recommendation.py` - 추천 로직 테스트 (TODO)

### Notes

- **모바일 테스트**: 코드 파일과 동일한 디렉토리에 `*.test.ts(x)` 파일 배치
- **백엔드 테스트**: `backend/tests/` 디렉토리에 계층 구조로 배치
- **모바일 테스트 실행**: `npm test` 또는 `npx jest`
- **백엔드 테스트 실행**: `pytest` 또는 `pytest backend/tests/`

---

## Tasks

### Phase 1: 프로젝트 초기 설정 및 인프라 구축

- [ ] **1.0 프로젝트 초기 설정 및 인프라 구축**
  - [x] 1.1 Expo 프로젝트 생성 및 기본 설정
    - Expo SDK 54 기반 React Native 프로젝트 생성 (mobile/ 디렉토리)
    - TypeScript 설정 완료 (`tsconfig.json` - strict mode, path aliases)
    - ESLint, Prettier 설정 완료
    - 필수 의존성 추가: `expo-sqlite`, `expo-file-system`, `@react-navigation/native`, `zustand`, `@tanstack/react-query`, `axios`, `react-native-keychain`, `date-fns`, `@react-native-community/netinfo`
    - 폴더 구조 생성 완료 (`src/screens`, `src/components`, `src/services`, `src/hooks`, `src/store`, `src/utils`, `src/types`, `src/constants`, `src/navigation`)
    - `app.json` 설정 완료: 앱 이름 "Synapse", 버전 1.0.0, Android minSdkVersion 24, plugins 설정
  - [x] 1.2 FastAPI 백엔드 프로젝트 생성 및 기본 설정
    - Python 3.12 가상환경 생성 완료 (backend/venv/)
    - `requirements.txt` 작성 완료: FastAPI, SQLAlchemy, Alembic, sentence-transformers, kiwipiepy, pytest 등 모든 의존성
    - 폴더 구조 생성 완료 (`backend/app/{models,schemas,api,services,core}`, `backend/tests/{test_api,test_services}`)
    - `app/main.py` 생성 완료: FastAPI 앱, CORS 미들웨어, health check 엔드포인트
    - `app/config.py` 생성 완료: pydantic-settings 기반 환경 변수 관리
    - `.env.example` 생성 완료: 모든 환경 변수 템플릿
    - `pytest.ini`, `pyproject.toml` (black, ruff, mypy 설정) 추가
    - 기본 API 테스트 작성 완료 (test_main.py)
  - [x] 1.3 Docker 및 docker-compose 설정
    - `backend/Dockerfile` 작성 완료: Python 3.12 slim, 멀티스테이지 빌드, non-root 사용자, health check
    - `backend/docker-compose.yml` 작성 완료: API, PostgreSQL (pgvector), Redis 서비스, health checks, 볼륨 설정
    - `backend/docker-compose.dev.yml` 작성 완료: 개발 환경 오버라이드 (hot reload, debugpy)
    - `backend/.dockerignore` 추가: Python 캐시, venv, IDE 파일 제외
    - `backend/init-db.sql` 추가: pgvector 확장 초기화 스크립트
    - `backend/Makefile` 추가: 공통 개발 명령어 (dev, test, docker-up 등)
    - `backend/scripts/dev.ps1` 추가: Windows PowerShell 개발 스크립트
    - docker-compose 설정 검증 완료
  - [x] 1.4 데이터베이스 초기 설정
    - Alembic 초기화 완료: `alembic init alembic`
    - `alembic/env.py` 설정 완료: app.config와 app.database 통합, Base.metadata 연결
    - `alembic.ini` 설정 완료: 환경 변수 사용, black 포매팅 활성화
    - `app/database.py` 생성 완료: SQLAlchemy engine, SessionLocal, Base, get_db dependency
    - `app/main.py` 업데이트: 실제 DB 연결 확인 health check
    - 초기 마이그레이션 생성 완료: `001_enable_pgvector.py` - pgvector 확장 활성화
  - [x] 1.5 CI/CD 파이프라인 기본 설정 (GitHub Actions)
    - `.github/workflows/test-mobile.yml` 생성: 모바일 앱 Jest 테스트 실행 (Node.js 18.x, 20.x 매트릭스)
    - `.github/workflows/test-backend.yml` 생성: 백엔드 pytest 실행 (PostgreSQL pgvector, Redis 서비스 컨테이너)
    - `.github/workflows/docker-build.yml` 생성: Docker 이미지 빌드 및 보안 스캔 (Trivy)

---

### Phase 2: 모바일 앱 - 로컬 데이터베이스 및 오프라인 기능 구현

- [ ] **2.0 모바일 앱 - 로컬 데이터베이스 및 오프라인 기능 구현**
  - [x] 2.1 SQLite 스키마 정의 및 생성
    - `src/types/index.ts` 작성: Note, Keyword, Relation, Reflection 등 모든 엔티티 타입 정의
    - `src/types/database.ts` 작성: SQLite 관련 타입 및 에러 클래스
    - `src/types/sync.ts` 작성: 동기화 프로토콜 타입
    - `src/types/api.ts` 작성: API 요청/응답 타입
    - `src/constants/database.ts` 작성: DB 관련 상수 (테이블명, 인덱스명, 동기화 설정)
    - `src/services/database/schema.ts` 작성 완료
      - 모든 테이블 CREATE 문 정의 (notes, keywords, note_keywords, relations, reflections, weekly_reports, change_log, sync_state, search_history)
      - FTS5 가상 테이블 및 트리거 생성 (notes_fts, notes_ai, notes_ad, notes_au)
      - 인덱스 생성: `idx_notes_updated_at`, `idx_notes_importance`, `idx_notes_deleted`, `idx_change_log_synced`, `idx_change_log_entity`, `idx_note_keywords_note`, `idx_relations_from`, `idx_relations_to`
      - PRAGMA 설정: `journal_mode=WAL`, `foreign_keys=ON`, `cache_size=-64000`, `temp_store=MEMORY`, `synchronous=NORMAL`
      - 스키마 생성 함수: `initializeSchema()`, `verifySchema()`, `dropAllTables()`
    - `src/services/database/connection.ts` 작성: 싱글톤 DB 연결 관리자, 트랜잭션 지원
    - `src/services/database/schema.test.ts` 작성: 스키마 생성 및 무결성 제약 테스트
  - [ ] 2.2 FTS5 검색 인덱스 설정
    - `CREATE VIRTUAL TABLE notes_fts USING fts5(body, content='notes', tokenize='unicode61 remove_diacritics 2')`
    - FTS5 동기화 트리거 생성: `notes_ai`, `notes_ad`, `notes_au`
    - 검색 쿼리 함수 작성: `searchNotes(query: string): Promise<Note[]>`
    - 검색어 하이라이팅 함수 작성: `snippet(notes_fts, ...)`
  - [ ] 2.3 데이터베이스 연결 관리
    - `src/services/database/connection.ts` 작성
    - 싱글톤 패턴으로 DB 연결 관리
    - 앱 시작 시 DB 초기화 및 스키마 생성
    - 에러 핸들링 및 재시도 로직
  - [ ] 2.4 노트 CRUD 함수 구현
    - `src/services/database/notes.ts` 작성
      - `createNote(note: CreateNoteInput): Promise<Note>`
      - `getNote(id: string): Promise<Note | null>`
      - `updateNote(id: string, updates: Partial<Note>): Promise<Note>`
      - `deleteNote(id: string): Promise<void>` (soft delete)
      - `getNotes(filters?: NoteFilters): Promise<Note[]>`
    - 각 함수에 변경 로그 기록 추가
    - 단위 테스트 작성
  - [ ] 2.5 검색 함수 구현
    - `src/services/database/search.ts` 작성
      - `searchNotes(query: string, limit?: number): Promise<SearchResult[]>`
      - `saveSearchHistory(query: string): Promise<void>`
      - `getSearchHistory(limit?: number): Promise<string[]>`
      - `clearSearchHistory(): Promise<void>`
    - 검색 결과 하이라이팅 로직 구현
    - 단위 테스트 작성
  - [ ] 2.6 연결(Relation) 관리 함수 구현
    - `src/services/database/relations.ts` 작성
      - `createRelation(relation: CreateRelationInput): Promise<Relation>`
      - `getRelations(noteId: string): Promise<Relation[]>`
      - `deleteRelation(id: string): Promise<void>`
    - 양방향 연결 조회 지원
    - 단위 테스트 작성
  - [ ] 2.7 회고(Reflection) 관리 함수 구현
    - `src/services/database/reflections.ts` 작성
      - `createReflection(content: string, date: string): Promise<Reflection>`
      - `getReflection(date: string): Promise<Reflection | null>`
      - `updateReflection(date: string, content: string): Promise<Reflection>`
      - `getWeeklyKeywords(weekKey: string): Promise<{ name: string; count: number }[]>`
    - 날짜별 unique 제약 처리
    - 단위 테스트 작성
  - [ ] 2.8 변경 로그(Change Log) 관리 구현
    - `src/services/database/changeLog.ts` 작성
      - `logChange(entityType: string, entityId: string, operation: string, payload: any): Promise<void>`
      - `getUnsyncedChanges(limit?: number): Promise<ChangeLogEntry[]>`
      - `markAsSynced(ids: number[]): Promise<void>`
      - `incrementRetryCount(id: number, error: string): Promise<void>`
    - 우선순위 계산 로직 구현
    - 단위 테스트 작성
  - [ ] 2.9 타입 정의 작성
    - `src/types/index.ts` 작성: Note, Relation, Keyword, Reflection, ChangeLogEntry 등
    - `src/types/database.ts` 작성: SQLite 관련 타입
    - `src/types/sync.ts` 작성: SyncBatch, Delta 등

---

### Phase 3: 모바일 앱 - UI/UX 및 화면 구현

- [ ] **3.0 모바일 앱 - UI/UX 및 화면 구임**
  - [ ] 3.1 내비게이션 설정
    - `src/navigation/RootNavigator.tsx` 작성: Stack Navigator 설정
    - `src/navigation/BottomTabNavigator.tsx` 작성: 4개 탭 (홈, 검색, 회고, 설정)
    - 탭 아이콘 및 라벨 설정
  - [ ] 3.2 상수 및 테마 설정
    - `src/constants/colors.ts` 작성: 라이트/다크 모드 컬러 팔레트
    - `src/constants/database.ts` 작성: DB 관련 상수
    - `src/constants/api.ts` 작성: API 엔드포인트 URL
  - [ ] 3.3 공통 컴포넌트 구현
    - `src/components/LoadingSpinner.tsx` 작성: 스피너 컴포넌트
    - `src/components/SkeletonLoader.tsx` 작성: Skeleton UI
    - `src/components/OfflineBanner.tsx` 작성: 오프라인 배너 (상단 고정)
    - `src/components/SyncStatusBanner.tsx` 작성: 동기화 상태 배너
    - 각 컴포넌트 테스트 작성
  - [ ] 3.4 노트 관련 컴포넌트 구현
    - `src/components/NoteInput.tsx` 작성
      - 다중 라인 입력창 (자동 확장, 최대 10줄)
      - 중요도 선택 (SegmentedControl)
      - URL 입력 필드 (선택)
      - 저장/취소 버튼
    - `src/components/NoteCard.tsx` 작성
      - 첫 줄 미리보기 (최대 50자)
      - 메타데이터: 생성일, 중요도, 연결 개수
      - 미동기화 표시 (빨간 점)
      - 스와이프 액션 (삭제)
    - 각 컴포넌트 테스트 작성
  - [ ] 3.5 홈 화면 구현
    - `src/screens/HomeScreen.tsx` 작성
      - 상단: NoteInput 컴포넌트
      - 중간: 옵션 영역 (접기/펼치기)
      - 하단: 오늘의 노트 목록 (FlatList + NoteCard)
      - Pull-to-refresh 구현
    - `src/hooks/useNotes.ts` 작성: 노트 CRUD React Query hooks
    - 화면 테스트 작성
  - [ ] 3.6 노트 상세 화면 구현
    - `src/screens/NoteDetailScreen.tsx` 작성
      - 헤더: 뒤로 가기, 편집, 메뉴 (삭제 등)
      - 본문 표시 (편집 모드 전환 가능)
      - 메타데이터: 중요도, 생성일, 수정일
      - 키워드 섹션
      - 수동 연결 섹션 (RelationList)
      - AI 추천 섹션 (RecommendationCard)
    - `src/components/RelationList.tsx` 작성: 연결 목록 및 추가/삭제
    - `src/components/RecommendationCard.tsx` 작성: 추천 노트 카드 (스코어, 이유 표시)
    - 화면 테스트 작성
  - [ ] 3.7 검색 화면 구현
    - `src/screens/SearchScreen.tsx` 작성
      - 상단: SearchBar 컴포넌트
      - 검색 전: 최근 검색어 목록
      - 검색 후: 검색 결과 목록 (하이라이팅)
    - `src/components/SearchBar.tsx` 작성: 검색 입력창 (실시간 검색)
    - `src/hooks/useSearch.ts` 작성: 검색 hooks
    - `src/utils/highlight.ts` 작성: 검색어 하이라이팅 함수
    - 화면 테스트 작성
  - [ ] 3.8 회고 화면 구현
    - `src/screens/ReflectionScreen.tsx` 작성
      - 상단: 오늘의 한 줄 입력창
      - 중간: 이번 주 핵심 키워드 (상위 3개)
      - 하단: 주간 리포트 카드 (요약, 클러스터, 신규 키워드)
    - `src/hooks/useReflections.ts` 작성: 회고 hooks
    - 화면 테스트 작성
  - [ ] 3.9 설정 화면 구현
    - `src/screens/SettingsScreen.tsx` 작성
      - 동기화 섹션: 마지막 동기화 시각, 지금 동기화 버튼, 자동 동기화 토글
      - 백업 섹션: JSON 내보내기/가져오기 버튼 (M2)
      - 표시 섹션: 다크 모드, 글꼴 크기
      - 정보 섹션: 버전, 로컬 노트 개수, 저장소 사용량
    - 화면 테스트 작성
  - [ ] 3.10 에러 처리 및 로딩 상태 UI
    - 에러 토스트 메시지 컴포넌트 작성
    - 재시도 버튼 UI 구현
    - 프로그레스 바 컴포넌트 작성 (동기화 진행률)

---

### Phase 4: 백엔드 - API 서버 및 데이터베이스 구축

- [ ] **4.0 백엔드 - API 서버 및 데이터베이스 구축**
  - [ ] 4.1 PostgreSQL 데이터베이스 모델 정의
    - `backend/app/models/user.py` 작성: User 모델
    - `backend/app/models/note.py` 작성: Note 모델 (embedding VECTOR(1024) 컬럼 포함)
    - `backend/app/models/keyword.py` 작성: Keyword 모델
    - `backend/app/models/note_keyword.py` 작성: NoteKeyword 관계 모델
    - `backend/app/models/relation.py` 작성: Relation 모델
    - `backend/app/models/reflection.py` 작성: Reflection 모델
    - `backend/app/models/weekly_report.py` 작성: WeeklyReport 모델 (data JSONB 컬럼)
    - `backend/app/models/device.py` 작성: Device 모델
    - 모든 모델에 인덱스 추가 (user_id, updated_at, embedding 등)
  - [ ] 4.2 Alembic 마이그레이션 생성 및 적용
    - `alembic revision --autogenerate -m "Create all tables"`
    - `alembic upgrade head` 실행 및 검증
    - pgvector 확장 활성화: `CREATE EXTENSION IF NOT EXISTS vector`
  - [ ] 4.3 Pydantic 스키마 정의
    - `backend/app/schemas/auth.py` 작성: LoginRequest, TokenResponse, RefreshRequest
    - `backend/app/schemas/sync.py` 작성: SyncPushRequest, SyncPullRequest, SyncPushResponse, SyncPullResponse, Delta, ChangeLogEntry
    - `backend/app/schemas/recommendation.py` 작성: RecommendationResult
    - `backend/app/schemas/report.py` 작성: WeeklyReport, ClusterSummary
  - [ ] 4.4 JWT 인증 구현
    - `backend/app/core/security.py` 작성
      - `create_access_token(data: dict) -> str`
      - `create_refresh_token(data: dict) -> str`
      - `verify_token(token: str) -> dict`
      - `hash_password(password: str) -> str`
      - `verify_password(plain: str, hashed: str) -> bool`
    - `backend/app/core/deps.py` 작성
      - `get_db() -> Generator[Session]`
      - `get_current_user(token: str) -> User`
    - 단위 테스트 작성
  - [ ] 4.5 인증 API 구현
    - `backend/app/api/auth.py` 작성
      - `POST /auth/login`: 이메일/비밀번호로 로그인, access/refresh 토큰 발급
      - `POST /auth/refresh`: refresh 토큰으로 access 토큰 갱신
      - `POST /auth/register`: 사용자 등록 (선택)
    - API 테스트 작성 (`backend/tests/test_api/test_auth.py`)
  - [ ] 4.6 데이터베이스 연결 및 세션 관리
    - `backend/app/database.py` 작성
      - SQLAlchemy 엔진 생성
      - SessionLocal 팩토리 설정
      - Base 메타데이터 정의
    - 연결 풀 설정: pool_size=20, max_overflow=10
  - [ ] 4.7 에러 핸들링 및 로깅 설정
    - FastAPI 예외 핸들러 추가 (main.py)
    - 구조화된 로그 설정 (structlog 사용)
    - 에러 응답 포맷 통일

---

### Phase 5: 백엔드 - AI 기능 (임베딩, 추천, 리포트) 구현

- [ ] **5.0 백엔드 - AI 기능 (임베딩, 추천, 리포트) 구현**
  - [ ] 5.1 임베딩 생성 서비스 구현
    - `backend/app/services/embedding.py` 작성
      - `EmbeddingService` 클래스 정의
      - `__init__`: SentenceTransformer('intfloat/multilingual-e5-large') 로드
      - `preprocess_text(body: str) -> str`: URL 정규화, 공백 제거, 최대 길이 제한
      - `augment_short_text(body: str) -> str`: 짧은 메모 문맥 보강
      - `generate_embedding(body: str) -> np.ndarray`: 단일 텍스트 임베딩 생성 (1024차원)
      - `batch_generate_embeddings(texts: List[str]) -> List[np.ndarray]`: 배치 임베딩 생성
    - 단위 테스트 작성 (`backend/tests/test_services/test_embedding.py`)
  - [ ] 5.2 키워드 추출 서비스 구현
    - `backend/app/services/keyword.py` 작성
      - `KeywordService` 클래스 정의
      - `__init__`: Kiwi() 초기화
      - `extract_keywords(body: str, top_k: int = 5) -> List[Tuple[str, float]]`: 형태소 분석 및 TF-IDF 스코어링
      - `get_stopwords() -> Set[str]`: 한국어 스톱워드 반환
      - `calculate_idf(word: str) -> float`: 전체 문서 통계 기반 IDF 계산
    - 단위 테스트 작성 (`backend/tests/test_services/test_keyword.py`)
  - [ ] 5.3 관련 노트 추천 서비스 구현
    - `backend/app/services/recommendation.py` 작성
      - `RecommendationService` 클래스 정의
      - `calculate_similarity_score(target: Note, candidate: Note) -> float`: 임베딩 유사도(0.6) + 키워드 자카드(0.3) + 시간 가중치(0.1)
      - `get_recommendations(note_id: str, k: int = 10) -> List[RecommendationResult]`: pgvector 코사인 유사도 검색 + 후처리
      - `generate_recommendation_reason(target: Note, candidate: Note, score: float) -> str`: 추천 이유 생성
      - `post_process_recommendations(candidates: List) -> List[RecommendationResult]`: 중복 제거, 스코어 필터링, 상위 K개
    - 단위 테스트 작성 (`backend/tests/test_services/test_recommendation.py`)
  - [ ] 5.4 추천 API 구현
    - `backend/app/api/recommend.py` 작성
      - `GET /recommend/{note_id}?k=10`: 관련 노트 추천 반환
      - 인증 필수 (Depends(get_current_user))
      - 404 에러 처리: 노트 없음
    - API 테스트 작성 (`backend/tests/test_api/test_recommend.py`)
  - [ ] 5.5 주간 리포트 생성 서비스 구현
    - `backend/app/services/report.py` 작성
      - `ReportService` 클래스 정의
      - `generate_weekly_report(user_id: str, week_key: str) -> WeeklyReport`
        - 주간 노트 조회 (월요일 ~ 일요일)
        - KMeans 클러스터링 (k=3~5, 노트 개수에 따라 조정)
        - 각 클러스터의 대표 문장 및 키워드 추출
        - 전체 키워드 집계 (상위 10개)
        - 신규 키워드 vs 반복 키워드 구분
        - 잠재적 연결 제안 (임베딩 기반)
      - `generate_summary_text(clusters: List[ClusterSummary]) -> str`: 요약 텍스트 생성
      - `suggest_potential_connections(notes: List[Note], embeddings: np.ndarray) -> List`: 연결 제안
    - 단위 테스트 작성
  - [ ] 5.6 리포트 API 구현
    - `backend/app/api/reports.py` 작성
      - `GET /reports/weekly?week=YYYY-WW`: 주간 리포트 조회
      - 리포트 없으면 백그라운드에서 생성 후 반환
      - 404 에러 처리: 리포트 미생성
    - API 테스트 작성 (`backend/tests/test_api/test_reports.py`)

---

### Phase 6: 동기화 프로토콜 구현 (클라이언트 + 서버)

- [ ] **6.0 동기화 프로토콜 구현 (클라이언트 + 서버)**
  - [ ] 6.1 서버 동기화 API 구현
    - `backend/app/api/sync.py` 작성
      - `POST /sync/push`: 클라이언트 변경사항 수신 및 처리
        - SyncPushRequest 검증 (배치 크기 제한: 100개, 1MB)
        - 각 변경사항 처리 (insert, update, delete)
        - 임베딩 생성 (노트 insert/update 시)
        - 키워드 추출 및 저장
        - 성공/실패 항목 구분하여 응답
        - new_checkpoint 생성 및 반환
      - `POST /sync/pull`: 클라이언트에게 델타 전송
        - 클라이언트 체크포인트 이후 변경사항 조회
        - 델타 생성 (upsert/delete)
        - new_checkpoint 생성 및 반환
    - API 테스트 작성 (`backend/tests/test_api/test_sync.py`)
  - [ ] 6.2 모바일 Push 동기화 구현
    - `src/services/sync/push.ts` 작성
      - `pushChanges(): Promise<SyncResult>`
        - 미동기화 변경 로그 조회 (최대 100개, 1MB 이하)
        - 배치 JSON 직렬화
        - `POST /sync/push` 요청
        - 응답 처리: 성공 로그 `synced_at` 업데이트, 실패 로그 `retry_count` 증가
        - 미동기화 로그 남아있으면 재귀 호출 (다음 배치)
    - `src/services/sync/retry.ts` 작성: 지수 백오프 재시도 로직
    - 단위 테스트 작성
  - [ ] 6.3 모바일 Pull 동기화 구현
    - `src/services/sync/pull.ts` 작성
      - `pullChanges(): Promise<SyncResult>`
        - 로컬 체크포인트 조회 (`sync_state.checkpoint`)
        - `POST /sync/pull` 요청
        - 델타 수신 및 처리
          - `upsert`: LWW 비교 후 로컬 DB 업데이트
          - `delete`: 로컬 레코드 삭제 또는 `deleted_at` 설정
        - `conflict_log` 테이블에 충돌 기록
        - `new_checkpoint` 저장
        - 트랜잭션 커밋
    - 단위 테스트 작성
  - [ ] 6.4 LWW 충돌 해결 구현
    - `src/services/sync/conflict.ts` 작성
      - `shouldUpdate(local: Entity, remote: Entity): boolean`
        - 1차: `updated_at` 비교
        - 2차: `server_timestamp` 비교
        - 3차: `entity_id` 사전순 비교
      - `logConflict(entity: Entity, resolution: string): Promise<void>`
    - 단위 테스트 작성 (다양한 충돌 시나리오)
  - [ ] 6.5 동기화 큐 관리 구현
    - `src/services/sync/queue.ts` 작성
      - `getQueueSize(): Promise<number>`
      - `getPriorityQueue(limit: number): Promise<ChangeLogEntry[]>`: 우선순위 계산 및 정렬
      - `checkQueueLimits(): Promise<QueueStatus>`: 큐 크기 제한 확인 (10,000개)
    - 큐 크기 경고 및 읽기 전용 모드 처리
  - [ ] 6.6 동기화 트리거 설정
    - 앱 포그라운드 진입 시 자동 동기화
    - 네트워크 연결 복구 시 자동 동기화
    - 수동 동기화 버튼 구현 (설정 화면)
    - NetInfo 라이브러리 사용: 네트워크 상태 모니터링
  - [ ] 6.7 동기화 상태 관리
    - `src/store/syncStore.ts` 작성
      - 동기화 상태: `idle`, `syncing`, `success`, `error`
      - 진행률: `processed` / `total`
      - 에러 메시지
    - 동기화 상태 UI 바인딩 (SyncStatusBanner)
  - [ ] 6.8 동기화 잠금 메커니즘
    - 동시 동기화 방지: Push/Pull 동시 실행 방지
    - 교착 방지: 5분 이상 된 잠금 무효화

---

### Phase 7: 테스트 및 품질 보증

- [ ] **7.0 테스트 및 품질 보증**
  - [ ] 7.1 모바일 단위 테스트 작성 및 실행
    - 모든 서비스 함수 단위 테스트 (database, sync, api)
    - 유틸리티 함수 테스트 (uuid, date, highlight, validation)
    - 컴포넌트 테스트 (NoteCard, SearchBar 등)
    - Jest 커버리지 목표: 서비스 로직 > 80%
    - `npm test` 실행 및 커버리지 리포트 확인
  - [ ] 7.2 백엔드 단위 테스트 작성 및 실행
    - 모든 서비스 함수 단위 테스트 (embedding, keyword, recommendation, report)
    - API 엔드포인트 테스트 (auth, sync, recommend, reports)
    - 보안 함수 테스트 (JWT 생성/검증, 비밀번호 해싱)
    - pytest 커버리지 목표: 서비스 로직 > 80%, API 엔드포인트 > 70%
    - `pytest --cov=app` 실행 및 커버리지 리포트 확인
  - [ ] 7.3 통합 테스트 작성
    - 모바일 통합 테스트: 노트 생성 → 검색 → 동기화 플로우
    - 백엔드 통합 테스트: 동기화 Push → Pull → 추천 API 플로우
    - 충돌 해결 시나리오 테스트: 동일 노트 동시 수정
    - `backend/tests/test_integration/` 디렉토리 생성
  - [ ] 7.4 E2E 테스트 설정 (Detox - 선택적)
    - Detox 설정 (Android Emulator)
    - 주요 사용자 플로우 E2E 테스트
      - 노트 생성 → 상세 보기 → 편집 → 삭제
      - 검색 → 결과 클릭 → 상세 보기
      - 오프라인 → 노트 생성 → 온라인 → 동기화 확인
    - `e2e/firstTest.e2e.ts` 작성
  - [ ] 7.5 성능 테스트
    - 모바일: 10,000개 노트 로드 시 검색 속도 측정 (목표: P95 < 150ms)
    - 모바일: 앱 콜드 스타트 시간 측정 (목표: < 2초)
    - 백엔드: Locust를 사용한 부하 테스트 (동시 100명 사용자)
    - 임베딩 생성 시간 측정 (목표: < 1초/노트)
    - `locustfile.py` 작성
  - [ ] 7.6 코드 품질 검증
    - ESLint 실행: `npm run lint` (모바일)
    - Prettier 포맷팅 확인
    - TypeScript 컴파일 에러 확인: `tsc --noEmit`
    - Python Flake8 또는 Ruff 실행 (백엔드)
  - [ ] 7.7 보안 검토
    - JWT 토큰 만료 시간 확인 (Access: 1시간, Refresh: 30일)
    - HTTPS 강제 설정 확인
    - 환경 변수 보안 확인 (`.env`는 `.gitignore`에 추가)
    - 로컬 토큰 저장소 보안 확인 (react-native-keychain 사용)
  - [ ] 7.8 최종 통합 검증
    - 모바일 앱 + 백엔드 로컬 환경 통합 실행
    - 전체 플로우 수동 테스트: 노트 작성 → 동기화 → AI 추천 확인 → 주간 리포트 확인
    - 오프라인 → 온라인 전환 시나리오 검증
    - 동기화 충돌 시나리오 검증
  - [ ] 7.9 문서화
    - README.md 작성 (프로젝트 개요, 설치 방법, 실행 방법)
    - API 문서 자동 생성 (FastAPI Swagger UI)
    - 모바일 컴포넌트 스토리북 (선택적)
    - 배포 가이드 작성 (Expo EAS Build, Docker 배포)

---

## Estimated Effort

각 Phase별 예상 작업 시간 (풀스택 개발자 기준):

- **Phase 1 (프로젝트 초기 설정)**: 1-2일
- **Phase 2 (로컬 DB 및 오프라인)**: 3-4일
- **Phase 3 (UI/UX 및 화면)**: 4-5일
- **Phase 4 (백엔드 인프라)**: 2-3일
- **Phase 5 (AI 기능)**: 3-4일
- **Phase 6 (동기화 프로토콜)**: 4-5일
- **Phase 7 (테스트 및 품질)**: 3-4일

**총 예상 시간**: 20-27일 (약 4-5주)

---

## Success Criteria

M1(첫 출시) 완료 조건:

✅ **기능 완성도**
- [ ] 노트 CRUD 100% 오프라인 동작
- [ ] FTS5 검색 < 150ms (P95)
- [ ] 동기화 성공률 > 99%
- [ ] AI 추천 API < 500ms
- [ ] 주간 리포트 생성 완료

✅ **품질 지표**
- [ ] 모바일 단위 테스트 커버리지 > 80%
- [ ] 백엔드 단위 테스트 커버리지 > 80%
- [ ] E2E 테스트 주요 플로우 통과
- [ ] 크래시율 < 0.3% (베타 테스트)

✅ **성능 목표**
- [ ] 앱 콜드 스타트 < 2초
- [ ] 노트 저장 < 1초 (P95)
- [ ] 검색 < 150ms (P95)
- [ ] 동기화 완료 < 10초 (100개 노트 기준)

---

**작업 목록이 생성되었습니다!**

이제 각 Task를 순차적으로 진행하면서 Synapse MVP를 구축할 수 있습니다. 🚀
