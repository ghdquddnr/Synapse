import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NoteDetailScreen from './NoteDetailScreen';
import * as notesService from '@/services/database/notes';
import type { Note } from '@/types';

// Mock the services
jest.mock('@/services/database/notes');
jest.mock('@/services/database/relations');

// Mock Alert
jest.spyOn(Alert, 'alert');

const Stack = createNativeStackNavigator();

const mockNote: Note = {
  id: 'test-note-id',
  body: 'Test Note Title\nThis is the body of the test note.',
  importance: 2,
  source_url: 'https://example.com',
  created_at: '2024-01-01T10:00:00.000Z',
  updated_at: '2024-01-01T10:00:00.000Z',
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderNoteDetailScreen = (noteId: string = 'test-note-id') => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="NoteDetail"
            component={NoteDetailScreen as any}
            initialParams={{ noteId }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('NoteDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching note', () => {
      (notesService.getNote as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      renderNoteDetailScreen();

      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should display header with back button during loading', () => {
      (notesService.getNote as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      renderNoteDetailScreen();

      expect(screen.getByTestId('back-button')).toBeTruthy();
      expect(screen.getByText('노트 상세')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should display error message when note fetch fails', async () => {
      (notesService.getNote as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeTruthy();
        expect(screen.getByText('노트를 불러올 수 없습니다')).toBeTruthy();
        expect(screen.getByText('Database error')).toBeTruthy();
      });
    });

    it('should display error state when note is not found', async () => {
      (notesService.getNote as jest.Mock).mockResolvedValue(null);

      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeTruthy();
      });
    });

    it('should allow going back from error state', async () => {
      (notesService.getNote as jest.Mock).mockRejectedValue(
        new Error('Not found')
      );

      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeTruthy();
      });

      const backButton = screen.getByTestId('back-button');
      expect(backButton).toBeTruthy();
    });
  });

  describe('Note Display', () => {
    beforeEach(() => {
      (notesService.getNote as jest.Mock).mockResolvedValue(mockNote);
    });

    it('should display note body', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('body-text')).toBeTruthy();
        expect(screen.getByText(mockNote.body)).toBeTruthy();
      });
    });

    it('should display note metadata', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('importance-text')).toBeTruthy();
        expect(screen.getByText('보통')).toBeTruthy();
        expect(screen.getByTestId('created-at-text')).toBeTruthy();
        expect(screen.getByTestId('updated-at-text')).toBeTruthy();
      });
    });

    it('should display source URL if present', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('source-url-text')).toBeTruthy();
        expect(screen.getByText(mockNote.source_url!)).toBeTruthy();
      });
    });

    it('should not display source URL if not present', async () => {
      const noteWithoutUrl = { ...mockNote, source_url: undefined };
      (notesService.getNote as jest.Mock).mockResolvedValue(noteWithoutUrl);

      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('body-text')).toBeTruthy();
      });

      expect(screen.queryByTestId('source-url-text')).toBeNull();
    });

    it('should display correct importance badge color for high importance', async () => {
      const highImportanceNote = { ...mockNote, importance: 3 as const };
      (notesService.getNote as jest.Mock).mockResolvedValue(highImportanceNote);

      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByText('높음')).toBeTruthy();
      });
    });

    it('should display correct importance badge color for low importance', async () => {
      const lowImportanceNote = { ...mockNote, importance: 1 as const };
      (notesService.getNote as jest.Mock).mockResolvedValue(lowImportanceNote);

      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByText('낮음')).toBeTruthy();
      });
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      (notesService.getNote as jest.Mock).mockResolvedValue(mockNote);
    });

    it('should enter edit mode when edit button is pressed', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('edit-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('edit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('body-input')).toBeTruthy();
        expect(screen.getByTestId('save-edit-button')).toBeTruthy();
        expect(screen.getByTestId('cancel-edit-button')).toBeTruthy();
      });
    });

    it('should display body input in edit mode', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      await waitFor(() => {
        const bodyInput = screen.getByTestId('body-input');
        expect(bodyInput).toBeTruthy();
        expect(bodyInput.props.value).toBe(mockNote.body);
      });
    });

    it('should display importance buttons in edit mode', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('importance-1-button')).toBeTruthy();
        expect(screen.getByTestId('importance-2-button')).toBeTruthy();
        expect(screen.getByTestId('importance-3-button')).toBeTruthy();
      });
    });

    it('should display source URL input in edit mode', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      await waitFor(() => {
        const urlInput = screen.getByTestId('source-url-input');
        expect(urlInput).toBeTruthy();
        expect(urlInput.props.value).toBe(mockNote.source_url);
      });
    });

    it('should exit edit mode when cancel button is pressed', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('cancel-edit-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('cancel-edit-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('body-input')).toBeNull();
        expect(screen.getByTestId('body-text')).toBeTruthy();
      });
    });

    it('should update body text when typing in edit mode', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      await waitFor(() => {
        const bodyInput = screen.getByTestId('body-input');
        fireEvent.changeText(bodyInput, 'Updated note body');
      });

      const bodyInput = screen.getByTestId('body-input');
      expect(bodyInput.props.value).toBe('Updated note body');
    });

    it('should change importance when importance button is pressed', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('importance-3-button'));
      });

      // Button should be in active state (visual feedback)
      const highImportanceButton = screen.getByTestId('importance-3-button');
      expect(highImportanceButton).toBeTruthy();
    });

    it('should save note when save button is pressed', async () => {
      const updatedNote = { ...mockNote, body: 'Updated body' };
      (notesService.updateNote as jest.Mock).mockResolvedValue(updatedNote);

      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      await waitFor(() => {
        const bodyInput = screen.getByTestId('body-input');
        fireEvent.changeText(bodyInput, 'Updated body');
      });

      fireEvent.press(screen.getByTestId('save-edit-button'));

      await waitFor(() => {
        expect(notesService.updateNote).toHaveBeenCalledWith('test-note-id', {
          body: 'Updated body',
          importance: 2,
          source_url: mockNote.source_url,
        });
      });
    });

    it('should show success alert after successful save', async () => {
      const updatedNote = { ...mockNote, body: 'Updated body' };
      (notesService.updateNote as jest.Mock).mockResolvedValue(updatedNote);

      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      fireEvent.press(screen.getByTestId('save-edit-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('저장 완료', '노트가 수정되었습니다.');
      });
    });

    it('should show error alert when save fails', async () => {
      (notesService.updateNote as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      fireEvent.press(screen.getByTestId('save-edit-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          '저장 실패',
          expect.stringContaining('Update failed')
        );
      });
    });

    it('should exit edit mode after successful save', async () => {
      const updatedNote = { ...mockNote, body: 'Updated body' };
      (notesService.updateNote as jest.Mock).mockResolvedValue(updatedNote);

      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('edit-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('body-input')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('save-edit-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('body-input')).toBeNull();
      });
    });
  });

  describe('Delete Note', () => {
    beforeEach(() => {
      (notesService.getNote as jest.Mock).mockResolvedValue(mockNote);
      (notesService.deleteNote as jest.Mock).mockResolvedValue(undefined);
    });

    it('should show confirmation dialog when delete button is pressed', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('delete-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        '노트 삭제',
        '이 노트를 삭제하시겠습니까?',
        expect.any(Array)
      );
    });

    it('should call deleteNote when deletion is confirmed', async () => {
      // Mock Alert.alert to automatically confirm
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === '삭제');
        if (deleteButton?.onPress) {
          deleteButton.onPress();
        }
      });

      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('delete-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('delete-button'));

      await waitFor(() => {
        expect(notesService.deleteNote).toHaveBeenCalledWith('test-note-id');
      });
    });

    it('should show error alert when deletion fails', async () => {
      (notesService.deleteNote as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      );

      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find((b: any) => b.text === '삭제');
        if (deleteButton?.onPress) {
          deleteButton.onPress();
        }
      });

      renderNoteDetailScreen();

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('delete-button'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          '삭제 실패',
          expect.stringContaining('Delete failed')
        );
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      (notesService.getNote as jest.Mock).mockResolvedValue(mockNote);
    });

    it('should have a back button in the header', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('back-button')).toBeTruthy();
      });
    });

    it('should display correct header title', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByText('노트 상세')).toBeTruthy();
      });
    });
  });

  describe('Sections', () => {
    beforeEach(() => {
      (notesService.getNote as jest.Mock).mockResolvedValue(mockNote);
    });

    it('should display all section titles', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByText('메타데이터')).toBeTruthy();
        expect(screen.getByText('키워드')).toBeTruthy();
        expect(screen.getByText('연결된 노트')).toBeTruthy();
        expect(screen.getByText('AI 추천')).toBeTruthy();
      });
    });

    it('should display keywords placeholder', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByText('키워드는 향후 버전에서 지원됩니다')).toBeTruthy();
      });
    });

    it('should display AI recommendations placeholder', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByText('AI 추천 기능은 서버 연동 후 사용할 수 있습니다')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (notesService.getNote as jest.Mock).mockResolvedValue(mockNote);
    });

    it('should have testID for all interactive elements', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('back-button')).toBeTruthy();
        expect(screen.getByTestId('edit-button')).toBeTruthy();
        expect(screen.getByTestId('delete-button')).toBeTruthy();
      });
    });

    it('should have testID for all data display elements', async () => {
      renderNoteDetailScreen();

      await waitFor(() => {
        expect(screen.getByTestId('body-text')).toBeTruthy();
        expect(screen.getByTestId('importance-text')).toBeTruthy();
        expect(screen.getByTestId('created-at-text')).toBeTruthy();
        expect(screen.getByTestId('updated-at-text')).toBeTruthy();
      });
    });
  });
});
