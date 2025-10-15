# Synapse(시냅스) — 모바일 MVP 사양서 v3.1 (완전판)

본 문서는 Synapse MVP 구현에 필요한 모든 기술적 세부사항을 포함한 완전판 사양서입니다.

**Synapse**: 뇌의 신경세포를 연결하는 시냅스처럼, 당신의 생각과 아이디어를 자연스럽게 연결하는 지능형 노트 앱

---

## 목차
1. [제품 개요](#1-제품-개요)
2. [사용자 시나리오](#2-사용자-시나리오-핵심-흐름)
3. [범위](#3-범위-mvp)
4. [아키텍처](#4-아키텍처)
5. [데이터 모델](#5-데이터-모델-상세)
6. [동기화 프로토콜](#6-동기화-프로토콜-상세)
7. [서버 기능 사양](#7-서버-기능-사양-분석추천)
8. [모바일 앱 UX 사양](#8-모바일-앱-ux-사양)
9. [API 명세](#9-api-명세)
10. [비기능 요구사항](#10-비기능-요구사항)
11. [기술 스택](#11-기술-스택-상세)
12. [보안/프라이버시](#12-보안프라이버시백업)
13. [테스트 전략](#13-테스트-전략)
14. [모니터링/로깅](#14-모니터링로깅)
15. [배포 전략](#15-배포-전략)
16. [로드맵](#16-로드맵)
17. [의사결정 기록](#17-의사결정-기록-adr)
18. [리스크 & 대응](#18-리스크--대응)
19. [성공 지표](#19-성공-지표)

---

## 1. 제품 개요

### 1.1 목표
**Synapse(시냅스)**는 뇌의 신경세포를 연결하는 시냅스처럼, 생각/단어/문장 등 어떤 길이든 즉시 기록하고, **오프라인에서도** 검색·정리·연결을 수행합니다. 온라인 시 AI가 의미적 연결을 발견하고 리포트를 생성하여, 마치 두뇌의 신경망처럼 당신의 아이디어를 자연스럽게 연결합니다.

### 1.2 핵심 가치
- ⚡ **빠른 캡처**: 아이디어를 1초 내에 저장 (시냅스처럼 즉각 반응)
- 🔍 **로컬 즉시 검색**: 네트워크 없이도 전체 본문 검색
- 🔗 **지능적 연결**: AI가 제안하는 의미적 관련 노트 (신경망 시뮬레이션)
- 📊 **하루 1분 회고**: 간단한 회고로 생각의 패턴 발견

### 1.3 제품명 의미
**Synapse(시냅스)**: 뇌에서 신경세포 간 정보를 전달하는 연결점. 이 앱은 사용자의 생각들을 자동으로 연결하여 새로운 통찰을 만들어냅니다.

### 1.4 플랫폼
- **MVP**: Android (SDK 24+)
- **클라이언트**: React Native (Expo SDK 52+)
- **향후 확장**: iOS (M3)

### 1.5 데이터 원칙
- **단일 타입 노트**: 제목 없이 본문(body)만 존재
- **표시 전략**: 첫 줄을 제목처럼 표시 (최대 50자)
- **Offline-first**: 로컬 SQLite가 단일 진실 공급원(Single Source of Truth)
- **서버 역할**: 분석, 추천, 백업, 동기화 조정

---

## 2. 사용자 시나리오 (핵심 흐름)

### 2.1 캡처 플로우
```
[앱 열기] → [입력창 포커스] → [생각 입력] → [저장 버튼]
└─ 옵션: 중요도 선택(1~3), URL 첨부, 이미지 첨부
└─ 저장 시간: 평균 0.8초
```

### 2.2 검색 플로우
```
[검색 탭] → [키워드 입력] → [실시간 결과 표시]
└─ FTS5 기반 본문 전체 검색
└─ 오프라인 100% 동작
└─ 응답 시간: <150ms (P95)
```

### 2.3 연결 보기 플로우
```
[노트 상세] → [관련 노트 섹션] → [추천 노트 클릭]
└─ 온라인: 서버 AI 추천 (임베딩 기반)
└─ 오프라인: 로컬 키워드 유사도 대체
```

### 2.4 회고 플로우
```
[회고 탭] → [오늘의 한 줄 입력] → [주간 키워드 확인] → [리포트 카드 보기]
└─ 일일 회고: 간단한 문장 1개
└─ 주간 리포트: 서버 생성, 로컬 캐시
```

### 2.5 동기화 플로우
```
[앱 재개/수동 버튼] → [변경 로그 업로드] → [서버 델타 수신] → [로컬 반영]
└─ 배치 크기: 최대 100개 또는 1MB
└─ 충돌 해결: LWW (Last-Write-Wins)
```

---

## 3. 범위 (MVP)

### 3.1 포함 기능
✅ **핵심**
- 노트 CRUD (생성, 읽기, 수정, 삭제)
- 중요도 설정 (1: 낮음, 2: 보통, 3: 높음)
- URL 첨부 (메타데이터 추출 옵션)
- 이미지 첨부 (1장, 로컬 저장)

✅ **검색**
- 본문 전체 검색 (FTS5)
- 검색어 하이라이팅
- 최근 검색어 히스토리 (최대 20개)

✅ **연결**
- 수동 연결 생성 (노트 A ↔ 노트 B)
- 연결 관계 설명 (짧은 텍스트)
- AI 추천 관련 노트 (온라인 시)
- 로컬 대체 추천 (오프라인 시)

✅ **회고**
- 일일 회고 입력 (1개)
- 주간 핵심 키워드 (상위 3개)
- 주간 리포트 카드 (서버 생성, 캐시)

✅ **동기화**
- 배치 업로드/다운로드
- LWW 충돌 해결
- 재시도 메커니즘

### 3.2 제외 기능 (차기 버전)
❌ 인터랙티브 그래프 캔버스
❌ 음성 입력/STT
❌ 문서 스캔/OCR
❌ 자동 번역
❌ 다중 사용자/협업
❌ 종단간 암호화 (E2EE)
❌ 로컬 데이터베이스 암호화

---

## 4. 아키텍처

### 4.1 전체 구조
```
┌─────────────────────────────────────────┐
│         모바일 앱 (React Native)         │
│  ┌────────────┐  ┌──────────────────┐   │
│  │  UI Layer  │  │  State Manager   │   │
│  │ (RN 컴포넌트)│  │    (Zustand)     │   │
│  └────────────┘  └──────────────────┘   │
│         │                 │              │
│  ┌──────▼─────────────────▼──────────┐  │
│  │      Business Logic Layer         │  │
│  │ (동기화, 검색, 연결 관리)           │  │
│  └──────┬─────────────────┬──────────┘  │
│         │                 │              │
│  ┌──────▼────────┐  ┌────▼──────────┐   │
│  │ SQLite+FTS5   │  │ Network Layer │   │
│  │ (로컬 DB)     │  │    (Axios)    │   │
│  └───────────────┘  └────┬──────────┘   │
└──────────────────────────┼──────────────┘
                           │ HTTPS
              ┌────────────▼────────────┐
              │   Python 백엔드         │
              │   (FastAPI)            │
              │  ┌──────────────────┐  │
              │  │ 동기화 엔드포인트 │  │
              │  │ 추천 엔진          │  │
              │  │ 리포트 생성기      │  │
              │  └────┬─────────────┘  │
              │       │                │
              │  ┌────▼─────────────┐  │
              │  │ PostgreSQL       │  │
              │  │ + pgvector       │  │
              │  └──────────────────┘  │
              └─────────────────────────┘
```

### 4.2 데이터 흐름
```
[사용자 입력] 
    → [로컬 DB 저장] 
    → [change_log 기록] 
    → [네트워크 가용 대기]
    → [배치 업로드]
    → [서버 처리 (임베딩, 키워드 추출)]
    → [응답 수신]
    → [로컬 DB 업데이트]
```

### 4.3 오프라인 우선 전략
- **읽기**: 100% 로컬 데이터 사용
- **쓰기**: 로컬 커밋 → 큐잉 → 나중에 동기화
- **AI 기능**: 온라인 필요, 오프라인 시 로컬 대체

---

## 5. 데이터 모델 (상세)

### 5.1 데이터 타입 규약
- **UUID**: UUIDv7 사용 (시간순 정렬 가능, B-tree 인덱스 효율)
- **Timestamp**: Unix timestamp (밀리초), UTC 기준
- **Text**: UTF-8 인코딩
- **Boolean**: SQLite INTEGER (0/1)

### 5.2 SQLite 스키마

#### 5.2.1 notes 테이블
```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY NOT NULL,  -- UUIDv7
  body TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 2,  -- 1: 낮음, 2: 보통, 3: 높음
  source_url TEXT,  -- 옵션
  image_path TEXT,  -- 로컬 파일 경로 (예: file:///data/user/0/.../images/abc123.jpg)
  created_at INTEGER NOT NULL,  -- Unix timestamp (ms)
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,  -- Soft delete (NULL = 활성)
  
  CHECK (importance BETWEEN 1 AND 3),
  CHECK (length(body) > 0)
);

CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX idx_notes_importance ON notes(importance) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_deleted ON notes(deleted_at) WHERE deleted_at IS NOT NULL;
```

#### 5.2.2 FTS5 검색 테이블
```sql
-- 가상 테이블 (FTS5)
CREATE VIRTUAL TABLE notes_fts USING fts5(
  body,
  content='notes',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

-- 트리거: notes 변경 시 FTS5 동기화
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, body) VALUES (new.rowid, new.body);
END;

CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
  DELETE FROM notes_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
  UPDATE notes_fts SET body = new.body WHERE rowid = old.rowid;
END;
```

#### 5.2.3 keywords 테이블
```sql
CREATE TABLE keywords (
  id TEXT PRIMARY KEY NOT NULL,  -- UUIDv7
  name TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_keywords_name ON keywords(name COLLATE NOCASE);
```

#### 5.2.4 note_keywords 테이블
```sql
CREATE TABLE note_keywords (
  note_id TEXT NOT NULL,
  keyword_id TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,  -- 0.0 ~ 1.0
  source TEXT NOT NULL,  -- 'server' or 'user'
  created_at INTEGER NOT NULL,
  
  PRIMARY KEY (note_id, keyword_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
  CHECK (weight BETWEEN 0.0 AND 1.0)
);

CREATE INDEX idx_note_keywords_keyword ON note_keywords(keyword_id);
CREATE INDEX idx_note_keywords_weight ON note_keywords(weight DESC);
```

#### 5.2.5 relations 테이블
```sql
CREATE TABLE relations (
  id TEXT PRIMARY KEY NOT NULL,  -- UUIDv7
  from_note_id TEXT NOT NULL,
  to_note_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'related',  -- 'related', 'contradicts', 'elaborates'
  rationale TEXT,  -- 연결 이유 (짧은 텍스트)
  source TEXT NOT NULL,  -- 'user' or 'ai'
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (from_note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_note_id) REFERENCES notes(id) ON DELETE CASCADE,
  CHECK (from_note_id != to_note_id),
  UNIQUE (from_note_id, to_note_id)
);

CREATE INDEX idx_relations_from ON relations(from_note_id);
CREATE INDEX idx_relations_to ON relations(to_note_id);
CREATE INDEX idx_relations_source ON relations(source);
```

#### 5.2.6 reflections 테이블 (회고)
```sql
CREATE TABLE reflections (
  id TEXT PRIMARY KEY NOT NULL,  -- UUIDv7
  content TEXT NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  UNIQUE (date)
);

CREATE INDEX idx_reflections_date ON reflections(date DESC);
```

#### 5.2.7 weekly_reports 테이블
```sql
CREATE TABLE weekly_reports (
  id TEXT PRIMARY KEY NOT NULL,  -- UUIDv7
  week_key TEXT NOT NULL,  -- YYYY-WW (예: 2025-42)
  summary TEXT,  -- JSON 형태의 요약 데이터
  top_keywords TEXT,  -- JSON array
  created_at INTEGER NOT NULL,
  
  UNIQUE (week_key)
);

CREATE INDEX idx_weekly_reports_week ON weekly_reports(week_key DESC);
```

#### 5.2.8 change_log 테이블
```sql
CREATE TABLE change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'note', 'relation', 'keyword', 'reflection'
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,  -- 'insert', 'update', 'delete'
  payload TEXT,  -- JSON 형태의 변경 데이터
  client_timestamp INTEGER NOT NULL,  -- 클라이언트 기록 시각
  synced_at INTEGER,  -- NULL = 미동기화
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  
  CHECK (operation IN ('insert', 'update', 'delete')),
  CHECK (entity_type IN ('note', 'relation', 'keyword', 'reflection'))
);

CREATE INDEX idx_change_log_sync_pending ON change_log(synced_at, created_at) 
  WHERE synced_at IS NULL;
CREATE INDEX idx_change_log_entity ON change_log(entity_type, entity_id);
```

#### 5.2.9 sync_state 테이블
```sql
CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 초기 데이터
INSERT INTO sync_state (key, value, updated_at) VALUES
  ('last_sync_at', '0', 0),
  ('checkpoint', '0', 0),
  ('device_id', '', 0);
```

#### 5.2.10 search_history 테이블
```sql
CREATE TABLE search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  searched_at INTEGER NOT NULL
);

CREATE INDEX idx_search_history_searched ON search_history(searched_at DESC);
```

### 5.3 SQLite 설정 (PRAGMA)
```sql
-- 앱 시작 시 실행
PRAGMA journal_mode = WAL;              -- Write-Ahead Logging (동시성 향상)
PRAGMA synchronous = NORMAL;            -- 성능/안정성 균형
PRAGMA foreign_keys = ON;               -- 외래키 강제
PRAGMA cache_size = -64000;             -- 64MB 캐시
PRAGMA temp_store = MEMORY;             -- 임시 테이블 메모리 사용
PRAGMA mmap_size = 268435456;           -- 256MB 메모리 매핑
PRAGMA page_size = 4096;                -- 4KB 페이지 크기
```

#### 5.2.3 이미지 저장 전략
- **로컬**: 앱 내부 저장소 (`/data/user/0/{package}/files/images/`)
- **파일명**: `{UUIDv7}.jpg`
- **최대 크기**: 2MB (자동 리사이징)
- **서버 업로드**: 별도 엔드포인트 (`POST /upload/image`)
- **서버 저장**: S3 호환 스토리지 (Cloudflare R2 권장)
- **동기화**: URL만 동기화 (바이너리 X)

---

## 6. 동기화 프로토콜 (상세)

### 6.1 동기화 개념
```
┌─────────────┐                    ┌─────────────┐
│   모바일    │                    │    서버     │
│             │                    │             │
│ [로컬 DB]   │                    │ [Postgres]  │
│     │       │                    │             │
│     ▼       │                    │             │
│ [변경 로그] │──── Push ───────▶  │ [처리 로직] │
│             │                    │     │       │
│             │ ◀──── Pull ────────│     ▼       │
│ [로컬 반영] │                    │ [델타 생성] │
└─────────────┘                    └─────────────┘
```

### 6.2 동기화 트리거
1. **자동 트리거**
   - 앱 포그라운드 진입 시
   - 네트워크 연결 복구 시 (오프라인 → 온라인)
   - 백그라운드 주기 (30분, OS 정책에 따라 변동)

2. **수동 트리거**
   - 사용자가 동기화 버튼 클릭
   - 설정 화면에서 즉시 동기화 요청

### 6.3 Push 프로세스

#### 6.3.1 배치 구성
```typescript
interface SyncBatch {
  device_id: string;
  checkpoint: number;  // 마지막 성공한 체크포인트
  changes: ChangeLogEntry[];
}

interface ChangeLogEntry {
  id: number;  // 로컬 change_log.id
  entity_type: 'note' | 'relation' | 'keyword' | 'reflection';
  entity_id: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, any>;  // 엔터티 데이터
  client_timestamp: number;
}
```

#### 6.3.2 배치 제약
- **최대 레코드 수**: 100개
- **최대 크기**: 1MB
- **타임아웃**: 연결 10초, 읽기 30초

#### 6.3.3 Push 알고리즘
```
1. 로컬 DB에서 synced_at IS NULL인 변경 로그 조회
2. 최대 100개까지 선택 (created_at ASC)
3. 총 크기가 1MB 미만이 되도록 자르기
4. JSON 직렬화
5. POST /sync/push 요청
6. 응답 처리:
   - 성공: 해당 로그에 synced_at 업데이트
   - 부분 실패: 성공한 로그만 synced_at 업데이트
   - 전체 실패: retry_count 증가, last_error 저장
7. 미동기화 로그가 남아있으면 1로 돌아가기
```

### 6.4 Pull 프로세스

#### 6.4.1 델타 요청
```typescript
interface PullRequest {
  device_id: string;
  checkpoint: number;  // 클라이언트가 가진 마지막 체크포인트
}

interface PullResponse {
  new_checkpoint: number;
  deltas: Delta[];
}

interface Delta {
  entity_type: string;
  entity_id: string;
  operation: 'upsert' | 'delete';
  data: Record<string, any>;
  server_timestamp: number;
}
```

#### 6.4.2 Pull 알고리즘
```
1. 로컬 체크포인트 조회 (sync_state.checkpoint)
2. POST /sync/pull 요청
3. 델타 수신
4. 각 델타에 대해:
   - upsert: 로컬 레코드와 비교 후 최신 것 유지 (LWW)
   - delete: 로컬 레코드 삭제 (또는 deleted_at 설정)
5. new_checkpoint를 sync_state에 저장
6. 트랜잭션 커밋
```

### 6.5 충돌 해결 (LWW - Last-Write-Wins)

#### 6.5.1 비교 기준
```typescript
function shouldUpdate(local: Entity, remote: Entity): boolean {
  // 1차: updated_at 비교
  if (remote.updated_at > local.updated_at) {
    return true;
  }
  if (remote.updated_at < local.updated_at) {
    return false;
  }
  
  // 2차: server_timestamp 비교 (동일 updated_at인 경우)
  if (remote.server_timestamp > local.server_timestamp) {
    return true;
  }
  
  // 3차: entity_id 사전순 (최후의 결정적 비교)
  return remote.id > local.id;
}
```

#### 6.5.2 충돌 로깅
```sql
CREATE TABLE conflict_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  local_data TEXT,  -- JSON
  remote_data TEXT,  -- JSON
  resolution TEXT NOT NULL,  -- 'kept_local' or 'applied_remote'
  resolved_at INTEGER NOT NULL
);
```

### 6.6 재시도 전략

#### 6.6.1 지수 백오프
```typescript
function getRetryDelay(retryCount: number): number {
  const baseDelay = 1000;  // 1초
  const maxDelay = 60000;  // 60초
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  
  // 지터 추가 (±20%)
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.floor(delay + jitter);
}

const MAX_RETRY_COUNT = 5;
```

#### 6.6.2 재시도 대상
- 네트워크 오류 (타임아웃, 연결 실패)
- 서버 오류 (5xx)
- 일시적 오류 (429 Too Many Requests)

#### 6.6.3 재시도 불가 오류
- 인증 오류 (401, 403)
- 잘못된 요청 (400, 422)
- 서버가 명시적으로 거부 (409 Conflict, 410 Gone)

### 6.7 오프라인 큐 관리

#### 6.7.1 큐 제약
- **최대 큐 크기**: 10,000개
- **오래된 항목**: 30일 이상 미동기화 시 경고

#### 6.7.2 큐 우선순위
```sql
-- 우선순위 계산 (높을수록 먼저 동기화)
SELECT 
  *,
  (
    CASE entity_type
      WHEN 'note' THEN 10
      WHEN 'relation' THEN 5
      WHEN 'keyword' THEN 3
      WHEN 'reflection' THEN 8
    END +
    CASE 
      WHEN retry_count = 0 THEN 5
      ELSE 0
    END +
    CASE
      WHEN (strftime('%s', 'now') * 1000 - created_at) > 86400000 THEN 3  -- 1일 이상
      ELSE 0
    END
  ) AS priority
FROM change_log
WHERE synced_at IS NULL AND retry_count < 5
ORDER BY priority DESC, created_at ASC
LIMIT 100;
```

#### 6.7.3 메모리 압박 대응
```
IF 큐 크기 > 5,000:
  - 사용자에게 동기화 권장 알림 표시
  
IF 큐 크기 > 8,000:
  - 중요도 낮은 항목 임시 파일로 오프로드
  
IF 큐 크기 >= 10,000:
  - 새로운 변경 거부 (읽기 전용 모드)
  - 긴급 동기화 모달 표시
```

### 6.8 동기화 잠금
```sql
CREATE TABLE sync_lock (
  lock_id TEXT PRIMARY KEY DEFAULT 'singleton',
  locked_at INTEGER,
  locked_by TEXT,  -- 'push' or 'pull'
  
  CHECK (lock_id = 'singleton')
);

-- 잠금 획득
INSERT OR REPLACE INTO sync_lock (lock_id, locked_at, locked_by)
VALUES ('singleton', strftime('%s', 'now') * 1000, 'push');

-- 잠금 해제
DELETE FROM sync_lock WHERE lock_id = 'singleton';

-- 교착 방지: 5분 이상 된 잠금은 무효
```

---

## 7. 서버 기능 사양 (분석/추천)

### 7.1 임베딩 생성

#### 7.1.1 모델 선택
```python
# 추천 모델: intfloat/multilingual-e5-large
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('intfloat/multilingual-e5-large')
# 벡터 차원: 1024
# 한국어 지원: 우수
# 속도: ~0.3초/문장 (CPU), ~0.05초/문장 (GPU)
```

#### 7.1.2 전처리
```python
def preprocess_text(body: str) -> str:
    # 1. 최대 길이 제한 (512 토큰 ≈ 2000자)
    if len(body) > 2000:
        # 슬라이딩 윈도우로 분할 후 평균 임베딩
        body = body[:2000]
    
    # 2. URL 정규화
    body = re.sub(r'https?://\S+', '[URL]', body)
    
    # 3. 과도한 공백 제거
    body = re.sub(r'\s+', ' ', body).strip()
    
    return body
```

#### 7.1.3 짧은 메모 처리
```python
def augment_short_text(body: str) -> str:
    """단어 1~2개인 경우 문맥 보강"""
    if len(body.split()) <= 2:
        # 관련 노트에서 문맥 추출
        related_notes = get_related_notes_by_keywords(body)
        context = " ".join([n.body[:50] for n in related_notes[:3]])
        return f"{body}. {context}"
    return body
```

#### 7.1.4 배치 처리
```python
# 동기화 시 대량 임베딩 생성
def batch_embed_notes(notes: List[Note]) -> List[np.ndarray]:
    texts = [preprocess_text(note.body) for note in notes]
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True  # 코사인 유사도 최적화
    )
    return embeddings
```

### 7.2 관련 노트 추천

#### 7.2.1 유사도 스코어 계산
```python
def calculate_similarity_score(
    target_note: Note,
    candidate_note: Note,
    target_embedding: np.ndarray,
    candidate_embedding: np.ndarray
) -> float:
    # 1. 임베딩 코사인 유사도 (0.6 가중치)
    cos_sim = np.dot(target_embedding, candidate_embedding)
    
    # 2. 키워드 자카드 계수 (0.3 가중치)
    target_keywords = set(kw.name for kw in target_note.keywords)
    candidate_keywords = set(kw.name for kw in candidate_note.keywords)
    
    if not target_keywords or not candidate_keywords:
        jaccard = 0.0
    else:
        intersection = target_keywords & candidate_keywords
        union = target_keywords | candidate_keywords
        jaccard = len(intersection) / len(union)
    
    # 3. 시간 가중치 (0.1 가중치)
    days_diff = abs(
        (target_note.created_at - candidate_note.created_at) / 86400000
    )
    time_weight = math.exp(-days_diff / 30)  # 30일 반감기
    
    # 최종 스코어
    score = 0.6 * cos_sim + 0.3 * jaccard + 0.1 * time_weight
    return score
```

#### 7.2.2 후처리
```python
def post_process_recommendations(
    candidates: List[Tuple[Note, float]]
) -> List[RecommendationResult]:
    results = []
    seen_ids = set()
    
    for note, score in candidates:
        # 중복 제거
        if note.id in seen_ids:
            continue
        seen_ids.add(note.id)
        
        # 너무 낮은 스코어 필터링
        if score < 0.3:
            continue
        
        # 이유 생성
        reason = generate_recommendation_reason(note, score)
        
        results.append(RecommendationResult(
            note_id=note.id,
            score=score,
            reason=reason,
            preview=note.body[:100]
        ))
    
    return results[:10]  # 상위 10개
```

#### 7.2.3 추천 이유 생성
```python
def generate_recommendation_reason(note: Note, score: float) -> str:
    reasons = []
    
    # 키워드 매칭
    common_keywords = # ... 공통 키워드 추출
    if common_keywords:
        reasons.append(f"공통 키워드: {', '.join(common_keywords[:3])}")
    
    # 유사한 문구
    similar_phrases = # ... 형태소 분석 기반 유사 구문 추출
    if similar_phrases:
        reasons.append(f"유사 표현: \"{similar_phrases[0]}\"")
    
    # 시간적 근접성
    if # ... 같은 날짜:
        reasons.append("같은 날 작성됨")
    
    return " / ".join(reasons) if reasons else "의미적으로 유사함"
```

### 7.3 키워드 추출

#### 7.3.1 형태소 분석
```python
from kiwipiepy import Kiwi

kiwi = Kiwi()

def extract_keywords(body: str, top_k: int = 5) -> List[Tuple[str, float]]:
    # 1. 형태소 분석
    result = kiwi.analyze(body)
    
    # 2. 명사, 동사, 형용사 추출
    candidates = []
    for token in result[0][0]:
        if token.tag in ['NNG', 'NNP', 'VV', 'VA']:  # 일반명사, 고유명사, 동사, 형용사
            candidates.append(token.form)
    
    # 3. 빈도 계산
    freq = Counter(candidates)
    
    # 4. TF-IDF 스코어링 (문서 전체 통계 활용)
    scored = []
    for word, count in freq.items():
        if len(word) < 2:  # 1글자 제외
            continue
        
        tf = count / len(candidates)
        idf = get_idf_score(word)  # 전체 문서 역빈도
        score = tf * idf
        scored.append((word, score))
    
    # 5. 상위 K개 반환
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]
```

#### 7.3.2 사용자 스톱워드
```python
# 기본 스톱워드
STOPWORDS = {
    '것', '수', '등', '및', '또는', '그리고', '하지만', '그러나',
    '때문', '위해', '통해', '대한', '관련', '같은', '있는', '없는'
}

# 사용자별 스톱워드 (향후 확장)
def get_user_stopwords(user_id: str) -> Set[str]:
    # DB에서 조회
    return set()
```

### 7.4 주간 리포트 생성

#### 7.4.1 클러스터링
```python
from sklearn.cluster import KMeans

def generate_weekly_report(week_key: str, user_id: str) -> WeeklyReport:
    # 1. 주간 노트 조회
    notes = get_notes_for_week(week_key, user_id)
    
    if len(notes) < 3:
        return WeeklyReport(
            week_key=week_key,
            summary="이번 주는 기록이 부족합니다.",
            clusters=[],
            top_keywords=[]
        )
    
    # 2. 임베딩 가져오기
    embeddings = np.array([note.embedding for note in notes])
    
    # 3. 클러스터링 (k=3~5)
    k = min(5, max(3, len(notes) // 5))
    kmeans = KMeans(n_clusters=k, random_state=42)
    labels = kmeans.fit_predict(embeddings)
    
    # 4. 클러스터별 대표 문장 추출
    clusters = []
    for i in range(k):
        cluster_notes = [n for n, l in zip(notes, labels) if l == i]
        
        # 중심에 가장 가까운 노트 찾기
        cluster_embeddings = embeddings[labels == i]
        center = kmeans.cluster_centers_[i]
        distances = np.linalg.norm(cluster_embeddings - center, axis=1)
        representative_idx = np.argmin(distances)
        representative_note = cluster_notes[representative_idx]
        
        # 클러스터 키워드 추출
        all_text = " ".join(n.body for n in cluster_notes)
        cluster_keywords = extract_keywords(all_text, top_k=3)
        
        clusters.append(ClusterSummary(
            id=i,
            size=len(cluster_notes),
            representative_text=representative_note.body[:100],
            keywords=[kw for kw, _ in cluster_keywords]
        ))
    
    # 5. 전체 키워드 집계
    all_keywords = []
    for note in notes:
        all_keywords.extend(kw.name for kw in note.keywords)
    top_keywords = Counter(all_keywords).most_common(10)
    
    # 6. 신규/반복 키워드 구분
    prev_week_keywords = get_keywords_for_week(get_previous_week(week_key), user_id)
    new_keywords = [kw for kw, _ in top_keywords if kw not in prev_week_keywords]
    
    # 7. 잠재 연결 제안
    potential_connections = suggest_potential_connections(notes, embeddings)
    
    return WeeklyReport(
        week_key=week_key,
        summary=generate_summary_text(clusters),
        clusters=clusters,
        top_keywords=[kw for kw, _ in top_keywords[:3]],
        new_keywords=new_keywords[:3],
        potential_connections=potential_connections[:3]
    )
```

#### 7.4.2 요약 텍스트 생성
```python
def generate_summary_text(clusters: List[ClusterSummary]) -> str:
    parts = [f"이번 주 {len(clusters)}개 주제로 생각을 정리했습니다."]
    
    for i, cluster in enumerate(clusters, 1):
        keywords_str = ", ".join(cluster.keywords)
        parts.append(
            f"{i}. {keywords_str} 관련 ({cluster.size}개 노트)"
        )
    
    return "\n".join(parts)
```

### 7.5 API 캐싱 전략
```python
from functools import lru_cache
import redis

# Redis 캐시 (선택사항)
redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_recommendations_cached(note_id: str, k: int = 10) -> List[RecommendationResult]:
    cache_key = f"rec:{note_id}:{k}"
    
    # 캐시 조회 (TTL: 1시간)
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # 캐시 미스: 계산
    recommendations = calculate_recommendations(note_id, k)
    
    # 캐시 저장
    redis_client.setex(
        cache_key,
        3600,  # 1시간
        json.dumps([r.dict() for r in recommendations])
    )
    
    return recommendations
```

---

## 8. 모바일 앱 UX 사양

### 8.1 화면 구조
```
┌─────────────────────────────────┐
│  [홈] [검색] [회고] [설정]       │  ← 하단 탭 바
└─────────────────────────────────┘
```

### 8.2 홈 탭

#### 8.2.1 레이아웃
```
┌─────────────────────────────────┐
│  [입력창 (다중 라인)]            │ ← 포커스 상태
│  ...                            │
│  [저장] [취소]                   │
├─────────────────────────────────┤
│  중요도: [1] [2] [3]             │ ← 옵션 영역 (접기/펼치기)
│  [URL 첨부] [이미지 첨부]        │
├─────────────────────────────────┤
│  오늘의 노트 (3)                 │
│  ┌───────────────────────────┐  │
│  │ 첫 줄 미리보기...         │  │
│  │ 2분 전 · 중요도 ★★        │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 또 다른 생각...           │  │
│  │ 1시간 전 · 연결 2개       │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  [전체 노트 보기]                │
└─────────────────────────────────┘
```

#### 8.2.2 입력창 동작
- 기본 높이: 3줄
- 자동 확장: 최대 10줄
- 엔터 입력: 줄바꿈 (저장 아님)
- 저장 버튼: 명시적 클릭
- 저장 시간: 평균 0.8초

#### 8.2.3 옵션 UI
```typescript
// 중요도 선택
<SegmentedControl
  options={[
    { label: '낮음', value: 1 },
    { label: '보통', value: 2 },
    { label: '높음', value: 3 }
  ]}
  defaultValue={2}
/>

// URL 첨부
<TextInput
  placeholder="관련 링크 (선택)"
  keyboardType="url"
/>

// 이미지 첨부
<Button onPress={pickImage}>
  {image ? '이미지 변경' : '이미지 추가'}
</Button>
```

### 8.3 노트 상세 화면

#### 8.3.1 레이아웃
```
┌─────────────────────────────────┐
│  [← 뒤로]           [편집] [···] │ ← 헤더
├─────────────────────────────────┤
│  본문 내용                       │
│  ...                            │
│  ...                            │
├─────────────────────────────────┤
│  중요도: ★★★                     │
│  생성: 2025-10-14 14:23         │
│  수정: 2025-10-14 15:10         │
├─────────────────────────────────┤
│  키워드                          │
│  [인공지능] [프로그래밍] [Python] │
├─────────────────────────────────┤
│  수동 연결 (2)                   │
│  ┌───────────────────────────┐  │
│  │ → RAG 시스템 구현 방법    │  │
│  │   "이 개념을 적용한 예시" │  │
│  └───────────────────────────┘  │
│  [+ 연결 추가]                   │
├─────────────────────────────────┤
│  관련 노트 추천 (AI)             │
│  ┌───────────────────────────┐  │
│  │ LangChain 튜토리얼        │  │
│  │ 공통: Python, RAG         │  │
│  │ 유사도: 0.87              │  │
│  └───────────────────────────┘  │
│  ...                            │
└─────────────────────────────────┘
```

#### 8.3.2 편집 모드
- 본문 수정 가능
- 중요도 변경 가능
- URL, 이미지 수정 가능
- 저장 시 updated_at 갱신
- 변경 로그 자동 생성

#### 8.3.3 연결 추가 플로우
```
[+ 연결 추가] 클릭
  → [검색 모달 열림]
  → [노트 검색/선택]
  → [관계 설명 입력 (짧은 텍스트)]
  → [저장]
  → [relations 테이블에 삽입]
  → [상세 화면에 표시]
```

### 8.4 검색 탭

#### 8.4.1 레이아웃
```
┌─────────────────────────────────┐
│  [검색어 입력]              [×]  │ ← 검색창
├─────────────────────────────────┤
│  최근 검색어                     │
│  Python (5분 전)                │
│  RAG 시스템 (1시간 전)          │
│  ...                            │
├─────────────────────────────────┤
│  검색 결과 (23)                  │
│  ┌───────────────────────────┐  │
│  │ ...파이썬으로 RAG 시스템...│  │ ← 하이라이팅
│  │ 2일 전 · 중요도 ★★★       │  │
│  └───────────────────────────┘  │
│  ...                            │
└─────────────────────────────────┘
```

#### 8.4.2 검색 알고리즘
```sql
-- FTS5 쿼리
SELECT 
  n.id,
  n.body,
  n.importance,
  n.created_at,
  snippet(notes_fts, 0, '**', '**', '...', 10) AS snippet
FROM notes n
JOIN notes_fts ON notes_fts.rowid = n.rowid
WHERE notes_fts MATCH ?
  AND n.deleted_at IS NULL
ORDER BY rank, n.importance DESC, n.created_at DESC
LIMIT 50;
```

#### 8.4.3 하이라이팅
```typescript
function highlightText(text: string, query: string): ReactNode {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) 
      ? <Text key={i} style={styles.highlight}>{part}</Text>
      : <Text key={i}>{part}</Text>
  );
}
```

### 8.5 회고 탭

#### 8.5.1 레이아웃
```
┌─────────────────────────────────┐
│  오늘의 한 줄 (2025-10-14)       │
│  ┌───────────────────────────┐  │
│  │ [입력창]                  │  │
│  │ 오늘 하루를 한 줄로...    │  │
│  └───────────────────────────┘  │
│  [저장]                         │
├─────────────────────────────────┤
│  이번 주 핵심 키워드              │
│  [Python: 15회] [RAG: 12회]     │
│  [FastAPI: 8회]                 │
├─────────────────────────────────┤
│  주간 리포트 (42주차)            │
│  ┌───────────────────────────┐  │
│  │ 이번 주 3개 주제로        │  │
│  │ 생각을 정리했습니다.      │  │
│  │                           │  │
│  │ 1. Python, RAG 관련 (8개) │  │
│  │ 2. 백엔드 개발 (5개)      │  │
│  │ 3. 데이터베이스 (3개)     │  │
│  │                           │  │
│  │ 신규 키워드: pgvector     │  │
│  └───────────────────────────┘  │
│  [자세히 보기]                   │
└─────────────────────────────────┘
```

#### 8.5.2 주간 리포트 상세
```
┌─────────────────────────────────┐
│  42주차 리포트 (10/7 ~ 10/13)    │
├─────────────────────────────────┤
│  주제 1: Python, RAG 관련 (8개)  │
│  "파이썬으로 RAG 시스템을..."    │ ← 대표 문장
│  키워드: Python, RAG, LangChain  │
│  ┌───────────────────────────┐  │
│  │ [관련 노트 보기]          │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  신규 키워드                     │
│  pgvector, FastAPI, Embedding   │
├─────────────────────────────────┤
│  잠재 연결 제안                  │
│  • "RAG 시스템 구현" ↔           │
│    "FastAPI 백엔드 설계"         │
│    → 함께 보면 좋은 노트입니다   │
│  ...                            │
└─────────────────────────────────┘
```

### 8.6 설정 탭

#### 8.6.1 레이아웃
```
┌─────────────────────────────────┐
│  동기화                          │
│  마지막 동기화: 5분 전           │
│  [지금 동기화]                   │
│  └ 자동 동기화: [ON]             │
├─────────────────────────────────┤
│  백업                            │
│  [JSON 내보내기]                 │
│  [클라우드 백업 설정]            │
├─────────────────────────────────┤
│  표시                            │
│  다크 모드: [자동]               │
│  글꼴 크기: [보통]               │
├─────────────────────────────────┤
│  정보                            │
│  버전: 1.0.0 (빌드 123)          │
│  로컬 노트: 1,234개              │
│  저장소 사용: 12.3 MB            │
│  [로그 보기]                     │
└─────────────────────────────────┘
```

#### 8.6.2 동기화 피드백
```typescript
// 동기화 상태 표시
enum SyncStatus {
  IDLE = 'idle',           // 대기 중
  SYNCING = 'syncing',     // 동기화 중
  SUCCESS = 'success',     // 성공
  ERROR = 'error'          // 오류
}

// 토스트 메시지
function showSyncStatus(status: SyncStatus, details?: string) {
  switch (status) {
    case SyncStatus.SYNCING:
      return '동기화 중...';
    case SyncStatus.SUCCESS:
      return `동기화 완료 (${details})`;
    case SyncStatus.ERROR:
      return `동기화 실패: ${details}`;
  }
}
```

### 8.7 오프라인 표시

#### 8.7.1 오프라인 배너
```
┌─────────────────────────────────┐
│  [!] 오프라인 모드               │ ← 상단 고정 배너
│  변경 사항은 나중에 동기화됩니다.│
└─────────────────────────────────┘
```

#### 8.7.2 미동기화 표시
```
노트 카드 우측 상단에 점(dot) 표시:
┌───────────────────────────────┐
│ 파이썬 RAG 시스템...       🔴 │ ← 미동기화
│ 5분 전 · 중요도 ★★★          │
└───────────────────────────────┘
```

### 8.8 로딩 상태

#### 8.8.1 Skeleton UI
```typescript
<SkeletonPlaceholder>
  <SkeletonPlaceholder.Item flexDirection="row">
    <SkeletonPlaceholder.Item width={60} height={60} borderRadius={4} />
    <SkeletonPlaceholder.Item marginLeft={20}>
      <SkeletonPlaceholder.Item width={120} height={20} />
      <SkeletonPlaceholder.Item marginTop={6} width={80} height={14} />
    </SkeletonPlaceholder.Item>
  </SkeletonPlaceholder.Item>
</SkeletonPlaceholder>
```

#### 8.8.2 진행률 표시
```
긴 작업 (>2초):
┌─────────────────────────────────┐
│  동기화 중...                    │
│  [████████░░░░░░░░] 52%          │
│  123 / 237 항목 처리됨           │
└─────────────────────────────────┘
```

### 8.9 에러 처리

#### 8.9.1 에러 메시지
```typescript
// 사용자 친화적 메시지
const ERROR_MESSAGES = {
  NETWORK_ERROR: '인터넷 연결을 확인해주세요.',
  AUTH_ERROR: '로그인이 필요합니다.',
  SYNC_ERROR: '동기화 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  STORAGE_FULL: '저장 공간이 부족합니다.',
  UNKNOWN_ERROR: '예상치 못한 오류가 발생했습니다.'
};

// 개발자 모드
if (__DEV__) {
  console.error('Detailed error:', error);
  // 상세 에러 모달 표시
}
```

#### 8.9.2 재시도 UI
```
┌─────────────────────────────────┐
│  ⚠️ 동기화 실패                  │
│  네트워크 연결을 확인해주세요.   │
│                                 │
│  [다시 시도]  [나중에]           │
└─────────────────────────────────┘
```

---

## 9. API 명세

### 9.1 인증

#### 9.1.1 토큰 발급
```
POST /auth/login

Request:
{
  "email": "user@example.com",
  "password": "password123",
  "device_id": "550e8400-e29b-41d4-a716-446655440000"
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": 1697123456789,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}

Error: 401 Unauthorized
{
  "error": "INVALID_CREDENTIALS",
  "message": "이메일 또는 비밀번호가 올바르지 않습니다."
}
```

#### 9.1.2 토큰 갱신
```
POST /auth/refresh

Request:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": 1697127056789
}
```

### 9.2 동기화

#### 9.2.1 Push
```
POST /sync/push

Headers:
Authorization: Bearer {access_token}

Request:
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "checkpoint": 1697120000000,
  "changes": [
    {
      "id": 123,
      "entity_type": "note",
      "entity_id": "note-uuid-1",
      "operation": "insert",
      "payload": {
        "id": "note-uuid-1",
        "body": "파이썬으로 RAG 시스템 구현하기",
        "importance": 3,
        "created_at": 1697120123456,
        "updated_at": 1697120123456
      },
      "client_timestamp": 1697120123456
    },
    {
      "id": 124,
      "entity_type": "note",
      "entity_id": "note-uuid-2",
      "operation": "update",
      "payload": {
        "id": "note-uuid-2",
        "body": "수정된 내용...",
        "updated_at": 1697120234567
      },
      "client_timestamp": 1697120234567
    }
  ]
}

Response: 200 OK
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "errors": [],
  "new_checkpoint": 1697120300000
}

Partial Success: 200 OK
{
  "success": false,
  "processed": 1,
  "failed": 1,
  "errors": [
    {
      "change_id": 124,
      "entity_id": "note-uuid-2",
      "error_code": "CONFLICT",
      "message": "서버에 더 최신 버전이 존재합니다."
    }
  ],
  "new_checkpoint": 1697120300000
}

Error: 422 Unprocessable Entity
{
  "error": "VALIDATION_ERROR",
  "message": "잘못된 데이터 형식입니다.",
  "details": [
    {
      "field": "changes[0].payload.importance",
      "message": "1에서 3 사이의 값이어야 합니다."
    }
  ]
}
```

#### 9.2.2 Pull
```
POST /sync/pull

Headers:
Authorization: Bearer {access_token}

Request:
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "checkpoint": 1697120000000
}

Response: 200 OK
{
  "new_checkpoint": 1697120500000,
  "deltas": [
    {
      "entity_type": "note",
      "entity_id": "note-uuid-3",
      "operation": "upsert",
      "data": {
        "id": "note-uuid-3",
        "body": "다른 기기에서 생성된 노트",
        "importance": 2,
        "created_at": 1697120345678,
        "updated_at": 1697120345678
      },
      "server_timestamp": 1697120400000
    },
    {
      "entity_type": "relation",
      "entity_id": "relation-uuid-1",
      "operation": "delete",
      "data": {
        "id": "relation-uuid-1"
      },
      "server_timestamp": 1697120450000
    }
  ]
}

No Changes: 200 OK
{
  "new_checkpoint": 1697120000000,
  "deltas": []
}
```

### 9.3 추천

#### 9.3.1 관련 노트 조회
```
GET /recommend/{note_id}?k=10

Headers:
Authorization: Bearer {access_token}

Response: 200 OK
{
  "note_id": "note-uuid-1",
  "recommendations": [
    {
      "note_id": "note-uuid-5",
      "score": 0.87,
      "reason": "공통 키워드: Python, RAG / 유사 표현: \"임베딩 생성\"",
      "preview": "LangChain을 사용한 RAG 파이프라인 구축...",
      "created_at": 1697110000000
    },
    {
      "note_id": "note-uuid-8",
      "score": 0.72,
      "reason": "의미적으로 유사함",
      "preview": "벡터 데이터베이스 선택 가이드...",
      "created_at": 1697100000000
    }
  ],
  "generated_at": 1697120500000
}

Error: 404 Not Found
{
  "error": "NOTE_NOT_FOUND",
  "message": "노트를 찾을 수 없습니다."
}
```

### 9.4 리포트

#### 9.4.1 주간 리포트 조회
```
GET /reports/weekly?week=2025-42

Headers:
Authorization: Bearer {access_token}

Response: 200 OK
{
  "week_key": "2025-42",
  "start_date": "2025-10-07",
  "end_date": "2025-10-13",
  "summary": "이번 주 3개 주제로 생각을 정리했습니다.\n1. Python, RAG 관련 (8개 노트)\n2. 백엔드 개발 (5개 노트)\n3. 데이터베이스 (3개 노트)",
  "clusters": [
    {
      "id": 0,
      "size": 8,
      "representative_text": "파이썬으로 RAG 시스템 구현하기...",
      "keywords": ["Python", "RAG", "LangChain"]
    },
    {
      "id": 1,
      "size": 5,
      "representative_text": "FastAPI 백엔드 설계...",
      "keywords": ["FastAPI", "API", "백엔드"]
    }
  ],
  "top_keywords": [
    { "name": "Python", "count": 15 },
    { "name": "RAG", "count": 12 },
    { "name": "FastAPI", "count": 8 }
  ],
  "new_keywords": ["pgvector", "임베딩", "벡터검색"],
  "potential_connections": [
    {
      "from_note_id": "note-uuid-1",
      "to_note_id": "note-uuid-5",
      "reason": "두 노트 모두 RAG 시스템 구현에 대해 다루고 있습니다."
    }
  ],
  "generated_at": 1697120600000
}

Error: 404 Not Found
{
  "error": "REPORT_NOT_FOUND",
  "message": "해당 주차의 리포트가 아직 생성되지 않았습니다."
}
```

### 9.5 이미지 업로드

#### 9.5.1 이미지 업로드
```
POST /upload/image

Headers:
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Request:
{
  "image": <binary data>,
  "note_id": "note-uuid-1"
}

Response: 200 OK
{
  "url": "https://cdn.example.com/images/abc123def456.jpg",
  "thumbnail_url": "https://cdn.example.com/images/abc123def456_thumb.jpg",
  "size": 245678,
  "uploaded_at": 1697120700000
}

Error: 413 Payload Too Large
{
  "error": "FILE_TOO_LARGE",
  "message": "이미지 크기는 2MB를 초과할 수 없습니다."
}
```

### 9.6 에러 코드 체계

```typescript
enum ApiErrorCode {
  // 4xx 클라이언트 오류
  BAD_REQUEST = 'BAD_REQUEST',                   // 400
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',   // 401
  UNAUTHORIZED = 'UNAUTHORIZED',                 // 401
  FORBIDDEN = 'FORBIDDEN',                       // 403
  NOT_FOUND = 'NOT_FOUND',                       // 404
  CONFLICT = 'CONFLICT',                         // 409
  VALIDATION_ERROR = 'VALIDATION_ERROR',         // 422
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',   // 429
  
  // 5xx 서버 오류
  INTERNAL_ERROR = 'INTERNAL_ERROR',             // 500
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',   // 503
  
  // 도메인 특화 오류
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',
  REPORT_NOT_FOUND = 'REPORT_NOT_FOUND',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE'
}
```

### 9.7 Rate Limiting

```
X-RateLimit-Limit: 100        (시간당 최대 요청 수)
X-RateLimit-Remaining: 95     (남은 요청 수)
X-RateLimit-Reset: 1697124000 (리셋 시각, Unix timestamp)

Error: 429 Too Many Requests
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
  "retry_after": 3600
}
```

---

## 10. 비기능 요구사항

### 10.1 성능 목표

#### 10.1.1 클라이언트 성능
| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 앱 콜드 스타트 | < 2초 | 앱 아이콘 클릭 → 첫 화면 렌더링 |
| 입력 지연 | < 100ms | 키 입력 → 화면 반영 |
| 로컬 검색 | < 150ms (P95) | 검색어 입력 → 결과 표시 |
| 노트 저장 | < 1초 (P95) | 저장 버튼 → 완료 피드백 |
| 스크롤 FPS | ≥ 55 FPS | 노트 목록 스크롤 |

#### 10.1.2 서버 성능
| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| API 응답 시간 (P95) | < 500ms | 요청 → 응답 |
| 동기화 처리량 | 100 req/s | 동시 사용자 수 |
| 임베딩 생성 | < 1초/노트 | 단일 노트 처리 시간 |
| 추천 API | < 500ms | /recommend 응답 시간 |
| 주간 리포트 생성 | < 10초 | 백그라운드 작업 |

### 10.2 가용성

- **오프라인 기능**: 캡처, 검색, 편집, 연결은 100% 오프라인 동작
- **온라인 전용 기능**: AI 추천, 주간 리포트, 동기화
- **서비스 가동률**: 99.5% (월 3.6시간 다운타임 허용)

### 10.3 확장성

- **사용자당 노트**: 최대 10만 개
- **동시 접속자**: 1,000명 (단계적 확장 가능)
- **데이터베이스**: 샤딩 준비 (사용자 ID 기반)

### 10.4 배터리/네트워크 효율

#### 10.4.1 배터리 최적화
- 동기화는 앱 포그라운드 시만 실행
- 백그라운드 동기화는 충전 중 + Wi-Fi 연결 시 선호
- GPS, 카메라 등 하드웨어는 필요시만 활성화

#### 10.4.2 네트워크 최적화
- 배치 업로드로 요청 횟수 최소화
- 이미지는 별도 CDN 사용 (압축 전송)
- gzip/brotli 압축 적용
- 재시도 시 지수 백오프

### 10.5 품질 목표

| 지표 | 목표 |
|------|------|
| 크래시율 | < 0.3% |
| ANR(Application Not Responding) | < 0.1% |
| 동기화 성공률 | > 99% |
| API 에러율 | < 1% |
| 평균 앱 평점 | ≥ 4.5 / 5.0 |

---

## 11. 기술 스택 (상세)

### 11.1 모바일 (React Native)

#### 11.1.1 핵심 라이브러리
```json
{
  "dependencies": {
    "expo": "^52.0.0",
    "expo-sqlite": "^15.0.0",
    "expo-file-system": "^18.0.0",
    "expo-image-picker": "~15.0.0",
    "react-native": "0.76.0",
    "react": "18.3.1",
    
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "axios": "^1.7.0",
    
    "react-native-keychain": "^9.0.0",
    "react-native-uuid": "^2.0.2",
    "date-fns": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/react": "^18.3.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.0"
  }
}
```

#### 11.1.2 프로젝트 구조
```
src/
├── components/       # UI 컴포넌트
│   ├── NoteCard.tsx
│   ├── SearchBar.tsx
│   └── ...
├── screens/          # 화면
│   ├── HomeScreen.tsx
│   ├── SearchScreen.tsx
│   └── ...
├── hooks/            # Custom hooks
│   ├── useNotes.ts
│   ├── useSync.ts
│   └── ...
├── services/         # 비즈니스 로직
│   ├── database.ts   # SQLite 래퍼
│   ├── sync.ts       # 동기화 로직
│   ├── search.ts     # 검색 로직
│   └── api.ts        # API 클라이언트
├── store/            # 전역 상태
│   ├── notesStore.ts
│   ├── syncStore.ts
│   └── authStore.ts
├── types/            # TypeScript 타입
│   └── index.ts
├── utils/            # 유틸리티
│   ├── uuid.ts
│   ├── date.ts
│   └── ...
└── App.tsx
```

#### 11.1.3 상태 관리 전략
```typescript
// Zustand: 클라이언트 상태
import { create } from 'zustand';

interface NotesState {
  notes: Note[];
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map(n => n.id === id ? { ...n, ...updates } : n)
  })),
  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter(n => n.id !== id)
  }))
}));

// React Query: 서버 상태
import { useQuery, useMutation } from '@tanstack/react-query';

function useRecommendations(noteId: string) {
  return useQuery({
    queryKey: ['recommendations', noteId],
    queryFn: () => api.getRecommendations(noteId),
    staleTime: 1000 * 60 * 60, // 1시간
    enabled: !!noteId
  });
}
```

### 11.2 백엔드 (Python)

#### 11.2.1 핵심 라이브러리
```python
# requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
pydantic==2.9.0
pydantic-settings==2.5.0

sqlalchemy==2.0.35
psycopg2-binary==2.9.9
alembic==1.13.0

sentence-transformers==3.2.0
kiwipiepy==0.18.0
numpy==2.1.0
scikit-learn==1.5.0

python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9

redis==5.0.0
celery==5.4.0

pytest==8.3.0
httpx==0.27.0
```

#### 11.2.2 프로젝트 구조
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI 앱
│   ├── config.py         # 설정
│   ├── database.py       # DB 연결
│   ├── models/           # SQLAlchemy 모델
│   │   ├── note.py
│   │   ├── user.py
│   │   └── ...
│   ├── schemas/          # Pydantic 스키마
│   │   ├── sync.py
│   │   ├── recommendation.py
│   │   └── ...
│   ├── api/              # 라우터
│   │   ├── auth.py
│   │   ├── sync.py
│   │   ├── recommend.py
│   │   └── reports.py
│   ├── services/         # 비즈니스 로직
│   │   ├── embedding.py
│   │   ├── keyword.py
│   │   ├── recommendation.py
│   │   └── report.py
│   ├── core/             # 핵심 유틸리티
│   │   ├── security.py
│   │   ├── cache.py
│   │   └── ...
│   └── tasks/            # Celery 태스크
│       ├── embedding.py
│       └── report.py
├── alembic/              # 마이그레이션
│   └── versions/
├── tests/
│   ├── test_api.py
│   ├── test_sync.py
│   └── ...
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

#### 11.2.3 데이터베이스 스키마 (PostgreSQL)
```sql
-- users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notes 테이블
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 3),
  source_url TEXT,
  image_url TEXT,
  embedding VECTOR(1024),  -- pgvector
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX idx_notes_embedding ON notes USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- keywords 테이블
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_keywords_name ON keywords(LOWER(name));

-- note_keywords 테이블
CREATE TABLE note_keywords (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  weight REAL NOT NULL DEFAULT 1.0 CHECK (weight BETWEEN 0.0 AND 1.0),
  source VARCHAR(20) NOT NULL CHECK (source IN ('server', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (note_id, keyword_id)
);

CREATE INDEX idx_note_keywords_keyword_id ON note_keywords(keyword_id);

-- relations 테이블
CREATE TABLE relations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  to_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  relation_type VARCHAR(50) NOT NULL DEFAULT 'related',
  rationale TEXT,
  source VARCHAR(20) NOT NULL CHECK (source IN ('user', 'ai')),
  created_at TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_note_id != to_note_id),
  UNIQUE (from_note_id, to_note_id)
);

CREATE INDEX idx_relations_from_note ON relations(from_note_id);
CREATE INDEX idx_relations_to_note ON relations(to_note_id);

-- reflections 테이블
CREATE TABLE reflections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX idx_reflections_user_date ON reflections(user_id, date DESC);

-- weekly_reports 테이블
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_key VARCHAR(10) NOT NULL,  -- YYYY-WW
  summary TEXT,
  data JSONB,  -- 클러스터, 키워드, 연결 제안 등
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_key)
);

CREATE INDEX idx_weekly_reports_user_week ON weekly_reports(user_id, week_key DESC);

-- devices 테이블 (기기 등록)
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(100),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, user_id)
);

CREATE INDEX idx_devices_user ON devices(user_id);

-- sync_checkpoints 테이블
CREATE TABLE sync_checkpoints (
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  checkpoint BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (device_id)
);
```

---

## 12. 보안/프라이버시/백업

### 12.1 인증/인가

#### 12.1.1 JWT 토큰 전략
```python
# config.py
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1시간
REFRESH_TOKEN_EXPIRE_DAYS = 30    # 30일

# security.py
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
```

#### 12.1.2 기기 등록
```python
@router.post("/auth/register-device")
async def register_device(
    device_id: str,
    device_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    device = Device(
        id=device_id,
        user_id=current_user.id,
        device_name=device_name
    )
    db.add(device)
    db.commit()
    return {"message": "Device registered successfully"}
```

#### 12.1.3 토큰 저장 (모바일)
```typescript
import * as Keychain from 'react-native-keychain';

// 저장
async function saveTokens(accessToken: string, refreshToken: string) {
  await Keychain.setGenericPassword(
    'auth_tokens',
    JSON.stringify({ accessToken, refreshToken }),
    {
      service: 'com.app.synapse',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED
    }
  );
}

// 조회
async function getTokens() {
  const credentials = await Keychain.getGenericPassword({
    service: 'com.app.synapse'
  });
  
  if (credentials) {
    return JSON.parse(credentials.password);
  }
  return null;
}

// 삭제
async function clearTokens() {
  await Keychain.resetGenericPassword({
    service: 'com.app.synapse'
  });
}
```

### 12.2 데이터 보안

#### 12.2.1 전송 보안
- **HTTPS**: TLS 1.3 필수
- **인증서**: Let's Encrypt 또는 상용 인증서
- **HSTS**: Strict-Transport-Security 헤더 활성화

#### 12.2.2 로컬 저장소 (MVP)
```
현재:
- SQLite 평문 저장
- 파일 시스템 권한으로 보호 (앱 샌드박스)

차기 버전:
- SQLCipher를 사용한 데이터베이스 암호화
- 생체 인증 (지문, 얼굴) 연동
- 앱 잠금 기능
```

#### 12.2.3 서버 저장소
- **데이터베이스**: PostgreSQL SSL 연결
- **이미지**: S3 호환 스토리지 (Cloudflare R2)
  - 서명된 URL (pre-signed URL) 사용
  - 기본 비공개, 24시간 만료 URL

### 12.3 백업

#### 12.3.1 로컬 백업 (JSON 내보내기)
```typescript
async function exportData(): Promise<string> {
  const db = await openDatabase();
  
  // 모든 데이터 조회
  const notes = await db.getAllAsync('SELECT * FROM notes WHERE deleted_at IS NULL');
  const keywords = await db.getAllAsync('SELECT * FROM keywords');
  const note_keywords = await db.getAllAsync('SELECT * FROM note_keywords');
  const relations = await db.getAllAsync('SELECT * FROM relations');
  const reflections = await db.getAllAsync('SELECT * FROM reflections');
  
  const backup = {
    version: '1.0',
    exported_at: Date.now(),
    data: {
      notes,
      keywords,
      note_keywords,
      relations,
      reflections
    }
  };
  
  return JSON.stringify(backup, null, 2);
}

// 파일로 저장
async function saveBackupToFile() {
  const data = await exportData();
  const filename = `backup_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.json`;
  
  // FileSystem API 사용
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, data);
  
  // 공유 시트 열기
  await Sharing.shareAsync(fileUri);
}
```

#### 12.3.2 서버 백업
```bash
# PostgreSQL 백업 (매일 자동)
pg_dump -h localhost -U postgres -d synapse \
  -Fc -f /backups/synapse_$(date +%Y%m%d).dump

# 보관 정책
- 일일 백업: 7일 보관
- 주간 백업: 4주 보관
- 월간 백업: 12개월 보관
```

#### 12.3.3 복원
```typescript
async function importData(jsonString: string) {
  const backup = JSON.parse(jsonString);
  
  if (backup.version !== '1.0') {
    throw new Error('Unsupported backup version');
  }
  
  const db = await openDatabase();
  
  await db.withTransactionAsync(async () => {
    // 기존 데이터 삭제 (옵션)
    // await db.execAsync('DELETE FROM notes');
    // ...
    
    // 데이터 삽입
    for (const note of backup.data.notes) {
      await db.runAsync(
        'INSERT OR REPLACE INTO notes (id, body, importance, ...) VALUES (?, ?, ?, ...)',
        [note.id, note.body, note.importance, ...]
      );
    }
    
    // 키워드, 연결 등도 동일하게 삽입
    // ...
  });
  
  return { success: true, imported: backup.data.notes.length };
}
```

### 12.4 프라이버시

#### 12.4.1 데이터 수집 최소화
- 필수 데이터만 수집 (이메일, 노트 내용)
- 위치 정보, 연락처 등 불필요한 권한 요청 안 함
- 서버 로그에 개인 정보 저장 금지

#### 12.4.2 사용자 권리
- 데이터 내보내기 (JSON)
- 계정 삭제 (모든 데이터 영구 삭제)
- 데이터 조회 (어떤 데이터가 저장되어 있는지)

#### 12.4.3 제3자 공유
- MVP에서는 제3자와 데이터 공유 없음
- 향후 분석 서비스 사용 시 사전 동의

---

## 13. 테스트 전략

### 13.1 단위 테스트

#### 13.1.1 모바일 (React Native)
```typescript
// __tests__/services/database.test.ts
import { openDatabase, createNote, searchNotes } from '../services/database';

describe('Database Service', () => {
  let db;
  
  beforeEach(async () => {
    db = await openDatabase(':memory:');  // 메모리 DB 사용
  });
  
  afterEach(async () => {
    await db.closeAsync();
  });
  
  test('should create note', async () => {
    const note = {
      id: 'test-uuid',
      body: '테스트 노트',
      importance: 2,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    await createNote(db, note);
    
    const result = await db.getFirstAsync(
      'SELECT * FROM notes WHERE id = ?',
      [note.id]
    );
    
    expect(result).toBeDefined();
    expect(result.body).toBe('테스트 노트');
  });
  
  test('should search notes with FTS5', async () => {
    // 여러 노트 생성
    await createNote(db, { body: '파이썬 튜토리얼', ... });
    await createNote(db, { body: '자바스크립트 기초', ... });
    await createNote(db, { body: '파이썬 고급 기법', ... });
    
    const results = await searchNotes(db, '파이썬');
    
    expect(results).toHaveLength(2);
  });
});
```

#### 13.1.2 백엔드 (Python)
```python
# tests/test_embedding.py
import pytest
from app.services.embedding import EmbeddingService

@pytest.fixture
def embedding_service():
    return EmbeddingService()

def test_preprocess_text(embedding_service):
    text = "https://example.com 이것은   테스트   입니다."
    processed = embedding_service.preprocess_text(text)
    
    assert "[URL]" in processed
    assert "  " not in processed  # 과도한 공백 제거

def test_generate_embedding(embedding_service):
    text = "테스트 문장입니다."
    embedding = embedding_service.generate_embedding(text)
    
    assert embedding.shape == (1024,)
    assert -1.0 <= embedding.min() <= 1.0
    assert -1.0 <= embedding.max() <= 1.0

def test_augment_short_text(embedding_service):
    short_text = "Python"
    augmented = embedding_service.augment_short_text(short_text)
    
    assert len(augmented) > len(short_text)
```

### 13.2 통합 테스트

#### 13.2.1 동기화 시나리오
```typescript
// __tests__/integration/sync.test.ts
describe('Sync Integration', () => {
  test('should sync local changes to server', async () => {
    // 1. 로컬 노트 생성
    const note = await createNote({ body: '통합 테스트' });
    
    // 2. 변경 로그 확인
    const changes = await getUnsyncedChanges();
    expect(changes).toHaveLength(1);
    
    // 3. 동기화 실행
    const result = await pushChanges();
    expect(result.success).toBe(true);
    
    // 4. 서버 데이터 확인
    const serverNote = await api.getNote(note.id);
    expect(serverNote.body).toBe('통합 테스트');
    
    // 5. 변경 로그 정리 확인
    const remainingChanges = await getUnsyncedChanges();
    expect(remainingChanges).toHaveLength(0);
  });
  
  test('should resolve conflict with LWW', async () => {
    // 1. 동일 노트를 두 기기에서 수정 (시뮬레이션)
    const localNote = { id: 'conflict-test', body: '로컬 수정', updated_at: 1000 };
    const remoteNote = { id: 'conflict-test', body: '서버 수정', updated_at: 2000 };
    
    // 2. Pull 실행
    await pullChanges();
    
    // 3. 최신 버전 확인 (서버가 더 최신)
    const finalNote = await getNote('conflict-test');
    expect(finalNote.body).toBe('서버 수정');
  });
});
```

#### 13.2.2 API 통합 테스트
```python
# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_sync_push_endpoint():
    # 로그인
    response = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "password123",
        "device_id": "test-device"
    })
    token = response.json()["access_token"]
    
    # Push 요청
    response = client.post("/sync/push", 
        headers={"Authorization": f"Bearer {token}"},
        json={
            "device_id": "test-device",
            "checkpoint": 0,
            "changes": [{
                "id": 1,
                "entity_type": "note",
                "entity_id": "test-note",
                "operation": "insert",
                "payload": {
                    "id": "test-note",
                    "body": "테스트 노트",
                    "importance": 2,
                    "created_at": 1697120000000,
                    "updated_at": 1697120000000
                },
                "client_timestamp": 1697120000000
            }]
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert data["processed"] == 1

def test_recommendation_endpoint():
    # 노트 생성
    note_id = create_test_note("Python RAG 시스템 구현")
    related_note_id = create_test_note("LangChain 튜토리얼")
    
    # 추천 요청
    response = client.get(f"/recommend/{note_id}?k=5",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["recommendations"]) > 0
    assert data["recommendations"][0]["note_id"] == related_note_id
```

### 13.3 E2E 테스트

#### 13.3.1 Detox 설정 (React Native)
```json
// .detoxrc.js
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Synapse.app',
      build: 'xcodebuild -workspace ios/Synapse.xcworkspace -scheme Synapse -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_33'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

#### 13.3.2 E2E 테스트 시나리오
```typescript
// e2e/firstTest.e2e.ts
describe('Main User Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });
  
  beforeEach(async () => {
    await device.reloadReactNative();
  });
  
  it('should create a new note', async () => {
    // 입력창 찾기
    await expect(element(by.id('note-input'))).toBeVisible();
    
    // 텍스트 입력
    await element(by.id('note-input')).typeText('E2E 테스트 노트');
    
    // 저장 버튼 클릭
    await element(by.id('save-button')).tap();
    
    // 노트 카드 확인
    await expect(element(by.text('E2E 테스트 노트'))).toBeVisible();
  });
  
  it('should search notes', async () => {
    // 검색 탭 이동
    await element(by.id('tab-search')).tap();
    
    // 검색어 입력
    await element(by.id('search-input')).typeText('테스트');
    
    // 결과 확인
    await expect(element(by.id('search-results'))).toBeVisible();
  });
  
  it('should sync offline changes', async () => {
    // 오프라인 모드
    await device.setNetworkConditions('offline');
    
    // 노트 생성
    await element(by.id('note-input')).typeText('오프라인 노트');
    await element(by.id('save-button')).tap();
    
    // 미동기화 표시 확인
    await expect(element(by.id('sync-pending-indicator'))).toBeVisible();
    
    // 온라인 전환
    await device.setNetworkConditions('online');
    
    // 동기화 버튼 클릭
    await element(by.id('sync-button')).tap();
    
    // 동기화 완료 확인
    await waitFor(element(by.text('동기화 완료'))).toBeVisible().withTimeout(5000);
  });
});
```

### 13.4 성능 테스트

#### 13.4.1 부하 테스트 (Locust)
```python
# locustfile.py
from locust import HttpUser, task, between

class SynapseUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # 로그인
        response = self.client.post("/auth/login", json={
            "email": "load-test@example.com",
            "password": "password123",
            "device_id": f"device-{self.user_id}"
        })
        self.token = response.json()["access_token"]
    
    @task(3)
    def sync_push(self):
        self.client.post("/sync/push",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "device_id": f"device-{self.user_id}",
                "checkpoint": 0,
                "changes": [{
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": f"note-{self.user_id}",
                    "operation": "insert",
                    "payload": {
                        "id": f"note-{self.user_id}",
                        "body": "부하 테스트 노트",
                        "importance": 2,
                        "created_at": int(time.time() * 1000),
                        "updated_at": int(time.time() * 1000)
                    },
                    "client_timestamp": int(time.time() * 1000)
                }]
            }
        )
    
    @task(1)
    def get_recommendations(self):
        self.client.get(f"/recommend/note-{self.user_id}?k=10",
            headers={"Authorization": f"Bearer {self.token}"}
        )

# 실행: locust -f locustfile.py --host=http://localhost:8000
```

#### 13.4.2 프로파일링
```python
# 서버 프로파일링 (cProfile)
import cProfile
import pstats

def profile_recommendation():
    profiler = cProfile.Profile()
    profiler.enable()
    
    # 추천 로직 실행
    result = recommend_notes(note_id="test", k=10)
    
    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(20)  # 상위 20개 함수

# 클라이언트 프로파일링 (Flipper)
# React Native Flipper 플러그인 사용
```

### 13.5 테스트 커버리지 목표

| 계층 | 목표 커버리지 |
|------|--------------|
| 서비스 로직 | > 80% |
| API 엔드포인트 | > 70% |
| 데이터베이스 쿼리 | > 60% |
| UI 컴포넌트 | > 50% |

---

## 14. 모니터링/로깅

### 14.1 클라이언트 모니터링

#### 14.1.1 크래시 리포팅 (Sentry)
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://your-sentry-dsn',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 1.0,
  enabled: !__DEV__
});

// 에러 캡처
try {
  // 위험한 작업
} catch (error) {
  Sentry.captureException(error, {
    tags: { section: 'sync' },
    extra: { noteCount: notes.length }
  });
}
```

#### 14.1.2 성능 추적
```typescript
// 커스텀 성능 메트릭
import { performance } from 'react-native-performance';

async function measureSearch(query: string) {
  const mark = performance.mark('search-start');
  
  const results = await searchNotes(query);
  
  const duration = performance.measure('search-duration', 'search-start');
  
  // 로깅
  logPerformance('search', duration.duration, {
    query_length: query.length,
    result_count: results.length
  });
  
  return results;
}
```

#### 14.1.3 사용자 행동 추적
```typescript
// 간단한 이벤트 로깅 (프라이버시 고려)
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

function logEvent(name: string, properties?: Record<string, any>) {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now()
  };
  
  // 로컬 저장 (배치 업로드)
  saveEventToLocalQueue(event);
}

// 사용 예시
logEvent('note_created', { importance: 3 });
logEvent('search_performed', { query_length: 10 });
logEvent('sync_completed', { duration_ms: 1234 });
```

### 14.2 서버 모니터링

#### 14.2.1 액세스 로그
```python
# FastAPI 미들웨어
import time
from fastapi import Request
import logging

logger = logging.getLogger("api")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    
    logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} "
        f"duration={duration:.3f}s "
        f"user={request.state.user_id if hasattr(request.state, 'user_id') else 'anonymous'}"
    )
    
    return response
```

#### 14.2.2 Prometheus 메트릭
```python
from prometheus_client import Counter, Histogram, Gauge
from prometheus_fastapi_instrumentator import Instrumentator

# 메트릭 정의
sync_push_counter = Counter('sync_push_total', 'Total sync push requests')
sync_push_errors = Counter('sync_push_errors', 'Sync push errors')
sync_push_duration = Histogram('sync_push_duration_seconds', 'Sync push duration')

embedding_duration = Histogram('embedding_generation_seconds', 'Embedding generation duration')
recommendation_duration = Histogram('recommendation_duration_seconds', 'Recommendation duration')

active_users = Gauge('active_users', 'Number of active users')

# FastAPI 계측
Instrumentator().instrument(app).expose(app)

# 사용 예시
@router.post("/sync/push")
async def sync_push(data: SyncPushRequest):
    sync_push_counter.inc()
    
    with sync_push_duration.time():
        try:
            result = await process_sync_push(data)
            return result
        except Exception as e:
            sync_push_errors.inc()
            raise
```

#### 14.2.3 Grafana 대시보드
```yaml
# 주요 패널
1. API 응답 시간 (P50, P95, P99)
2. 요청 처리량 (RPS)
3. 에러율 (%)
4. 데이터베이스 연결 풀 상태
5. 임베딩 생성 시간
6. 동기화 처리량
7. 활성 사용자 수
8. 메모리/CPU 사용률
```

### 14.3 로그 관리

#### 14.3.1 로그 레벨
```python
# Python (structlog)
import structlog

logger = structlog.get_logger()

# DEBUG: 상세 디버깅 정보
logger.debug("Embedding generated", note_id="...", dimension=1024)

# INFO: 일반 정보
logger.info("Sync completed", user_id="...", changes_count=10)

# WARNING: 경고 (잠재적 문제)
logger.warning("Slow query detected", query_time=2.5, query="...")

# ERROR: 오류 (처리됨)
logger.error("Failed to generate embedding", note_id="...", error=str(e))

# CRITICAL: 심각한 오류 (서비스 중단)
logger.critical("Database connection failed", error=str(e))
```

#### 14.3.2 로그 집계 (ELK Stack)
```yaml
# Logstash 설정
input {
  file {
    path => "/var/log/synapse/*.log"
    type => "synapse-api"
  }
}

filter {
  json {
    source => "message"
  }
  
  date {
    match => ["timestamp", "ISO8601"]
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "synapse-logs-%{+YYYY.MM.dd}"
  }
}
```

### 14.4 알림

#### 14.4.1 알림 규칙
```yaml
# Prometheus Alertmanager
groups:
  - name: synapse_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(sync_push_errors[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High sync error rate"
          description: "Sync error rate is {{ $value }} (> 5%)"
      
      - alert: SlowAPI
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API response time high"
          description: "95th percentile response time is {{ $value }}s"
      
      - alert: DatabaseDown
        expr: up{job="postgresql"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"
```

#### 14.4.2 알림 채널
- **Slack**: 개발팀 채널로 알림
- **Email**: 심각한 오류 시
- **PagerDuty**: 운영 시간 외 긴급 상황

---

## 15. 배포 전략

### 15.1 모바일 앱 배포

#### 15.1.1 Expo EAS Build
```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildType": "ipa"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234"
      }
    }
  }
}
```

#### 15.1.2 버전 관리
```json
// app.json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    },
    "ios": {
      "buildNumber": "1"
    }
  }
}

// 버전 업데이트 규칙 (Semantic Versioning)
// MAJOR.MINOR.PATCH
// 1.0.0 → 1.0.1 (버그 수정)
// 1.0.1 → 1.1.0 (새 기능)
// 1.1.0 → 2.0.0 (호환성 깨는 변경)
```

#### 15.1.3 OTA 업데이트
```bash
# Expo Updates 사용
# 코드 변경 시 앱 스토어 없이 업데이트 가능

# 프로덕션 업데이트 배포
eas update --branch production --message "버그 수정"

# 사용자 세그먼트별 배포 (카나리)
eas update --branch production --message "새 기능" --rollout-percentage 10
```

### 15.2 서버 배포

#### 15.2.1 Docker 컨테이너화
```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 시스템 의존성
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 모델 다운로드 (임베딩)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-large')"

# 앱 코드
COPY . .

# 포트 노출
EXPOSE 8000

# 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 15.2.2 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/synapse
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    depends_on:
      - db
      - redis
    volumes:
      - ./app:/app/app
    restart: unless-stopped
  
  db:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_DB=synapse
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
  
  worker:
    build: .
    command: celery -A app.tasks worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/synapse
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 15.2.3 CI/CD (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: pytest tests/ --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            yourorg/synapse-api:latest
            yourorg/synapse-api:${{ github.sha }}
  
  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/synapse
            docker-compose pull
            docker-compose up -d
            docker-compose exec -T api alembic upgrade head
```

### 15.3 배포 환경

#### 15.3.1 환경 구성
```
개발 (Development)
- 로컬 환경
- Docker Compose

스테이징 (Staging)
- 프로덕션과 동일한 구성
- 테스트 데이터 사용
- 내부 접근만 허용

프로덕션 (Production)
- Kubernetes 또는 관리형 서비스
- 로드 밸런서
- 자동 스케일링
- 백업 및 복구
```

#### 15.3.2 환경 변수
```bash
# .env.production
DATABASE_URL=postgresql://user:password@db.example.com:5432/synapse
REDIS_URL=redis://redis.example.com:6379/0

JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

SENTRY_DSN=https://your-sentry-dsn
ENVIRONMENT=production

S3_BUCKET=synapse-images
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# 모델 설정
EMBEDDING_MODEL=intfloat/multilingual-e5-large
EMBEDDING_DIMENSION=1024
```

### 15.4 Blue-Green 배포

```bash
# Blue (현재 운영 중)
docker-compose -f docker-compose.blue.yml up -d

# Green (새 버전 배포)
docker-compose -f docker-compose.green.yml up -d

# 헬스 체크
curl http://green-api.example.com/health

# 트래픽 전환 (로드 밸런서 설정)
# Blue → Green

# 검증 후 Blue 종료
docker-compose -f docker-compose.blue.yml down
```

### 15.5 롤백 전략

```bash
# 이전 버전으로 롤백
docker-compose down
docker-compose up -d yourorg/synapse-api:previous-tag

# 데이터베이스 롤백 (Alembic)
alembic downgrade -1  # 한 단계 이전
alembic downgrade <revision_id>  # 특정 버전

# 모바일 앱 롤백 (OTA)
eas update --branch production --message "롤백" --rollout-percentage 100
```

---

## 16. 로드맵

### M0 - 기본 기능 (2주)
**목표**: 오프라인 우선 노트 앱 골격

**완료 조건**:
- ✅ React Native(Expo) 프로젝트 세팅
- ✅ SQLite + FTS5 설정
- ✅ 노트 CRUD (생성, 읽기, 수정, 삭제)
- ✅ 전체 본문 검색
- ✅ 수동 연결 추가/삭제
- ✅ 기본 UI (홈, 검색, 상세)

**검증**:
- 100개 노트 저장 후 검색 < 150ms
- 오프라인 100% 동작
- 크래시 없음

---

### M1 - 동기화 & AI (3주)
**목표**: 서버 연동 및 AI 추천

**완료 조건**:
- ✅ Python FastAPI 백엔드 구축
- ✅ PostgreSQL + pgvector 설정
- ✅ JWT 인증
- ✅ 동기화 프로토콜 (Push/Pull)
- ✅ LWW 충돌 해결
- ✅ 임베딩 생성
- ✅ 관련 노트 추천 API
- ✅ 회고 탭 (일일 회고 입력)
- ✅ 주간 키워드 표시

**검증**:
- 동기화 성공률 > 99%
- 추천 API < 500ms
- 오프라인 → 온라인 전환 시 자동 동기화

---

### M2 - 미디어 & 최적화 (3주)
**목표**: 이미지 지원 및 성능 개선

**완료 조건**:
- ✅ 이미지 첨부 (1장)
- ✅ 이미지 업로드 API
- ✅ Cloudflare R2 연동
- ✅ 추천 결과 캐싱 (Redis)
- ✅ 주간 리포트 생성
- ✅ 백업 기능 (JSON 내보내기)
- ✅ 성능 프로파일링
- ✅ 크래시 리포팅 (Sentry)

**검증**:
- 이미지 업로드 < 5초
- 캐시 히트율 > 70%
- P95 검색 < 100ms

---

### M3 - 확장 & iOS (4주)
**목표**: 기능 확장 및 iOS 지원

**완료 조건**:
- ✅ 간소형 그래프 보기
- ✅ 로컬 데이터베이스 암호화 (SQLCipher)
- ✅ 생체 인증 (지문/얼굴)
- ✅ iOS 빌드
- ✅ 앱 스토어 제출
- ✅ 모니터링 대시보드 (Grafana)
- ✅ 부하 테스트

**검증**:
- iOS와 Android 기능 동일
- 1,000명 동시 접속 처리
- 앱 스토어 승인

---

## 17. 의사결정 기록 (ADR)

### ADR-001: React Native(Expo) 선택
**날짜**: 2025-10-14

**상황**: 모바일 프레임워크 선택

**결정**: React Native(Expo) 채택

**이유**:
- JavaScript/TypeScript 역량 활용
- 풍부한 생태계 (라이브러리, 커뮤니티)
- Expo의 빠른 개발 경험 (OTA 업데이트)
- SQLite, 파일 시스템 등 필수 기능 지원

**대안**:
- Flutter: Dart 학습 비용, 생태계 상대적으로 작음
- Native (Kotlin/Swift): 개발 비용 2배, 코드 중복

**영향**:
- 개발 속도 향상
- iOS/Android 동시 지원

---

### ADR-002: 단일 본문(body) 데이터 모델
**날짜**: 2025-10-14

**상황**: 노트 데이터 구조 설계

**결정**: 제목 없이 본문(body)만 저장

**이유**:
- 빠른 캡처 (제목 입력 불필요)
- UI 간소화
- 첫 줄을 제목처럼 표시 (충분)

**대안**:
- 제목 + 본문: 입력 단계 추가, 복잡도 증가

**영향**:
- UX 단순화
- 검색 로직 간소화 (body 컬럼 하나만 인덱싱)

---

### ADR-003: SQLite FTS5 로컬 검색
**날짜**: 2025-10-14

**상황**: 오프라인 검색 전략

**결정**: SQLite FTS5 사용

**이유**:
- 네이티브 지원 (별도 라이브러리 불필요)
- 빠른 전체 본문 검색
- 한국어 토크나이징 지원 (unicode61)

**대안**:
- 외부 검색 엔진 (Elasticsearch): 오프라인 불가, 복잡도 증가
- 직접 구현: 성능 불안정

**영향**:
- 오프라인 즉시 검색 가능
- 간단한 구현

---

### ADR-004: Python FastAPI 백엔드
**날짜**: 2025-10-14

**상황**: 서버 프레임워크 선택

**결정**: Python FastAPI

**이유**:
- 임베딩 모델 (sentence-transformers) 호환성
- 형태소 분석 (kiwipiepy) 한국어 지원
- 빠른 개발 (Pydantic, 자동 문서화)
- 비동기 지원

**대안**:
- Node.js: Python ML 생태계 접근 어려움
- Java/Spring: 개발 속도 느림

**영향**:
- AI 기능 쉽게 구현
- 한국어 NLP 우수

---

### ADR-005: PostgreSQL + pgvector
**날짜**: 2025-10-14

**상황**: 서버 데이터베이스 선택

**결정**: PostgreSQL + pgvector 확장

**이유**:
- 벡터 유사도 검색 내장
- 트랜잭션 지원
- 확장 가능성

**대안**:
- MongoDB: 벡터 검색 지원 약함
- 전용 벡터 DB (Pinecone, Weaviate): 별도 인프라, 비용

**영향**:
- 단일 데이터베이스로 관리
- 복잡도 감소

---

### ADR-006: 변경 로그 기반 동기화
**날짜**: 2025-10-14

**상황**: 동기화 프로토콜 설계

**결정**: 변경 로그 배치 업로드

**이유**:
- 오프라인 내구성
- 재시도 가능
- 네트워크 효율

**대안**:
- 실시간 동기화: 배터리 소모, 네트워크 과부하
- 정기 풀 동기화: 충돌 많음

**영향**:
- 안정적 동기화
- 오프라인 우선 가능

---

### ADR-007: LWW 충돌 해결
**날짜**: 2025-10-14

**상황**: 동기화 충돌 정책

**결정**: Last-Write-Wins (최신 수정 우선)

**이유**:
- 단일 사용자 전제 (MVP)
- 구현 간단
- 대부분 충돌 해결 가능

**대안**:
- CRDT: 복잡도 높음, 오버킬
- 수동 머지: UX 복잡

**영향**:
- 간단한 충돌 해결
- 드물게 최신 편집 손실 가능 (로그 보관)

---

## 18. 리스크 & 대응

### 18.1 기술적 리스크

#### R1: 짧은 메모 임베딩 품질 저하
**영향**: 중 | **확률**: 높음

**설명**: 단어 1~2개인 노트의 임베딩 품질 불안정

**대응**:
- 문맥 보강 (관련 노트 스니펫 추가)
- 키워드 기반 대체 추천
- 임베딩 신뢰도 스코어 계산

---

#### R2: FTS5 인덱스 팽창
**영향**: 중 | **확률**: 중

**설명**: 대량 노트 (1만 개 이상) 시 검색 속도 저하

**대응**:
- 인덱스 최적화 (PRAGMA optimize)
- 월별 파티션 검토
- 오래된 노트 아카이빙

---

#### R3: 동기화 큐 누적
**영향**: 높음 | **확률**: 중

**설명**: 장기 오프라인 시 변경 로그 과다 누적

**대응**:
- 최대 큐 크기 제한 (10,000개)
- 우선순위 기반 동기화
- 압축 및 오프로드

---

#### R4: 서버 임베딩 생성 부하
**영향**: 높음 | **확률**: 중

**설명**: 대량 동기화 시 CPU 과부하

**대응**:
- Celery 백그라운드 작업
- 배치 임베딩 생성
- GPU 인스턴스 고려

---

### 18.2 보안 리스크

#### R5: 로컬 평문 저장
**영향**: 높음 | **확률**: 낮음

**설명**: 기기 분실 시 데이터 노출

**대응 (MVP)**:
- 앱 샌드박스 의존
- 사용자 교육 (기기 잠금 권장)

**대응 (차기)**:
- SQLCipher 암호화
- 생체 인증 필수

---

#### R6: JWT 토큰 탈취
**영향**: 높음 | **확률**: 낮음

**설명**: 네트워크 가로채기로 토큰 노출

**대응**:
- HTTPS 강제
- 짧은 만료 시간 (1시간)
- Refresh Token 로테이션
- 기기별 토큰 무효화

---

### 18.3 운영 리스크

#### R7: 단말 시간 불일치
**영향**: 중 | **확률**: 중

**설명**: 클라이언트 시계 오차로 LWW 오작동

**대응**:
- 서버 수신 시각 함께 기록
- 시간 차이 보정 로직
- 타임스탬프 검증

---

#### R8: 데이터베이스 증가
**영향**: 중 | **확률**: 높음

**설명**: 사용자 증가로 DB 용량 부족

**대응**:
- 자동 백업
- 샤딩 준비 (사용자 ID 기반)
- 클라우드 스토리지 확장

---

## 19. 성공 지표

### 19.1 사용자 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| DAU (일간 활성 사용자) | 100명 (M2) | 앱 실행 이벤트 |
| 주간 회고 입력률 | ≥ 40% | 회고 입력 / 전체 사용자 |
| 평균 노트 작성 수 | ≥ 3개/일 | 노트 생성 이벤트 |
| 검색 사용률 | ≥ 60% | 검색 기능 사용자 / DAU |

### 19.2 기술 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 크래시율 | ≤ 0.3% | Sentry 리포트 |
| 동기화 성공률 | ≥ 99% | 성공 / 전체 동기화 시도 |
| API P95 응답 시간 | < 500ms | Prometheus 메트릭 |
| 검색 P95 응답 시간 | < 150ms | 클라이언트 로그 |

### 19.3 비즈니스 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 사용자 유지율 (D7) | ≥ 40% | 7일 후 재방문율 |
| 앱 평점 | ≥ 4.5 / 5.0 | 앱 스토어 리뷰 |
| 추천 클릭률 | ≥ 20% | 추천 클릭 / 추천 노출 |
| 주간 리포트 조회율 | ≥ 50% | 리포트 조회 / 생성 |

---

## 부록

### A. 용어 정리

- **노트**: 사용자가 작성한 생각/아이디어 기록
- **본문(body)**: 노트의 실제 내용 (제목 없음)
- **중요도**: 1(낮음), 2(보통), 3(높음)
- **연결(relation)**: 노트 간 관계 (수동 또는 AI)
- **키워드**: 노트에서 추출된 핵심 단어
- **임베딩**: 텍스트의 벡터 표현 (1024차원)
- **FTS5**: SQLite 전체 본문 검색 확장
- **LWW**: Last-Write-Wins, 최신 수정 우선 충돌 해결
- **체크포인트**: 동기화 진행 지점 (타임스탬프)
- **델타**: 증분 변경 사항

### B. 참고 자료

#### 임베딩 모델
- [multilingual-e5-large](https://huggingface.co/intfloat/multilingual-e5-large)
- [Sentence Transformers](https://www.sbert.net/)

#### 형태소 분석
- [Kiwipiepy](https://github.com/bab2min/kiwipiepy)

#### 벡터 검색
- [pgvector](https://github.com/pgvector/pgvector)

#### 기타
- [React Native Performance](https://reactnative.dev/docs/performance)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [Expo Documentation](https://docs.expo.dev/)

---

**제품명**: Synapse(시냅스)  
**문서 버전**: 3.1 (완전판)  
**최종 수정**: 2025-10-15  
**작성자**: Claude AI  
**검토자**: 사용자
