/**
 * Mock for @react-native-community/netinfo
 */

export interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

export interface NetInfoSubscription {
  (): void;
}

const mockNetInfo = {
  fetch: jest.fn<Promise<NetInfoState>, []>(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
    })
  ),
  addEventListener: jest.fn<NetInfoSubscription, [(state: NetInfoState) => void]>(() => {
    return jest.fn();
  }),
};

export default mockNetInfo;
