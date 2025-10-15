/**
 * Device Utility Tests
 */

import * as SecureStore from 'expo-secure-store';
import { v7 as uuidv7 } from 'uuid';
import { getDeviceId, clearDeviceId } from './device';

// Mock expo-secure-store
jest.mock('expo-secure-store');

// Mock uuid
jest.mock('uuid', () => ({
  v7: jest.fn(),
}));

describe('Device Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeviceId()', () => {
    it('should return existing device ID if found', async () => {
      const existingId = 'existing-device-id';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(existingId);

      const deviceId = await getDeviceId();
      expect(deviceId).toBe(existingId);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('device_id');
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should generate and save new device ID if not found', async () => {
      const newId = 'new-device-id';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (uuidv7 as jest.Mock).mockReturnValue(newId);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const deviceId = await getDeviceId();
      expect(deviceId).toBe(newId);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('device_id');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'device_id',
        newId,
      );
      expect(uuidv7).toHaveBeenCalled();
    });

    it('should return session-only UUID on storage error', async () => {
      const fallbackId = 'fallback-device-id';
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );
      (uuidv7 as jest.Mock).mockReturnValue(fallbackId);

      const deviceId = await getDeviceId();
      expect(deviceId).toBe(fallbackId);
      expect(uuidv7).toHaveBeenCalled();
    });

    it('should log error on storage failure', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );
      (uuidv7 as jest.Mock).mockReturnValue('fallback-id');

      await getDeviceId();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should reuse device ID across multiple calls (when cached)', async () => {
      const existingId = 'cached-device-id';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(existingId);

      const deviceId1 = await getDeviceId();
      const deviceId2 = await getDeviceId();

      expect(deviceId1).toBe(existingId);
      expect(deviceId2).toBe(existingId);
      expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearDeviceId()', () => {
    it('should delete device ID from storage', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await clearDeviceId();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('device_id');
    });

    it('should throw error on failure', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      await expect(clearDeviceId()).rejects.toThrow();
    });

    it('should log error on failure', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error'),
      );

      try {
        await clearDeviceId();
      } catch {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should allow generating new ID after clearing', async () => {
      const firstId = 'first-device-id';
      const secondId = 'second-device-id';

      // First call: return existing ID
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(firstId);
      const id1 = await getDeviceId();
      expect(id1).toBe(firstId);

      // Clear device ID
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
      await clearDeviceId();

      // Second call: generate new ID
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      (uuidv7 as jest.Mock).mockReturnValue(secondId);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const id2 = await getDeviceId();
      expect(id2).toBe(secondId);
      expect(id2).not.toBe(id1);
    });
  });
});
