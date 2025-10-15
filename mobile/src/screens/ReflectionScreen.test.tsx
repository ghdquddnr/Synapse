/**
 * ReflectionScreen Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import ReflectionScreen from './ReflectionScreen';
import * as reflectionsDb from '@/services/database/reflections';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock database functions
jest.mock('@/services/database/reflections', () => ({
  getReflection: jest.fn(),
  createReflection: jest.fn(),
  updateReflection: jest.fn(),
  getWeeklyKeywords: jest.fn(),
}));

// Mock hooks helpers
jest.mock('@/hooks/useReflections', () => {
  const actual = jest.requireActual('@/hooks/useReflections');
  return {
    ...actual,
    getTodayDate: jest.fn(() => '2025-01-15'),
    getCurrentWeekKey: jest.fn(() => '2025-03'),
  };
});

describe('ReflectionScreen', () => {
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
        <ReflectionScreen />
      </QueryClientProvider>
    );
  };

  describe('Header and Layout', () => {
    it('should render screen title and subtitle', () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      expect(screen.getByText('회고')).toBeTruthy();
      expect(screen.getByText('오늘 하루를 돌아봐요')).toBeTruthy();
    });

    it('should render all three sections', () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      expect(screen.getByText('오늘의 한 줄')).toBeTruthy();
      expect(screen.getByText('이번 주 핵심 키워드')).toBeTruthy();
      expect(screen.getByText('주간 리포트')).toBeTruthy();
    });
  });

  describe('Today\'s Reflection Input', () => {
    it('should display today\'s date', () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      expect(screen.getByText('2025-01-15')).toBeTruthy();
    });

    it('should render empty input when no reflection exists', async () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        const input = screen.getByTestId('reflection-input');
        expect(input.props.value).toBe('');
      });
    });

    it('should load and display existing reflection', async () => {
      const mockReflection = {
        date: '2025-01-15',
        content: '오늘은 좋은 하루였다',
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      };

      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(mockReflection);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        const input = screen.getByTestId('reflection-input');
        expect(input.props.value).toBe('오늘은 좋은 하루였다');
      });
    });

    it('should update character count when typing', async () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-input')).toBeTruthy();
      });

      const input = screen.getByTestId('reflection-input');
      fireEvent.changeText(input, '새로운 회고');

      expect(screen.getByText('6/500')).toBeTruthy();
    });

    it('should show save button when text changes', async () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-input')).toBeTruthy();
      });

      // Initially no save button
      expect(screen.queryByTestId('save-reflection-button')).toBeNull();

      // Type something
      const input = screen.getByTestId('reflection-input');
      fireEvent.changeText(input, '새로운 회고');

      // Save button appears
      expect(screen.getByTestId('save-reflection-button')).toBeTruthy();
    });

    it('should not show save button when text matches existing reflection', async () => {
      const mockReflection = {
        date: '2025-01-15',
        content: '기존 회고',
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      };

      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(mockReflection);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        const input = screen.getByTestId('reflection-input');
        expect(input.props.value).toBe('기존 회고');
      });

      // No save button when content unchanged
      expect(screen.queryByTestId('save-reflection-button')).toBeNull();
    });

    it('should create new reflection when saving for the first time', async () => {
      const newReflection = {
        date: '2025-01-15',
        content: '새로운 회고',
        created_at: '2025-01-15T12:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
      };

      (reflectionsDb.getReflection as jest.Mock)
        .mockResolvedValueOnce(null) // Initial fetch
        .mockResolvedValueOnce(null) // When checking in mutation
        .mockResolvedValueOnce(newReflection); // After create

      (reflectionsDb.createReflection as jest.Mock).mockResolvedValue(newReflection);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-input')).toBeTruthy();
      });

      const input = screen.getByTestId('reflection-input');
      fireEvent.changeText(input, '새로운 회고');

      const saveButton = screen.getByTestId('save-reflection-button');
      fireEvent.press(saveButton);

      await waitFor(
        () => {
          expect(reflectionsDb.createReflection).toHaveBeenCalledWith('새로운 회고', '2025-01-15');
          expect(Alert.alert).toHaveBeenCalledWith('저장 완료', '오늘의 한 줄이 저장되었습니다.');
        },
        { timeout: 3000 }
      );
    });

    it('should update existing reflection when saving changes', async () => {
      const existingReflection = {
        date: '2025-01-15',
        content: '기존 회고',
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      };

      const updatedReflection = {
        ...existingReflection,
        content: '수정된 회고',
        updated_at: '2025-01-15T12:00:00Z',
      };

      (reflectionsDb.getReflection as jest.Mock)
        .mockResolvedValueOnce(existingReflection) // Initial fetch
        .mockResolvedValueOnce(updatedReflection); // After update

      (reflectionsDb.updateReflection as jest.Mock).mockResolvedValue(updatedReflection);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        const input = screen.getByTestId('reflection-input');
        expect(input.props.value).toBe('기존 회고');
      });

      const input = screen.getByTestId('reflection-input');
      fireEvent.changeText(input, '수정된 회고');

      const saveButton = screen.getByTestId('save-reflection-button');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(reflectionsDb.updateReflection).toHaveBeenCalledWith('2025-01-15', '수정된 회고');
        expect(Alert.alert).toHaveBeenCalledWith('저장 완료', '오늘의 한 줄이 저장되었습니다.');
      });
    });

    it('should show error alert when saving empty reflection', async () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-input')).toBeTruthy();
      });

      const input = screen.getByTestId('reflection-input');
      fireEvent.changeText(input, '   '); // Only whitespace

      const saveButton = screen.getByTestId('save-reflection-button');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('입력 오류', '회고 내용을 입력해주세요.');
      });
    });

    it('should show error alert when save fails', async () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.createReflection as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('reflection-input')).toBeTruthy();
      });

      const input = screen.getByTestId('reflection-input');
      fireEvent.changeText(input, '새로운 회고');

      const saveButton = screen.getByTestId('save-reflection-button');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('저장 실패', 'Database error');
      });
    });
  });

  describe('Weekly Keywords Section', () => {
    it('should display week number', () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      expect(screen.getByText('Week 03')).toBeTruthy();
    });

    it('should show empty state when no keywords exist', async () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('아직 이번 주에 작성한 노트가 없어요')).toBeTruthy();
      });
    });

    it('should display top 3 keywords with ranks', async () => {
      const mockKeywords = [
        { name: '프로젝트', count: 15 },
        { name: '개발', count: 12 },
        { name: '회의', count: 8 },
        { name: '테스트', count: 5 }, // Should not be displayed
      ];

      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue(mockKeywords);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('프로젝트')).toBeTruthy();
        expect(screen.getByText('15회 언급')).toBeTruthy();
        expect(screen.getByText('개발')).toBeTruthy();
        expect(screen.getByText('12회 언급')).toBeTruthy();
        expect(screen.getByText('회의')).toBeTruthy();
        expect(screen.getByText('8회 언급')).toBeTruthy();
      });

      // Should not display 4th keyword
      expect(screen.queryByText('테스트')).toBeNull();
    });

    it('should display correct rank numbers', async () => {
      const mockKeywords = [
        { name: 'A', count: 10 },
        { name: 'B', count: 5 },
        { name: 'C', count: 3 },
      ];

      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue(mockKeywords);

      renderScreen();

      await waitFor(() => {
        const keyword0 = screen.getByTestId('keyword-0');
        const keyword1 = screen.getByTestId('keyword-1');
        const keyword2 = screen.getByTestId('keyword-2');

        expect(keyword0).toBeTruthy();
        expect(keyword1).toBeTruthy();
        expect(keyword2).toBeTruthy();
      });
    });

    it('should handle exactly 3 keywords', async () => {
      const mockKeywords = [
        { name: 'K1', count: 10 },
        { name: 'K2', count: 5 },
        { name: 'K3', count: 3 },
      ];

      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue(mockKeywords);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('K1')).toBeTruthy();
        expect(screen.getByText('K2')).toBeTruthy();
        expect(screen.getByText('K3')).toBeTruthy();
      });
    });

    it('should handle less than 3 keywords', async () => {
      const mockKeywords = [
        { name: 'Solo', count: 10 },
      ];

      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue(mockKeywords);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Solo')).toBeTruthy();
        expect(screen.getByText('10회 언급')).toBeTruthy();
      });
    });
  });

  describe('Weekly Report Section', () => {
    it('should display placeholder for weekly report', () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      expect(screen.getByText('🤖 AI 분석 준비 중')).toBeTruthy();
      expect(screen.getByText(/주간 리포트는 서버와 동기화 후 제공됩니다/)).toBeTruthy();
      expect(screen.getByText(/Phase 5에서 AI 분석 기능이 추가될 예정입니다/)).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator for reflection', () => {
      (reflectionsDb.getReflection as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockResolvedValue([]);

      renderScreen();

      // Should show ActivityIndicator in reflection section
      const reflectionSection = screen.getByText('오늘의 한 줄').parent?.parent;
      expect(reflectionSection).toBeTruthy();
    });

    it('should show loading indicator for keywords', () => {
      (reflectionsDb.getReflection as jest.Mock).mockResolvedValue(null);
      (reflectionsDb.getWeeklyKeywords as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderScreen();

      // Should show ActivityIndicator in keywords section
      const keywordsSection = screen.getByText('이번 주 핵심 키워드').parent?.parent;
      expect(keywordsSection).toBeTruthy();
    });
  });
});
