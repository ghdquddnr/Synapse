/**
 * Performance testing utilities for mobile app
 *
 * Usage:
 * - Import these functions in a test file
 * - Run with npm test
 * - Check console output for performance metrics
 */

import { openDatabase } from '@/services/database/connection';
import { initializeSchema } from '@/services/database/schema';
import { insertNote, getAllNotes } from '@/services/database/notes';
import { searchNotes } from '@/services/database/search';
import { generateUUIDv7 } from '@/utils/uuid';

/**
 * Generate test notes for performance testing
 */
export async function generateTestNotes(count: number): Promise<void> {
  const db = openDatabase('performance_test.db');

  try {
    // Initialize schema
    await initializeSchema(db);

    console.log(`Generating ${count} test notes...`);
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
      const note = {
        id: generateUUIDv7(),
        body: `Performance Test Note ${i + 1}\nThis is a test note for performance testing. It contains multiple words to test search functionality. Keywords: testing, performance, mobile, react-native, offline, sync.`,
        importance: (i % 3) + 1 as 1 | 2 | 3,
        source_url: i % 5 === 0 ? `https://example.com/note/${i}` : undefined,
        image_path: i % 10 === 0 ? `/path/to/image${i}.jpg` : undefined,
      };

      await insertNote(db, note);

      if ((i + 1) % 1000 === 0) {
        console.log(`  Generated ${i + 1}/${count} notes...`);
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`\n✅ Generated ${count} notes in ${duration.toFixed(2)}ms`);
    console.log(`   Average: ${(duration / count).toFixed(2)}ms per note`);
  } finally {
    db.close();
  }
}

/**
 * Measure search performance
 */
export async function measureSearchPerformance(
  count: number = 10000
): Promise<{
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}> {
  const db = openDatabase('performance_test.db');

  try {
    const searchQueries = [
      'test',
      'performance',
      'mobile',
      'react',
      'offline',
      'sync',
      'testing performance',
      'mobile react',
      'Note 100',
      'Keywords',
    ];

    const durations: number[] = [];

    console.log(`\nMeasuring search performance (${searchQueries.length} queries)...`);

    for (const query of searchQueries) {
      const startTime = performance.now();
      const results = await searchNotes(db, query, 50);
      const endTime = performance.now();

      const duration = endTime - startTime;
      durations.push(duration);

      console.log(`  "${query}": ${duration.toFixed(2)}ms (${results.length} results)`);
    }

    // Calculate statistics
    durations.sort((a, b) => a - b);

    const stats = {
      min: durations[0],
      max: durations[durations.length - 1],
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
    };

    console.log('\n📊 Search Performance Statistics:');
    console.log(`   Min: ${stats.min.toFixed(2)}ms`);
    console.log(`   Max: ${stats.max.toFixed(2)}ms`);
    console.log(`   Avg: ${stats.avg.toFixed(2)}ms`);
    console.log(`   P50: ${stats.p50.toFixed(2)}ms`);
    console.log(`   P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`   P99: ${stats.p99.toFixed(2)}ms`);

    if (stats.p95 < 150) {
      console.log(`   ✅ P95 < 150ms target MET (${stats.p95.toFixed(2)}ms)`);
    } else {
      console.log(`   ❌ P95 < 150ms target NOT MET (${stats.p95.toFixed(2)}ms)`);
    }

    return stats;
  } finally {
    db.close();
  }
}

/**
 * Measure note retrieval performance
 */
export async function measureNoteRetrievalPerformance(): Promise<{
  duration: number;
  noteCount: number;
}> {
  const db = openDatabase('performance_test.db');

  try {
    console.log('\nMeasuring note retrieval performance...');

    const startTime = performance.now();
    const notes = await getAllNotes(db, 10000, 0);
    const endTime = performance.now();

    const duration = endTime - startTime;

    console.log(`  Retrieved ${notes.length} notes in ${duration.toFixed(2)}ms`);
    console.log(`  Average: ${(duration / notes.length).toFixed(4)}ms per note`);

    if (duration < 1000) {
      console.log(`  ✅ Retrieval < 1s target MET (${duration.toFixed(2)}ms)`);
    } else {
      console.log(`  ❌ Retrieval < 1s target NOT MET (${duration.toFixed(2)}ms)`);
    }

    return {
      duration,
      noteCount: notes.length,
    };
  } finally {
    db.close();
  }
}

/**
 * Measure cold start simulation (database initialization)
 */
export async function measureColdStartPerformance(): Promise<number> {
  console.log('\nMeasuring cold start performance...');

  const startTime = performance.now();

  // Simulate cold start: open DB and initialize schema
  const db = openDatabase('cold_start_test.db');

  try {
    await initializeSchema(db);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`  Cold start (DB init): ${duration.toFixed(2)}ms`);

    if (duration < 500) {
      console.log(`  ✅ DB initialization < 500ms (excellent)`);
    } else if (duration < 1000) {
      console.log(`  ⚠️  DB initialization < 1s (acceptable)`);
    } else {
      console.log(`  ❌ DB initialization > 1s (needs optimization)`);
    }

    return duration;
  } finally {
    db.close();
  }
}

/**
 * Run all performance tests
 */
export async function runAllPerformanceTests(): Promise<void> {
  console.log('═══════════════════════════════════════');
  console.log('  Synapse Mobile Performance Tests');
  console.log('═══════════════════════════════════════\n');

  try {
    // 1. Cold start test
    await measureColdStartPerformance();

    // 2. Generate test data
    console.log('\nChecking for existing test data...');
    const db = openDatabase('performance_test.db');
    let notes = await getAllNotes(db, 1, 0);
    db.close();

    if (notes.length === 0) {
      await generateTestNotes(10000);
    } else {
      console.log('Test data already exists, skipping generation...');
    }

    // 3. Search performance
    await measureSearchPerformance(10000);

    // 4. Note retrieval performance
    await measureNoteRetrievalPerformance();

    console.log('\n═══════════════════════════════════════');
    console.log('  Performance Tests Complete');
    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('Performance test failed:', error);
    throw error;
  }
}
