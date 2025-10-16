import { device, element, by, expect as detoxExpect } from 'detox';
import './setup';
import { tapElement, typeText, clearAndType, waitForElement } from './helpers';

describe('Search Flow E2E Tests', () => {
  beforeAll(async () => {
    // Create some test notes for searching
    await tapElement(by.id('homeTab'));

    // Create first note
    await tapElement(by.id('createNoteButton'));
    await typeText(by.id('noteBodyInput'), 'React Native Development\nBuilding mobile apps with React Native.');
    await tapElement(by.id('saveNoteButton'));

    // Create second note
    await tapElement(by.id('createNoteButton'));
    await typeText(by.id('noteBodyInput'), 'TypeScript Best Practices\nType safety in JavaScript.');
    await tapElement(by.id('saveNoteButton'));

    // Create third note
    await tapElement(by.id('createNoteButton'));
    await typeText(by.id('noteBodyInput'), 'Offline-First Architecture\nBuilding apps that work offline.');
    await tapElement(by.id('saveNoteButton'));
  });

  it('should navigate to search screen', async () => {
    await tapElement(by.id('searchTab'));
    await detoxExpect(element(by.id('searchScreen'))).toBeVisible();
  });

  it('should perform a search and display results', async () => {
    // Type search query
    await clearAndType(by.id('searchInput'), 'React Native');

    // Wait for search results
    await waitForElement(by.id('searchResults'));

    // Verify search result is displayed
    await detoxExpect(element(by.text('React Native Development'))).toBeVisible();
  });

  it('should tap on search result and view note detail', async () => {
    // Tap on the search result
    await tapElement(by.text('React Native Development'));

    // Verify note detail screen is shown
    await detoxExpect(element(by.id('noteDetailScreen'))).toBeVisible();

    // Verify note content is visible
    await detoxExpect(element(by.text('Building mobile apps with React Native.'))).toBeVisible();
  });

  it('should search for different term and show different results', async () => {
    // Navigate back to search
    await device.pressBack();
    await detoxExpect(element(by.id('searchScreen'))).toBeVisible();

    // Clear and search for different term
    await clearAndType(by.id('searchInput'), 'TypeScript');

    // Verify different result is shown
    await detoxExpect(element(by.text('TypeScript Best Practices'))).toBeVisible();

    // Verify previous result is not shown
    await detoxExpect(element(by.text('React Native Development'))).not.toBeVisible();
  });

  it('should handle empty search results', async () => {
    // Search for non-existent term
    await clearAndType(by.id('searchInput'), 'NonExistentTerm12345');

    // Verify no results message
    await detoxExpect(element(by.text('No results found'))).toBeVisible();
  });

  afterAll(async () => {
    // Clean up: delete test notes
    await tapElement(by.id('homeTab'));

    // Delete each test note (if still exists)
    const testNotes = ['React Native Development', 'TypeScript Best Practices', 'Offline-First Architecture'];

    for (const noteTitle of testNotes) {
      try {
        await tapElement(by.text(noteTitle));
        await tapElement(by.id('deleteNoteButton'));
        await tapElement(by.text('Delete'));
      } catch (e) {
        // Note might not exist, continue
      }
    }
  });
});
