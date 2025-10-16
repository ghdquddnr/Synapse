/**
 * Network monitor tests
 */

import { networkMonitor, NetworkStatus } from './networkMonitor';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo');

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('networkMonitor', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(mockUnsubscribe);

    // Reset networkMonitor state by cleaning up
    networkMonitor.cleanup();
  });

  describe('initialize()', () => {
    it('should subscribe to network state changes', () => {
      networkMonitor.initialize();

      expect(mockNetInfo.addEventListener).toHaveBeenCalledTimes(1);
      expect(mockNetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call onConnected callback when network is connected', () => {
      const onConnected = jest.fn();
      networkMonitor.initialize({ onConnected });

      const listener = mockNetInfo.addEventListener.mock.calls[0][0];

      // First simulate offline state to set isOnline = false
      listener({
        isConnected: false,
        isInternetReachable: false,
      } as NetInfoState);

      // Then simulate network state change to connected
      listener({
        isConnected: true,
        isInternetReachable: true,
      } as NetInfoState);

      expect(onConnected).toHaveBeenCalled();
    });

    it('should call onDisconnected callback when network is lost', () => {
      const onDisconnected = jest.fn();
      networkMonitor.initialize({ onDisconnected });

      // First, simulate connected state
      const listener = mockNetInfo.addEventListener.mock.calls[0][0];
      listener({
        isConnected: true,
        isInternetReachable: true,
      } as NetInfoState);

      // Then simulate disconnected state
      listener({
        isConnected: false,
        isInternetReachable: false,
      } as NetInfoState);

      expect(onDisconnected).toHaveBeenCalled();
    });

    it('should call onConnectionRecovered callback when network recovers', () => {
      const onConnectionRecovered = jest.fn();
      networkMonitor.initialize({ onConnectionRecovered });

      const listener = mockNetInfo.addEventListener.mock.calls[0][0];

      // First, simulate disconnected state
      listener({
        isConnected: false,
        isInternetReachable: false,
      } as NetInfoState);

      // Then simulate connected state (recovery)
      listener({
        isConnected: true,
        isInternetReachable: true,
      } as NetInfoState);

      expect(onConnectionRecovered).toHaveBeenCalled();
    });
  });

  describe('getStatus()', () => {
    it('should return "online" when connected', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as NetInfoState);

      const status = await networkMonitor.getStatus();
      expect(status).toBe('online');
    });

    it('should return "offline" when disconnected', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as NetInfoState);

      const status = await networkMonitor.getStatus();
      expect(status).toBe('offline');
    });

    it('should return "unknown" when connection state is null', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: null,
        isInternetReachable: null,
      } as NetInfoState);

      const status = await networkMonitor.getStatus();
      expect(status).toBe('unknown');
    });
  });

  describe('isConnected()', () => {
    it('should return true when online', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as NetInfoState);

      const isConnected = await networkMonitor.isConnected();
      expect(isConnected).toBe(true);
    });

    it('should return false when offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as NetInfoState);

      const isConnected = await networkMonitor.isConnected();
      expect(isConnected).toBe(false);
    });

    it('should return false when status is unknown', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: null,
        isInternetReachable: null,
      } as NetInfoState);

      const isConnected = await networkMonitor.isConnected();
      expect(isConnected).toBe(false);
    });
  });

  describe('cleanup()', () => {
    it('should unsubscribe from network state changes', () => {
      networkMonitor.initialize();
      networkMonitor.cleanup();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup when not initialized', () => {
      // Should not throw
      expect(() => networkMonitor.cleanup()).not.toThrow();
    });
  });
});
