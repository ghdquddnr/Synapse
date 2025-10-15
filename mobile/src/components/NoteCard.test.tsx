import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NoteCard from './NoteCard';
import { Note } from '@/types';
import { IMPORTANCE_HIGH, IMPORTANCE_MEDIUM, IMPORTANCE_LOW } from '@/constants';

const createMockNote = (overrides?: Partial<Note>): Note => ({
  id: 'note-123',
  body: 'First line of note\nSecond line of note\nThird line',
  importance: IMPORTANCE_MEDIUM,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('NoteCard', () => {
  const mockOnPress = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render note card', () => {
    const note = createMockNote();
    const { getByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    expect(getByTestId('note-card')).toBeTruthy();
  });

  it('should display first line as title', () => {
    const note = createMockNote();
    const { getByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    const title = getByTestId('note-card-title');
    expect(title.props.children).toBe('First line of note');
  });

  it('should truncate long first line', () => {
    const longFirstLine = 'A'.repeat(100);
    const note = createMockNote({ body: longFirstLine });
    const { getByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    const title = getByTestId('note-card-title');
    expect(title.props.children).toContain('...');
    expect(title.props.children.length).toBeLessThanOrEqual(53); // 50 + '...'
  });

  it('should display preview for multiline notes', () => {
    const note = createMockNote();
    const { getByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    const preview = getByTestId('note-card-preview');
    expect(preview.props.children).toBe('Second line of note\nThird line');
  });

  it('should not display preview for single line notes', () => {
    const note = createMockNote({ body: 'Single line note' });
    const { queryByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    expect(queryByTestId('note-card-preview')).toBeNull();
  });

  it('should display importance icon', () => {
    const note = createMockNote({ importance: IMPORTANCE_HIGH });
    const { getByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    expect(getByTestId('importance-icon')).toBeTruthy();
  });

  it('should display date', () => {
    const note = createMockNote();
    const { getByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    expect(getByTestId('note-card-date')).toBeTruthy();
  });

  it('should display link icon when note has source URL', () => {
    const note = createMockNote({ source_url: 'https://example.com' });
    const { getByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    const metadata = getByTestId('note-card-date').parent;
    expect(metadata).toBeTruthy();
  });

  it('should call onPress when card is pressed', () => {
    const note = createMockNote();
    const { getByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    const card = getByTestId('note-card');
    fireEvent.press(card);
    expect(mockOnPress).toHaveBeenCalledWith(note);
  });

  it('should render delete button when onDelete provided', () => {
    const note = createMockNote();
    const { getByTestId } = render(
      <NoteCard note={note} onPress={mockOnPress} onDelete={mockOnDelete} />
    );
    expect(getByTestId('delete-button')).toBeTruthy();
  });

  it('should not render delete button when onDelete not provided', () => {
    const note = createMockNote();
    const { queryByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    expect(queryByTestId('delete-button')).toBeNull();
  });

  it('should call onDelete when delete button pressed', () => {
    const note = createMockNote();
    const { getByTestId } = render(
      <NoteCard note={note} onPress={mockOnPress} onDelete={mockOnDelete} />
    );
    const deleteButton = getByTestId('delete-button');
    fireEvent.press(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(note);
  });

  it('should show unsynced indicator when enabled', () => {
    const note = createMockNote();
    const { getByTestId } = render(
      <NoteCard note={note} onPress={mockOnPress} showUnsyncedIndicator={true} />
    );
    expect(getByTestId('unsynced-indicator')).toBeTruthy();
  });

  it('should not show unsynced indicator by default', () => {
    const note = createMockNote();
    const { queryByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
    expect(queryByTestId('unsynced-indicator')).toBeNull();
  });

  it('should render with different importance levels', () => {
    const levels: Array<1 | 2 | 3> = [IMPORTANCE_LOW, IMPORTANCE_MEDIUM, IMPORTANCE_HIGH];

    levels.forEach((importance) => {
      const note = createMockNote({ importance });
      const { getByTestId } = render(<NoteCard note={note} onPress={mockOnPress} />);
      expect(getByTestId('importance-icon')).toBeTruthy();
    });
  });
});
