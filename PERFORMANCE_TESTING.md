# Performance Testing Guide

Comprehensive performance testing documentation for the Synapse mobile app and backend.

## Performance Targets

### Mobile App

| Metric | Target | Measurement |
|--------|--------|-------------|
| App Cold Start | <2s | Time to interactive |
| Note Save | <1s (P95) | Local write to confirmation |
| Search | <150ms (P95) | Query to results (10,000 notes) |
| Sync Completion | <10s | 100 notes bidirectional sync |

### Backend API

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sync Push | <1s (P95) | Process 100 notes batch |
| Sync Pull | <1s (P95) | Generate delta response |
| AI Recommendation | <500ms (P95) | Similarity search + ranking |
| Weekly Report | <3s (P95) | Clustering + keyword analysis |
| Embedding Generation | <1s per note | Text → 1024-dim vector |

## Mobile Performance Testing

### Setup

The mobile performance test utilities are located in:
```
mobile/src/utils/performanceTest.ts
```

### Running Mobile Performance Tests

Create a test file to run performance tests:

```typescript
// mobile/__tests__/performance.test.ts
import {
  runAllPerformanceTests,
  measureSearchPerformance,
  measureColdStartPerformance,
} from '@/utils/performanceTest';

describe('Performance Tests', () => {
  it('should run all performance tests', async () => {
    await runAllPerformanceTests();
  }, 300000); // 5 minute timeout

  it('should measure search performance', async () => {
    const stats = await measureSearchPerformance(10000);

    // Assert P95 < 150ms
    expect(stats.p95).toBeLessThan(150);
  }, 120000);

  it('should measure cold start', async () => {
    const duration = await measureColdStartPerformance();

    // Assert cold start < 1s for DB init
    expect(duration).toBeLessThan(1000);
  }, 30000);
});
```

Run the tests:
```bash
cd mobile
npm test -- performance.test.ts
```

### Test Scenarios

#### 1. Cold Start Performance

Measures database initialization time (schema creation, migration):

```typescript
const duration = await measureColdStartPerformance();
// Target: <500ms (excellent), <1s (acceptable)
```

#### 2. Search Performance (10,000 notes)

Generates 10,000 test notes and measures FTS5 search performance:

```typescript
const stats = await measureSearchPerformance(10000);
// Target: P95 <150ms
```

**Output Example**:
```
📊 Search Performance Statistics:
   Min: 12.45ms
   Max: 145.23ms
   Avg: 68.34ms
   P50: 65.12ms
   P95: 118.67ms ✅ Target MET
   P99: 132.45ms
```

#### 3. Note Retrieval Performance

Measures bulk note loading:

```typescript
const result = await measureNoteRetrievalPerformance();
// Target: <1s for 10,000 notes
```

### Profiling Mobile App Performance

#### React Native Performance Monitor

Enable performance overlay in development:

```javascript
// Shake device → Show Perf Monitor
// Or in code:
import { NativeModules } from 'react-native';
NativeModules.DevSettings.setIsPerfMonitorShown(true);
```

#### React DevTools Profiler

```bash
# Install React DevTools
npm install -g react-devtools

# Run devtools
react-devtools

# In app: Shake device → Debug → Toggle Inspector
```

#### Chrome DevTools for Performance

```bash
# Open Chrome DevTools
chrome://inspect

# Enable Performance tab
# Record → Perform actions → Stop → Analyze
```

## Backend Performance Testing

### Setup

Install Locust for load testing:

```bash
cd backend
pip install locust
```

### Running Load Tests

#### Interactive Mode (Web UI)

```bash
locust -f locustfile.py --host=http://localhost:8000
```

Open browser: http://localhost:8089

Configure:
- **Number of users**: 100
- **Spawn rate**: 10 users/second
- **Run time**: 5 minutes

#### Headless Mode (CI/CD)

```bash
locust -f locustfile.py \
  --host=http://localhost:8000 \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --headless \
  --csv=results/load_test
```

This generates:
- `results/load_test_stats.csv` - Request statistics
- `results/load_test_failures.csv` - Failed requests
- `results/load_test_stats_history.csv` - Time series data

### Load Test Scenarios

The `locustfile.py` defines two user types:

#### 1. SynapseUser (Main Load)

Simulates typical app user behavior:

**Tasks** (weight = frequency):
- Push Sync (10): Upload local changes
- Pull Sync (8): Download server changes
- Get Recommendations (5): Fetch similar notes
- Generate Weekly Report (2): Create insights
- Refresh Token (1): Renew authentication

**Flow**:
1. Register new user
2. Login and get access token
3. Create 5 initial notes
4. Randomly execute tasks with wait time 1-3s

#### 2. AdminUser (Health Monitoring)

Simulates monitoring/health check traffic:
- Health Check (weight: 1)
- Root Check (weight: 1)
- Wait time: 5-10s

### Analyzing Results

#### Key Metrics to Monitor

**Response Time**:
- **P50 (median)**: Half of requests faster than this
- **P95**: 95% of requests faster than this
- **P99**: 99% of requests faster than this
- **Max**: Worst case response time

**Throughput**:
- **RPS (requests per second)**: Total request rate
- **Failures**: Failed request percentage

**Resource Usage** (monitor separately):
- CPU utilization
- Memory usage
- Database connections
- Redis cache hit rate

#### Example Analysis

```bash
# View results
cat results/load_test_stats.csv | column -t -s ','

# Check failures
cat results/load_test_failures.csv
```

**Good Result Example**:
```
Name              # requests  Median  95%ile  99%ile  Average  Max    Failures
/sync/push        1000       245ms   580ms   890ms   320ms    1200ms  0
/sync/pull        800        180ms   420ms   650ms   240ms    950ms   0
/recommend/:id    500        150ms   380ms   480ms   210ms    600ms   0
/reports/weekly   200        890ms   2400ms  2900ms  1200ms   3200ms  0
```

### Monitoring During Load Test

#### Application Metrics

```bash
# Watch logs
tail -f logs/app.log

# Monitor with htop
htop

# PostgreSQL queries
psql synapse -c "SELECT * FROM pg_stat_activity;"
```

#### Docker Stats

```bash
# If using Docker Compose
docker stats

# View container logs
docker-compose logs -f api
```

### Performance Optimization Tips

#### Backend Optimization

1. **Database Indexing**:
   ```sql
   -- Check missing indexes
   SELECT * FROM pg_stat_user_tables WHERE idx_scan = 0;

   -- Add indexes for slow queries
   CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC);
   ```

2. **Query Optimization**:
   ```sql
   -- Use EXPLAIN ANALYZE
   EXPLAIN ANALYZE SELECT * FROM notes WHERE user_id = '...';
   ```

3. **Caching**:
   - Enable Redis for session storage
   - Cache embedding results
   - Use HTTP caching headers

4. **Connection Pooling**:
   ```python
   # Adjust in database.py
   engine = create_engine(
       DATABASE_URL,
       pool_size=20,  # Increase for higher load
       max_overflow=10
   )
   ```

#### Mobile Optimization

1. **Pagination**:
   ```typescript
   // Load notes in batches
   const notes = await getAllNotes(db, 50, offset);
   ```

2. **Virtual Lists**:
   ```typescript
   // Use FlashList instead of FlatList
   import { FlashList } from "@shopify/flash-list";
   ```

3. **Image Optimization**:
   ```typescript
   // Lazy load images
   <Image
     source={{ uri: imageUrl }}
     resizeMode="cover"
     loadingIndicatorSource={placeholder}
   />
   ```

4. **Debounce Search**:
   ```typescript
   const debouncedSearch = useMemo(
     () => debounce((query) => searchNotes(db, query), 300),
     [db]
   );
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/performance-test.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday 2 AM
  workflow_dispatch:  # Manual trigger

jobs:
  backend-load-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install locust

      - name: Run API
        run: |
          cd backend
          uvicorn app.main:app &
          sleep 5

      - name: Run load test
        run: |
          cd backend
          mkdir -p results
          locust -f locustfile.py \
            --host=http://localhost:8000 \
            --users 50 \
            --spawn-rate 5 \
            --run-time 2m \
            --headless \
            --csv=results/load_test

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: backend/results/
```

## Continuous Performance Monitoring

### Recommended Tools

**Application Performance Monitoring (APM)**:
- New Relic
- Datadog
- Sentry Performance

**Database Monitoring**:
- pgAdmin (PostgreSQL)
- pg_stat_statements extension

**Mobile App Monitoring**:
- Firebase Performance Monitoring
- Sentry Mobile Performance

**Custom Metrics**:
```python
# Backend: Add prometheus metrics
from prometheus_client import Counter, Histogram

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)
```

## Performance Regression Detection

Set up automated alerts for performance degradation:

```yaml
# Example: Alert if P95 exceeds target
alerts:
  - name: "Sync Push Slow"
    condition: sync_push_p95 > 1000ms
    action: notify_team

  - name: "Search Slow"
    condition: search_p95 > 150ms
    action: notify_team

  - name: "Recommendation Slow"
    condition: recommend_p95 > 500ms
    action: notify_team
```

## Troubleshooting Performance Issues

### Common Issues and Solutions

#### Slow Database Queries

**Symptom**: High response times on sync endpoints

**Diagnosis**:
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solution**: Add indexes, optimize queries

#### Memory Leaks

**Symptom**: Increasing memory usage over time

**Diagnosis**:
```bash
# Monitor memory
ps aux | grep python

# Python memory profiler
pip install memory_profiler
python -m memory_profiler app/main.py
```

**Solution**: Fix object retention, use generators

#### High CPU Usage

**Symptom**: CPU at 100%, slow responses

**Diagnosis**:
```bash
# Profile with py-spy
pip install py-spy
py-spy top --pid <PID>
```

**Solution**: Optimize algorithms, use caching

## Best Practices

1. **Baseline First**: Establish performance baseline before optimizing
2. **Measure, Don't Guess**: Profile before optimizing
3. **Test Realistic Loads**: Use production-like data volumes
4. **Monitor Continuously**: Set up ongoing performance tracking
5. **Test Edge Cases**: Test with maximum expected load +20%
6. **Document Results**: Keep performance test results for comparison

## Resources

- [Locust Documentation](https://docs.locust.io/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [FastAPI Performance](https://fastapi.tiangolo.com/advanced/async-tests/)
