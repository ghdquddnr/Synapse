// Database connection manager with singleton pattern

import * as SQLite from 'expo-sqlite';
import { DB_NAME } from '@/constants/database';
import { DatabaseError } from '@/types/database';
import { initializeSchema, verifySchema } from './schema';

/**
 * Singleton database connection manager
 */
class DatabaseManager {
  private static instance: DatabaseManager;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize and get the database connection
   */
  public async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    // Return existing connection if available
    if (this.db) {
      return this.db;
    }

    // If already initializing, wait for that process to complete
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.isInitializing = true;
    this.initPromise = this.initialize();

    try {
      this.db = await this.initPromise;
      return this.db;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  /**
   * Initialize the database
   */
  private async initialize(): Promise<SQLite.SQLiteDatabase> {
    try {
      // Open database connection
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Initialize schema
      await initializeSchema(db);

      // Verify schema integrity
      const isValid = await verifySchema(db);
      if (!isValid) {
        throw new DatabaseError('Schema verification failed');
      }

      return db;
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Close the database connection
   */
  public async closeDatabase(): Promise<void> {
    if (this.db) {
      try {
        await this.db.closeAsync();
        this.db = null;
      } catch (error) {
        throw new DatabaseError(
          `Failed to close database: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          error instanceof Error ? error : undefined
        );
      }
    }
  }

  /**
   * Execute a transaction
   */
  public async executeTransaction(
    callback: (tx: SQLite.SQLiteDatabase) => Promise<void>
  ): Promise<void> {
    const db = await this.getDatabase();

    try {
      await db.withTransactionAsync(async () => {
        await callback(db);
      });
    } catch (error) {
      throw new DatabaseError(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
        'TRANSACTION_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Reset the database (for testing purposes only)
   */
  public async resetDatabase(): Promise<void> {
    if (this.db) {
      await this.closeDatabase();
    }

    try {
      await SQLite.deleteDatabaseAsync(DB_NAME);
      this.db = null;
    } catch (error) {
      throw new DatabaseError(
        `Failed to reset database: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();

// Convenience function to get database
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return dbManager.getDatabase();
}

// Convenience function for transactions
export async function withTransaction(
  callback: (db: SQLite.SQLiteDatabase) => Promise<void>
): Promise<void> {
  return dbManager.executeTransaction(callback);
}
