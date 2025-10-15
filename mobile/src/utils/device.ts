/**
 * Device Utilities
 *
 * Helper functions for managing device identity.
 */

import * as SecureStore from 'expo-secure-store';
import { v7 as uuidv7 } from 'uuid';

const DEVICE_ID_KEY = 'device_id';

/**
 * Get or create device ID
 * Device ID is persistent across app sessions and used for sync tracking
 * @returns Device ID (UUIDv7)
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate new device ID
      deviceId = uuidv7();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('Failed to get/create device ID:', error);
    // Fallback to session-only UUID (not ideal but prevents crash)
    return uuidv7();
  }
}

/**
 * Clear device ID (for testing or reset purposes)
 */
export async function clearDeviceId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  } catch (error) {
    console.error('Failed to clear device ID:', error);
    throw error;
  }
}
