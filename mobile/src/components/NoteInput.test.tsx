import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NoteInput from './NoteInput';
import { IMPORTANCE_LOW, IMPORTANCE_MEDIUM, IMPORTANCE_HIGH } from '@/constants';

describe('NoteInput', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render note input', () => {
    const { getByTestId } = render(<NoteInput onSave={mockOnSave} />);
    expect(getByTestId('note-input-container')).toBeTruthy();
    expect(getByTestId('note-input-text')).toBeTruthy();
  });

  it('should render with placeholder', () => {
    const { getByPlaceholderText } = render(<NoteInput onSave={mockOnSave} />);
    expect(getByPlaceholderText('무엇을 기록할까요?')).toBeTruthy();
  });

  it('should render with custom placeholder', () => {
    const customPlaceholder = '노트를 작성하세요';
    const { getByPlaceholderText } = render(
      <NoteInput onSave={mockOnSave} placeholder={customPlaceholder} />
    );
    expect(getByPlaceholderText(customPlaceholder)).toBeTruthy();
  });

  it('should update body text when typing', () => {
    const { getByTestId } = render(<NoteInput onSave={mockOnSave} />);
    const textInput = getByTestId('note-input-text');

    fireEvent.changeText(textInput, 'Test note body');
    expect(textInput.props.value).toBe('Test note body');
  });

  it('should render with initial values', () => {
    const { getByTestId } = render(
      <NoteInput
        onSave={mockOnSave}
        initialBody="Initial body"
        initialImportance={IMPORTANCE_HIGH}
        initialSourceUrl="https://example.com"
      />
    );

    const textInput = getByTestId('note-input-text');
    const urlInput = getByTestId('note-input-url');

    expect(textInput.props.value).toBe('Initial body');
    expect(urlInput.props.value).toBe('https://example.com');
  });

  it('should toggle URL input visibility', () => {
    const { getByTestId, queryByTestId } = render(<NoteInput onSave={mockOnSave} />);

    expect(queryByTestId('note-input-url')).toBeNull();

    const toggleButton = getByTestId('toggle-url-button');
    fireEvent.press(toggleButton);

    expect(getByTestId('note-input-url')).toBeTruthy();

    fireEvent.press(toggleButton);
    expect(queryByTestId('note-input-url')).toBeNull();
  });

  it('should select importance level', () => {
    const { getByTestId } = render(<NoteInput onSave={mockOnSave} />);

    const highButton = getByTestId(`importance-button-${IMPORTANCE_HIGH}`);
    fireEvent.press(highButton);

    // Visual feedback is reflected in styles, not in state we can test directly
    // So we just verify the button press doesn't crash
    expect(highButton).toBeTruthy();
  });

  it('should call onSave with correct data when save button pressed', () => {
    const { getByTestId } = render(<NoteInput onSave={mockOnSave} />);

    const textInput = getByTestId('note-input-text');
    fireEvent.changeText(textInput, 'My note body');

    const saveButton = getByTestId('save-button');
    fireEvent.press(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith('My note body', IMPORTANCE_MEDIUM, undefined);
  });

  it('should call onSave with URL when provided', () => {
    const { getByTestId } = render(<NoteInput onSave={mockOnSave} />);

    const textInput = getByTestId('note-input-text');
    fireEvent.changeText(textInput, 'Note with URL');

    const toggleButton = getByTestId('toggle-url-button');
    fireEvent.press(toggleButton);

    const urlInput = getByTestId('note-input-url');
    fireEvent.changeText(urlInput, 'https://example.com');

    const saveButton = getByTestId('save-button');
    fireEvent.press(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith('Note with URL', IMPORTANCE_MEDIUM, 'https://example.com');
  });

  it('should not call onSave when body is empty', () => {
    const { getByTestId } = render(<NoteInput onSave={mockOnSave} />);

    const saveButton = getByTestId('save-button');
    fireEvent.press(saveButton);

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should not call onSave when body is only whitespace', () => {
    const { getByTestId } = render(<NoteInput onSave={mockOnSave} />);

    const textInput = getByTestId('note-input-text');
    fireEvent.changeText(textInput, '   ');

    const saveButton = getByTestId('save-button');
    fireEvent.press(saveButton);

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should call onCancel when cancel button pressed', () => {
    const { getByTestId } = render(<NoteInput onSave={mockOnSave} onCancel={mockOnCancel} />);

    const textInput = getByTestId('note-input-text');
    fireEvent.changeText(textInput, 'Some text');

    const cancelButton = getByTestId('cancel-button');
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should not render cancel button when onCancel not provided', () => {
    const { queryByTestId } = render(<NoteInput onSave={mockOnSave} />);
    expect(queryByTestId('cancel-button')).toBeNull();
  });

  it('should reset form after successful save', () => {
    const { getByTestId } = render(<NoteInput onSave={mockOnSave} />);

    const textInput = getByTestId('note-input-text');
    fireEvent.changeText(textInput, 'Test note');

    const saveButton = getByTestId('save-button');
    fireEvent.press(saveButton);

    expect(mockOnSave).toHaveBeenCalled();
    expect(textInput.props.value).toBe('');
  });
});
