// Mock for expo-sqlite in Jest tests

interface MockDatabase {
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  closeAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
}

const mockDatabases = new Map<string, MockDatabase>();

export const openDatabaseAsync = jest.fn(async (databaseName: string) => {
  if (!mockDatabases.has(databaseName)) {
    const mockDb: MockDatabase = {
      runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 })),
      getFirstAsync: jest.fn(async () => null),
      getAllAsync: jest.fn(async () => []),
      closeAsync: jest.fn(async () => {}),
      withTransactionAsync: jest.fn(async (callback: Function) => {
        await callback();
      }),
    };
    mockDatabases.set(databaseName, mockDb);
  }
  return mockDatabases.get(databaseName)!;
});

export const deleteDatabaseAsync = jest.fn(async (databaseName: string) => {
  mockDatabases.delete(databaseName);
});

// Helper to get mock database for testing
export function getMockDatabase(databaseName: string): MockDatabase | undefined {
  return mockDatabases.get(databaseName);
}

// Helper to clear all mock databases
export function clearMockDatabases(): void {
  mockDatabases.clear();
}
