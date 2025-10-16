import { device, element, by, expect as detoxExpect } from 'detox';
import './setup';
import { tapElement, typeText, clearAndType, waitForElement } from './helpers';

describe('Synapse E2E Tests', () => {
  describe('Basic App Launch', () => {
    it('should launch the app successfully', async () => {
      await detoxExpect(element(by.id('homeScreen'))).toBeVisible();
    });

    it('should display the bottom navigation', async () => {
      await detoxExpect(element(by.id('bottomNavigation'))).toBeVisible();
    });
  });

  describe('Note CRUD Operations', () => {
    it('should create a new note', async () => {
      // Navigate to home screen
      await tapElement(by.id('homeTab'));

      // Tap the create note button
      await tapElement(by.id('createNoteButton'));

      // Type note content
      await typeText(by.id('noteBodyInput'), 'Test Note\nThis is a test note created by E2E test.');

      // Save the note
      await tapElement(by.id('saveNoteButton'));

      // Verify note was created and appears in the list
      await detoxExpect(element(by.text('Test Note'))).toBeVisible();
    });

    it('should view note details', async () => {
      // Tap on the note to view details
      await tapElement(by.text('Test Note'));

      // Verify note detail screen is shown
      await detoxExpect(element(by.id('noteDetailScreen'))).toBeVisible();

      // Verify note content is visible
      await detoxExpect(element(by.text('This is a test note created by E2E test.'))).toBeVisible();
    });

    it('should edit an existing note', async () => {
      // From note detail screen, tap edit button
      await tapElement(by.id('editNoteButton'));

      // Modify note content
      await clearAndType(by.id('noteBodyInput'), 'Updated Test Note\nThis note has been updated.');

      // Save the changes
      await tapElement(by.id('saveNoteButton'));

      // Verify updated content is visible
      await detoxExpect(element(by.text('Updated Test Note'))).toBeVisible();
      await detoxExpect(element(by.text('This note has been updated.'))).toBeVisible();
    });

    it('should delete a note', async () => {
      // From note detail screen, tap delete button
      await tapElement(by.id('deleteNoteButton'));

      // Confirm deletion
      await tapElement(by.text('Delete'));

      // Verify we're back to home screen
      await detoxExpect(element(by.id('homeScreen'))).toBeVisible();

      // Verify note is no longer in the list
      await detoxExpect(element(by.text('Updated Test Note'))).not.toBeVisible();
    });
  });
});
