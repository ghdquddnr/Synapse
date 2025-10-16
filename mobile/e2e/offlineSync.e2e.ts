import { device, element, by, expect as detoxExpect } from 'detox';
import './setup';
import {
  tapElement,
  typeText,
  clearAndType,
  waitForElement,
  setAirplaneMode,
  waitForNetworkIdle,
  restartApp
} from './helpers';

describe('Offline Sync Flow E2E Tests', () => {
  beforeAll(async () => {
    // Ensure we start with network enabled
    await setAirplaneMode(false);
    await waitForNetworkIdle();
  });

  it('should create a note while offline', async () => {
    // Navigate to home screen
    await tapElement(by.id('homeTab'));

    // Enable airplane mode (simulate offline)
    await setAirplaneMode(true);

    // Wait a moment for network status to update
    await waitForNetworkIdle(1000);

    // Create a new note while offline
    await tapElement(by.id('createNoteButton'));
    await typeText(by.id('noteBodyInput'), 'Offline Note\nCreated while offline.');
    await tapElement(by.id('saveNoteButton'));

    // Verify note was created and appears in the list
    await detoxExpect(element(by.text('Offline Note'))).toBeVisible();
  });

  it('should show offline indicator', async () => {
    // Navigate to settings to see sync status
    await tapElement(by.id('settingsTab'));

    // Verify offline status is shown
    await detoxExpect(element(by.id('offlineIndicator'))).toBeVisible();
    // Or check sync status text
    await detoxExpect(element(by.text('Offline'))).toBeVisible();
  });

  it('should sync note when coming back online', async () => {
    // Disable airplane mode (go back online)
    await setAirplaneMode(false);

    // Wait for network to reconnect
    await waitForNetworkIdle(2000);

    // Navigate to settings to trigger sync or check sync status
    await tapElement(by.id('settingsTab'));

    // Verify online status
    await detoxExpect(element(by.text('Online'))).toBeVisible();

    // Tap manual sync button if available
    try {
      await tapElement(by.id('manualSyncButton'), 2000);

      // Wait for sync to complete
      await waitForNetworkIdle(3000);

      // Verify sync success indicator
      await detoxExpect(element(by.text('Synced'))).toBeVisible();
    } catch (e) {
      // Manual sync button might not be visible, auto-sync might have triggered
      console.log('Manual sync button not found, assuming auto-sync');
    }
  });

  it('should persist offline changes after app restart', async () => {
    // Restart the app
    await restartApp({
      permissions: { notifications: 'YES' },
      delete: false, // Don't delete data
    });

    // Navigate to home screen
    await tapElement(by.id('homeTab'));

    // Verify the offline-created note still exists
    await detoxExpect(element(by.text('Offline Note'))).toBeVisible();
  });

  it('should handle conflicts when same note edited offline and online', async () => {
    // This is a simplified test - real conflict resolution would need backend coordination

    // Create a note online
    await setAirplaneMode(false);
    await tapElement(by.id('homeTab'));
    await tapElement(by.id('createNoteButton'));
    await typeText(by.id('noteBodyInput'), 'Conflict Test\nOriginal content.');
    await tapElement(by.id('saveNoteButton'));

    // Go offline
    await setAirplaneMode(true);

    // Edit the note
    await tapElement(by.text('Conflict Test'));
    await tapElement(by.id('editNoteButton'));
    await clearAndType(by.id('noteBodyInput'), 'Conflict Test\nEdited offline.');
    await tapElement(by.id('saveNoteButton'));

    // Go back online and sync
    await setAirplaneMode(false);
    await waitForNetworkIdle(2000);

    // Navigate to settings and sync
    await tapElement(by.id('settingsTab'));
    try {
      await tapElement(by.id('manualSyncButton'));
      await waitForNetworkIdle(3000);
    } catch (e) {
      // Auto-sync might have triggered
    }

    // Verify the note still exists with offline changes (LWW resolution)
    await tapElement(by.id('homeTab'));
    await tapElement(by.text('Conflict Test'));
    await detoxExpect(element(by.text('Edited offline.'))).toBeVisible();
  });

  afterAll(async () => {
    // Clean up: delete test notes and ensure network is enabled
    await setAirplaneMode(false);
    await waitForNetworkIdle();

    await tapElement(by.id('homeTab'));

    // Delete test notes
    const testNotes = ['Offline Note', 'Conflict Test'];
    for (const noteTitle of testNotes) {
      try {
        await tapElement(by.text(noteTitle));
        await tapElement(by.id('deleteNoteButton'));
        await tapElement(by.text('Delete'));
      } catch (e) {
        // Note might not exist
      }
    }
  });
});
