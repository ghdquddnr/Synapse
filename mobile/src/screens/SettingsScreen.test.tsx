/**
 * SettingsScreen Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import SettingsScreen from './SettingsScreen';
import * as notesDb from '@/services/database/notes';
import * as reflectionsDb from '@/services/database/reflections';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock database functions
jest.mock('@/services/database/notes', () => ({
  getNotesCount: jest.fn(),
}));

jest.mock('@/services/database/reflections', () => ({
  getReflectionCount: jest.fn(),
}));

describe('SettingsScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderScreen = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SettingsScreen />
      </QueryClientProvider>
    );
  };

  describe('Header and Layout', () => {
    it('should render screen title', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByText('설정')).toBeTruthy();
    });

    it('should render all sections', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByText('동기화')).toBeTruthy();
      expect(screen.getByText('표시')).toBeTruthy();
      expect(screen.getByText('정보')).toBeTruthy();
      expect(screen.getByText('백업 (M2 예정)')).toBeTruthy();
    });
  });

  describe('Sync Section', () => {
    it('should display last sync time as "아직 동기화하지 않음" when never synced', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByTestId('last-sync-time')).toHaveTextContent('아직 동기화하지 않음');
    });

    it('should render manual sync button', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      const syncButton = screen.getByTestId('manual-sync-button');
      expect(syncButton).toBeTruthy();
      expect(screen.getByText('지금 동기화')).toBeTruthy();
    });

    it('should trigger sync when manual sync button is pressed', async () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      const syncButton = screen.getByTestId('manual-sync-button');
      fireEvent.press(syncButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          '동기화 완료',
          '데이터가 서버와 동기화되었습니다.'
        );
      });
    });

    it('should render auto-sync toggle', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByText('자동 동기화')).toBeTruthy();
      expect(screen.getByText('네트워크 연결 시 자동으로 동기화')).toBeTruthy();

      const toggle = screen.getByTestId('auto-sync-toggle');
      expect(toggle).toBeTruthy();
      expect(toggle.props.value).toBe(true); // Default enabled
    });

    it('should toggle auto-sync when switch is pressed', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      const toggle = screen.getByTestId('auto-sync-toggle');
      expect(toggle.props.value).toBe(true);

      fireEvent(toggle, 'valueChange', false);
      expect(toggle.props.value).toBe(false);

      fireEvent(toggle, 'valueChange', true);
      expect(toggle.props.value).toBe(true);
    });

    it('should not display sync error when there is no error', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.queryByTestId('sync-error')).toBeNull();
    });
  });

  describe('Display Section', () => {
    it('should render dark mode toggle (disabled)', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByText('다크 모드')).toBeTruthy();
      expect(screen.getByText('어두운 테마 사용 (준비 중)')).toBeTruthy();

      const toggle = screen.getByTestId('dark-mode-toggle');
      expect(toggle).toBeTruthy();
      expect(toggle.props.disabled).toBe(true);
    });

    it('should render font size setting (placeholder)', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByText('글꼴 크기')).toBeTruthy();
      expect(screen.getByText('보통 (준비 중)')).toBeTruthy();
    });
  });

  describe('Info Section', () => {
    it('should display app version', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByText('버전')).toBeTruthy();
      expect(screen.getByTestId('app-version')).toHaveTextContent('1.0.0');
    });

    it('should display notes count', async () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(42);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('notes-count')).toHaveTextContent('42개');
      });
    });

    it('should display reflections count', async () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(15);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('reflections-count')).toHaveTextContent('15개');
      });
    });

    it('should display relations count', async () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('relations-count')).toHaveTextContent('0개');
      });
    });

    it('should display storage usage placeholder', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByText('저장소 사용량')).toBeTruthy();
      expect(screen.getByTestId('storage-usage')).toHaveTextContent('계산 중...');
    });

    it('should handle zero counts correctly', async () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('notes-count')).toHaveTextContent('0개');
        expect(screen.getByTestId('reflections-count')).toHaveTextContent('0개');
        expect(screen.getByTestId('relations-count')).toHaveTextContent('0개');
      });
    });

    it('should handle large counts correctly', async () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(9999);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(365);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('notes-count')).toHaveTextContent('9999개');
        expect(screen.getByTestId('reflections-count')).toHaveTextContent('365개');
      });
    });
  });

  describe('Backup Section', () => {
    it('should display backup placeholder for M2', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByText('백업 (M2 예정)')).toBeTruthy();
      expect(screen.getByText(/JSON 내보내기\/가져오기 기능은/)).toBeTruthy();
      expect(screen.getByText(/다음 버전에서 제공될 예정입니다/)).toBeTruthy();
    });
  });

  describe('Footer', () => {
    it('should display app footer', () => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);

      renderScreen();

      expect(screen.getByText('Synapse - 오프라인 우선 노트 앱')).toBeTruthy();
      expect(screen.getByText('Made with ❤️ for thoughtful note-taking')).toBeTruthy();
    });
  });

  describe('Last Sync Time Formatting', () => {
    beforeEach(() => {
      (notesDb.getNotesCount as jest.Mock).mockResolvedValue(0);
      (reflectionsDb.getReflectionCount as jest.Mock).mockResolvedValue(0);
    });

    it('should show "아직 동기화하지 않음" when lastSyncedAt is null', () => {
      renderScreen();
      expect(screen.getByTestId('last-sync-time')).toHaveTextContent('아직 동기화하지 않음');
    });

    // Note: Testing time-dependent formatting would require mocking Date
    // For now, we'll test the null case and integration test the others
  });

  describe('Loading States', () => {
    it('should show default values while loading counts', () => {
      (notesDb.getNotesCount as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      (reflectionsDb.getReflectionCount as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderScreen();

      // Should show default 0 values
      expect(screen.getByTestId('notes-count')).toHaveTextContent('0개');
      expect(screen.getByTestId('reflections-count')).toHaveTextContent('0개');
    });
  });
});
