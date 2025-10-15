import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import HomeScreen from './HomeScreen';
import * as notesService from '@/services/database/notes';
import type { Note } from '@/types';

// Mock modules
jest.mock('@/services/database/notes');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Test data
const mockNote: Note = {
  id: '01234567-89ab-cdef-0123-456789abcdef',
  body: '테스트 노트입니다\n두 번째 줄',
  importance: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockNotes: Note[] = [
  mockNote,
  {
    id: '01234567-89ab-cdef-0123-456789abcde0',
    body: '또 다른 노트',
    importance: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper to render with QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const renderWithClient = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return {
    ...render(
      <QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>
    ),
    queryClient: testQueryClient,
  };
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('렌더링', () => {
    it('로딩 상태를 올바르게 표시한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('note-input-container')).toBeTruthy();
        expect(getByTestId('loading-spinner')).toBeTruthy();
      });
    });

    it('노트가 없을 때 빈 상태를 표시한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue([]);

      const { getByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('empty-state')).toBeTruthy();
      });
    });

    it('노트 목록을 올바르게 렌더링한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue(mockNotes);

      const { getAllByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        const noteCards = getAllByTestId('note-card');
        expect(noteCards).toHaveLength(2);
      });
    });

    it('에러 상태를 올바르게 표시한다', async () => {
      const errorMessage = '데이터베이스 연결 실패';
      (notesService.getTodayNotes as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      const { getByTestId, getByText } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('error-state')).toBeTruthy();
        expect(getByText(errorMessage)).toBeTruthy();
      });
    });
  });

  describe('노트 작성', () => {
    it('새 노트를 성공적으로 저장한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue([]);
      (notesService.createNote as jest.Mock).mockResolvedValue({
        ...mockNote,
        id: 'new-note-id',
      });

      const { getByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('note-input-text')).toBeTruthy();
      });

      // Input note text
      const noteInput = getByTestId('note-input-text');
      fireEvent.changeText(noteInput, '새로운 노트');

      // Click save button
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(notesService.createNote).toHaveBeenCalledWith({
          body: '새로운 노트',
          importance: 2,
          source_url: undefined,
        });
      });
    });

    it('노트 저장 실패 시 에러 알림을 표시한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue([]);
      (notesService.createNote as jest.Mock).mockRejectedValue(
        new Error('저장 실패')
      );

      const { getByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('note-input-text')).toBeTruthy();
      });

      // Input note text
      const noteInput = getByTestId('note-input-text');
      fireEvent.changeText(noteInput, '새로운 노트');

      // Click save button
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          '저장 실패',
          expect.stringContaining('저장 실패')
        );
      });
    });

    it('중요도와 URL을 포함하여 노트를 저장한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue([]);
      (notesService.createNote as jest.Mock).mockResolvedValue(mockNote);

      const { getByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('note-input-text')).toBeTruthy();
      });

      // Input note text
      const noteInput = getByTestId('note-input-text');
      fireEvent.changeText(noteInput, '중요한 노트');

      // Change importance to high
      const highImportanceButton = getByTestId('importance-button-3');
      fireEvent.press(highImportanceButton);

      // Toggle URL input
      const urlToggle = getByTestId('toggle-url-button');
      fireEvent.press(urlToggle);

      // Input URL
      const urlInput = getByTestId('note-input-url');
      fireEvent.changeText(urlInput, 'https://example.com');

      // Click save button
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(notesService.createNote).toHaveBeenCalledWith({
          body: '중요한 노트',
          importance: 3,
          source_url: 'https://example.com',
        });
      });
    });
  });

  describe('노트 삭제', () => {
    it('노트 삭제 확인 다이얼로그를 표시한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue([mockNote]);

      const { getAllByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getAllByTestId('note-card')).toHaveLength(1);
      });

      // Click delete button
      const deleteButton = getAllByTestId('delete-button')[0];
      fireEvent.press(deleteButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        '노트 삭제',
        '이 노트를 삭제하시겠습니까?',
        expect.any(Array)
      );
    });

    it('삭제 확인 시 노트를 성공적으로 삭제한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue([mockNote]);
      (notesService.deleteNote as jest.Mock).mockResolvedValue(undefined);

      const alertMock = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
      alertMock.mockImplementation((title, message, buttons) => {
        // Simulate pressing the delete button
        if (buttons && buttons[1]?.onPress) {
          buttons[1].onPress();
        }
        return 0;
      });

      const { getAllByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getAllByTestId('note-card')).toHaveLength(1);
      });

      // Click delete button
      const deleteButton = getAllByTestId('delete-button')[0];
      fireEvent.press(deleteButton);

      await waitFor(() => {
        expect(notesService.deleteNote).toHaveBeenCalledWith(mockNote.id);
      });
    });

    it('노트 삭제 실패 시 에러 알림을 표시한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue([mockNote]);
      (notesService.deleteNote as jest.Mock).mockRejectedValue(
        new Error('삭제 실패')
      );

      const alertMock = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
      let deleteCallback: (() => void) | undefined;

      alertMock.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[1]?.onPress) {
          deleteCallback = buttons[1].onPress as () => void;
        }
        return 0;
      });

      const { getAllByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getAllByTestId('note-card')).toHaveLength(1);
      });

      // Click delete button
      const deleteButton = getAllByTestId('delete-button')[0];
      fireEvent.press(deleteButton);

      // Execute delete callback
      if (deleteCallback) {
        deleteCallback();
      }

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith(
          '삭제 실패',
          expect.stringContaining('삭제 실패')
        );
      });
    });
  });

  describe('옵션 섹션', () => {
    it('옵션 섹션을 토글할 수 있다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue(mockNotes);

      const { getByTestId, queryByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('options-toggle')).toBeTruthy();
      });

      // Initially closed
      expect(queryByTestId('options-content')).toBeNull();

      // Open options
      const optionsToggle = getByTestId('options-toggle');
      fireEvent.press(optionsToggle);

      await waitFor(() => {
        expect(getByTestId('options-content')).toBeTruthy();
      });

      // Close options
      fireEvent.press(optionsToggle);

      await waitFor(() => {
        expect(queryByTestId('options-content')).toBeNull();
      });
    });

    it('옵션 섹션에 노트 개수를 표시한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue(mockNotes);

      const { getByTestId, getByText } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('options-toggle')).toBeTruthy();
      });

      // Open options
      const optionsToggle = getByTestId('options-toggle');
      fireEvent.press(optionsToggle);

      await waitFor(() => {
        expect(getByText(`오늘 작성한 노트: ${mockNotes.length}개`)).toBeTruthy();
      });
    });
  });

  // Pull-to-refresh functionality is tested through integration testing
  // Unit testing RefreshControl is complex and doesn't provide much value

  describe('에러 복구', () => {
    it('에러 상태에서 재시도 버튼을 클릭하면 다시 로드한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockRejectedValue(
        new Error('데이터베이스 연결 실패')
      );

      const { getByTestId } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByTestId('error-state')).toBeTruthy();
      });

      // Clear mock and make it succeed
      jest.clearAllMocks();
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue(mockNotes);

      // Click retry button
      const retryButton = getByTestId('retry-button');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(notesService.getTodayNotes).toHaveBeenCalled();
      });
    });
  });

  describe('섹션 헤더', () => {
    it('섹션 헤더에 올바른 노트 개수를 표시한다', async () => {
      (notesService.getTodayNotes as jest.Mock).mockResolvedValue(mockNotes);

      const { getByText } = renderWithClient(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('오늘의 노트')).toBeTruthy();
        expect(getByText(mockNotes.length.toString())).toBeTruthy();
      });
    });
  });
});
