/**
 * App state monitoring service
 * Tracks app foreground/background state and triggers sync on foreground
 */

import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';

export interface AppStateMonitorConfig {
  onForeground?: () => void;
  onBackground?: () => void;
}

class AppStateMonitor {
  private currentState: AppStateStatus = AppState.currentState;
  private subscription: NativeEventSubscription | null = null;
  private config: AppStateMonitorConfig = {};

  /**
   * Initialize app state monitoring
   */
  initialize(config: AppStateMonitorConfig = {}): void {
    this.config = config;
    this.currentState = AppState.currentState;

    // Subscribe to app state changes
    this.subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      this.handleAppStateChange(nextState);
    });
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextState: AppStateStatus): void {
    if (this.currentState.match(/inactive|background/) && nextState === 'active') {
      // App came to foreground
      if (this.config.onForeground) {
        this.config.onForeground();
      }
    } else if (this.currentState === 'active' && nextState.match(/inactive|background/)) {
      // App went to background
      if (this.config.onBackground) {
        this.config.onBackground();
      }
    }

    this.currentState = nextState;
  }

  /**
   * Get current app state
   */
  getState(): AppStateStatus {
    return this.currentState;
  }

  /**
   * Check if app is in foreground
   */
  isActive(): boolean {
    return this.currentState === 'active';
  }

  /**
   * Cleanup and unsubscribe
   */
  cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

// Singleton instance
export const appStateMonitor = new AppStateMonitor();
