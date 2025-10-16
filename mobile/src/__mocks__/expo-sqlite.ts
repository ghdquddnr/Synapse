// Mock for expo-sqlite in Jest tests using better-sqlite3 for real SQLite operations
import Database from 'better-sqlite3';

interface MockDatabase {
  _db: Database.Database;
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync: <T = any>(sql: string, params?: any[]) => Promise<T | null>;
  getAllAsync: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  closeAsync: () => Promise<void>;
  withTransactionAsync: (callback: () => Promise<void>) => Promise<void>;
}

const activeDatabases = new Map<string, MockDatabase>();

function createMockDatabase(databaseName: string): MockDatabase {
  // Use in-memory database for testing
  const db = new Database(':memory:');

  // Enable foreign keys by default to match SQLite behavior
  db.pragma('foreign_keys = ON');

  const mockDb: MockDatabase = {
    _db: db,

    execAsync: jest.fn(async (sql: string) => {
      try {
        db.exec(sql);
      } catch (error) {
        throw error;
      }
    }),

    runAsync: jest.fn(async (sql: string, params?: any[]) => {
      try {
        const stmt = db.prepare(sql);
        const result = params ? stmt.run(...params) : stmt.run();
        return {
          changes: result.changes,
          lastInsertRowId: Number(result.lastInsertRowId),
        };
      } catch (error) {
        throw error;
      }
    }),

    getFirstAsync: jest.fn(async <T = any>(sql: string, params?: any[]) => {
      try {
        const stmt = db.prepare(sql);
        const result = params ? stmt.get(...params) : stmt.get();
        return (result as T) || null;
      } catch (error) {
        throw error;
      }
    }),

    getAllAsync: jest.fn(async <T = any>(sql: string, params?: any[]) => {
      try {
        const stmt = db.prepare(sql);
        const results = params ? stmt.all(...params) : stmt.all();
        return results as T[];
      } catch (error) {
        throw error;
      }
    }),

    closeAsync: jest.fn(async () => {
      db.close();
    }),

    withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => {
      const transaction = db.transaction(callback);
      await transaction();
    }),
  };

  return mockDb;
}

export const openDatabaseAsync = jest.fn(async (databaseName: string) => {
  // Check if database exists and is still open
  const existingDb = activeDatabases.get(databaseName);
  if (existingDb) {
    try {
      // Test if database is still open by trying to get pragma
      existingDb._db.pragma('user_version');
      return existingDb;
    } catch (e) {
      // Database is closed, remove it from cache
      activeDatabases.delete(databaseName);
    }
  }

  // Create new database
  const mockDb = createMockDatabase(databaseName);
  activeDatabases.set(databaseName, mockDb);
  return mockDb;
});

export const deleteDatabaseAsync = jest.fn(async (databaseName: string) => {
  const mockDb = activeDatabases.get(databaseName);
  if (mockDb) {
    try {
      await mockDb.closeAsync();
    } catch (e) {
      // Ignore close errors for in-memory databases
    }
    activeDatabases.delete(databaseName);
  }
});

// Helper to clear all mock databases
export function clearMockDatabases(): void {
  activeDatabases.forEach((db) => {
    try {
      db._db.close();
    } catch (e) {
      // Ignore close errors for in-memory databases
    }
  });
  activeDatabases.clear();
}

// Helper to get database for testing
export function getMockDatabase(dbName: string): MockDatabase | undefined {
  return activeDatabases.get(dbName);
}
