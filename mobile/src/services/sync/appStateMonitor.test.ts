/**
 * App state monitor tests
 */

import { appStateMonitor } from './appStateMonitor';
import { AppState, AppStateStatus } from 'react-native';

// Mock React Native AppState
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

describe('appStateMonitor', () => {
  let mockRemove: jest.Mock;
  let mockEventListeners: { [key: string]: Function };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemove = jest.fn();
    mockEventListeners = {};

    // Mock addEventListener to capture listeners
    (AppState.addEventListener as jest.Mock).mockImplementation((event, listener) => {
      mockEventListeners[event] = listener;
      return { remove: mockRemove };
    });
  });

  describe('initialize()', () => {
    it('should subscribe to app state changes', () => {
      appStateMonitor.initialize();

      expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should call onForeground callback when app comes to foreground', () => {
      const onForeground = jest.fn();
      appStateMonitor.initialize({ onForeground });

      // Simulate app state change from background to active
      const listener = mockEventListeners['change'];
      listener('background');
      listener('active');

      expect(onForeground).toHaveBeenCalled();
    });

    it('should call onForeground callback when app comes from inactive to active', () => {
      const onForeground = jest.fn();
      appStateMonitor.initialize({ onForeground });

      const listener = mockEventListeners['change'];
      listener('inactive');
      listener('active');

      expect(onForeground).toHaveBeenCalled();
    });

    it('should call onBackground callback when app goes to background', () => {
      const onBackground = jest.fn();
      appStateMonitor.initialize({ onBackground });

      const listener = mockEventListeners['change'];
      listener('active');
      listener('background');

      expect(onBackground).toHaveBeenCalled();
    });

    it('should call onBackground callback when app goes to inactive', () => {
      const onBackground = jest.fn();
      appStateMonitor.initialize({ onBackground });

      const listener = mockEventListeners['change'];
      listener('active');
      listener('inactive');

      expect(onBackground).toHaveBeenCalled();
    });

    it('should not call callbacks for same state transitions', () => {
      const onForeground = jest.fn();
      const onBackground = jest.fn();
      appStateMonitor.initialize({ onForeground, onBackground });

      const listener = mockEventListeners['change'];

      // Transition from active to active (no change)
      listener('active');
      listener('active');

      expect(onForeground).not.toHaveBeenCalled();
      expect(onBackground).not.toHaveBeenCalled();
    });
  });

  describe('getState()', () => {
    it('should return current app state', () => {
      appStateMonitor.initialize();

      const state = appStateMonitor.getState();
      expect(typeof state).toBe('string');
      expect(['active', 'background', 'inactive']).toContain(state);
    });

    it('should return updated state after state change', () => {
      appStateMonitor.initialize();

      const listener = mockEventListeners['change'];
      listener('background');

      const state = appStateMonitor.getState();
      expect(state).toBe('background');
    });
  });

  describe('isActive()', () => {
    it('should return true when app is active', () => {
      appStateMonitor.initialize();

      const listener = mockEventListeners['change'];
      listener('active');

      expect(appStateMonitor.isActive()).toBe(true);
    });

    it('should return false when app is in background', () => {
      appStateMonitor.initialize();

      const listener = mockEventListeners['change'];
      listener('background');

      expect(appStateMonitor.isActive()).toBe(false);
    });

    it('should return false when app is inactive', () => {
      appStateMonitor.initialize();

      const listener = mockEventListeners['change'];
      listener('inactive');

      expect(appStateMonitor.isActive()).toBe(false);
    });
  });

  describe('cleanup()', () => {
    it('should unsubscribe from app state changes', () => {
      appStateMonitor.initialize();
      appStateMonitor.cleanup();

      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup when not initialized', () => {
      // Should not throw
      expect(() => appStateMonitor.cleanup()).not.toThrow();
    });
  });
});
