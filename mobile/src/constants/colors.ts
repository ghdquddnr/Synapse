// Color palette for light and dark modes

export const Colors = {
  light: {
    // Primary colors
    primary: '#007AFF',
    primaryLight: '#4DA2FF',
    primaryDark: '#0056B3',

    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F7',
    backgroundTertiary: '#EBEBED',

    // Text colors
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textPlaceholder: '#C7C7CC',

    // Border colors
    border: '#D1D1D6',
    borderLight: '#E5E5EA',

    // Semantic colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',

    // Importance levels
    importanceHigh: '#FF3B30',
    importanceMedium: '#FF9500',
    importanceLow: '#34C759',

    // Card/Component colors
    card: '#FFFFFF',
    cardShadow: 'rgba(0, 0, 0, 0.1)',

    // Tab bar colors
    tabBarActive: '#007AFF',
    tabBarInactive: '#8E8E93',
    tabBarBackground: '#F9F9F9',

    // Highlight colors (for search)
    highlight: '#FFEB3B',
    highlightText: '#000000',

    // Sync status
    syncSuccess: '#34C759',
    syncPending: '#FF9500',
    syncError: '#FF3B30',
    syncOffline: '#8E8E93',
  },

  dark: {
    // Primary colors
    primary: '#0A84FF',
    primaryLight: '#409CFF',
    primaryDark: '#006BD6',

    // Background colors
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    textTertiary: '#8E8E93',
    textPlaceholder: '#636366',

    // Border colors
    border: '#38383A',
    borderLight: '#48484A',

    // Semantic colors
    success: '#32D74B',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#0A84FF',

    // Importance levels
    importanceHigh: '#FF453A',
    importanceMedium: '#FF9F0A',
    importanceLow: '#32D74B',

    // Card/Component colors
    card: '#1C1C1E',
    cardShadow: 'rgba(0, 0, 0, 0.3)',

    // Tab bar colors
    tabBarActive: '#0A84FF',
    tabBarInactive: '#8E8E93',
    tabBarBackground: '#1C1C1E',

    // Highlight colors (for search)
    highlight: '#FFD60A',
    highlightText: '#000000',

    // Sync status
    syncSuccess: '#32D74B',
    syncPending: '#FF9F0A',
    syncError: '#FF453A',
    syncOffline: '#8E8E93',
  },
};

export type ColorScheme = keyof typeof Colors;
export type ColorName = keyof typeof Colors.light;

// Helper function to get color based on scheme
export const getColor = (scheme: ColorScheme, name: ColorName): string => {
  return Colors[scheme][name];
};

// Default color scheme
export const DEFAULT_COLOR_SCHEME: ColorScheme = 'light';
