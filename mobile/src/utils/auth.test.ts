/**
 * Auth Utility Tests
 */

import * as SecureStore from 'expo-secure-store';
import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
  clearTokens,
  isAuthenticated,
} from './auth';

// Mock expo-secure-store
jest.mock('expo-secure-store');

describe('Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccessToken()', () => {
    it('should return access token if exists', async () => {
      const mockToken = 'test-access-token';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

      const token = await getAccessToken();
      expect(token).toBe(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('access_token');
    });

    it('should return null if no token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const token = await getAccessToken();
      expect(token).toBeNull();
    });

    it('should return null on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      const token = await getAccessToken();
      expect(token).toBeNull();
    });

    it('should log error on failure', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      await getAccessToken();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getRefreshToken()', () => {
    it('should return refresh token if exists', async () => {
      const mockToken = 'test-refresh-token';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

      const token = await getRefreshToken();
      expect(token).toBe(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('refresh_token');
    });

    it('should return null if no token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const token = await getRefreshToken();
      expect(token).toBeNull();
    });

    it('should return null on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      const token = await getRefreshToken();
      expect(token).toBeNull();
    });
  });

  describe('saveAccessToken()', () => {
    it('should save access token', async () => {
      const testToken = 'new-access-token';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await saveAccessToken(testToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'access_token',
        testToken,
      );
    });

    it('should throw error on failure', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      await expect(saveAccessToken('token')).rejects.toThrow();
    });

    it('should log error on failure', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      try {
        await saveAccessToken('token');
      } catch {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveRefreshToken()', () => {
    it('should save refresh token', async () => {
      const testToken = 'new-refresh-token';
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await saveRefreshToken(testToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'refresh_token',
        testToken,
      );
    });

    it('should throw error on failure', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      await expect(saveRefreshToken('token')).rejects.toThrow();
    });
  });

  describe('clearTokens()', () => {
    it('should delete both tokens', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await clearTokens();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'refresh_token',
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw error on failure', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      await expect(clearTokens()).rejects.toThrow();
    });

    it('should log error on failure', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      try {
        await clearTokens();
      } catch {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('isAuthenticated()', () => {
    it('should return true if access token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        'some-access-token',
      );

      const result = await isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false if access token does not exist', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await isAuthenticated();
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      const result = await isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
