// SQLite specific types and interfaces

import * as SQLite from 'expo-sqlite';

export type Database = SQLite.SQLiteDatabase;

export interface DatabaseConfig {
  name: string;
  version: number;
}

export interface QueryResult {
  rows: {
    _array: any[];
    length: number;
    item: (index: number) => any;
  };
  insertId?: number;
  rowsAffected: number;
}

export interface TransactionCallback {
  (): void | Promise<void>;
}

export interface SchemaTable {
  name: string;
  sql: string;
}

export interface Index {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
}

// Database error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class SchemaError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'SCHEMA_ERROR', originalError);
    this.name = 'SchemaError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'QUERY_ERROR', originalError);
    this.name = 'QueryError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, 'TRANSACTION_ERROR', originalError);
    this.name = 'TransactionError';
  }
}
