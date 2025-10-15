/**
 * Network monitoring service
 * Tracks network connectivity state and triggers sync on recovery
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkMonitorConfig {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onConnectionRecovered?: () => void;
}

class NetworkMonitor {
  private isOnline: boolean = true;
  private wasOffline: boolean = false;
  private unsubscribe: NetInfoSubscription | null = null;
  private config: NetworkMonitorConfig = {};

  /**
   * Initialize network monitoring
   */
  initialize(config: NetworkMonitorConfig = {}): void {
    this.config = config;

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.handleNetworkChange(state);
    });
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const isConnected = state.isConnected === true && state.isInternetReachable === true;

    if (isConnected && !this.isOnline) {
      // Network recovered
      this.isOnline = true;

      if (this.wasOffline && this.config.onConnectionRecovered) {
        this.config.onConnectionRecovered();
      }

      if (this.config.onConnected) {
        this.config.onConnected();
      }

      this.wasOffline = false;
    } else if (!isConnected && this.isOnline) {
      // Network lost
      this.isOnline = false;
      this.wasOffline = true;

      if (this.config.onDisconnected) {
        this.config.onDisconnected();
      }
    }
  }

  /**
   * Get current network status
   */
  async getStatus(): Promise<NetworkStatus> {
    const state = await NetInfo.fetch();
    const isConnected = state.isConnected === true && state.isInternetReachable === true;

    if (state.isConnected === null || state.isInternetReachable === null) {
      return 'unknown';
    }

    return isConnected ? 'online' : 'offline';
  }

  /**
   * Check if currently online
   */
  async isConnected(): Promise<boolean> {
    const status = await this.getStatus();
    return status === 'online';
  }

  /**
   * Cleanup and unsubscribe
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Singleton instance
export const networkMonitor = new NetworkMonitor();
