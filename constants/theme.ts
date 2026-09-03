import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Brand Teals & Mints
    primary: '#12A89D',        // Primary Teal
    primaryDark: '#086B68',    // Deep Teal
    primaryLight: '#E7F7F3',   // Light Mint
    accent: '#086B68',         // Deep Teal Accent
    accentLight: '#E7F7F3',    // Light Mint Surface
    aiAccent: '#12A89D',       // AI Teal
    aiAccentLight: '#E7F7F3',  // AI Mint Background
    mint: '#B9EDE1',           // Mint Highlight
    lightMint: '#E7F7F3',      // Light Mint
    teal: '#12A89D',           // Teal
    deepTeal: '#086B68',       // Deep Teal
    darkTeal: '#073F3D',       // Dark Teal
    
    // Backgrounds & Surfaces
    background: '#F7FAF9',          // Clean light background
    backgroundSecondary: '#EEF4F2', // Secondary background
    surface: '#FFFFFF',             // Pure white card surface
    surfaceElevated: '#FFFFFF',     // Elevated white card
    surfaceSubtle: '#F0F7F5',       // Soft subtle surface
    border: '#DCE9E6',              // Soft border
    borderSubtle: '#EBF2F0',        // Subtle border

    // Text colors
    text: '#102A29',         // Primary text
    textSecondary: '#6B7F7D',// Secondary text
    textMuted: '#8FA3A0',    // Muted text
    textInverse: '#FFFFFF',  // White text

    // Navigation & Icons
    tint: '#086B68',         // Deep Teal Tint
    icon: '#6B7F7D',
    tabIconDefault: '#6B7F7D',
    tabIconSelected: '#086B68',

    // Status Colors
    success: '#20B486',      // Mint Success
    successBg: '#E6F7F2',    // Light Mint Success BG
    successBorder: '#B4EADB',

    warning: '#E9A83B',      // Amber Warning
    warningBg: '#FDF6E9',    // Light Amber Warning BG
    warningBorder: '#F7E1B8',

    danger: '#E35D6A',       // Critical Red
    dangerBg: '#FCEEEF',     // Light Red Critical BG
    dangerBorder: '#F7C7CC',

    info: '#12A89D',         // Teal Info
    infoBg: '#E7F7F3',       // Light Mint Info BG
    infoBorder: '#B9EDE1',
  },
  dark: {
    primary: '#12A89D',
    primaryDark: '#086B68',
    primaryLight: '#E7F7F3',
    accent: '#086B68',
    accentLight: '#E7F7F3',
    aiAccent: '#12A89D',
    aiAccentLight: '#E7F7F3',
    mint: '#B9EDE1',
    lightMint: '#E7F7F3',
    teal: '#12A89D',
    deepTeal: '#086B68',
    darkTeal: '#073F3D',

    background: '#F7FAF9',
    backgroundSecondary: '#EEF4F2',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#F0F7F5',
    border: '#DCE9E6',
    borderSubtle: '#EBF2F0',

    text: '#102A29',
    textSecondary: '#6B7F7D',
    textMuted: '#8FA3A0',
    textInverse: '#FFFFFF',

    tint: '#086B68',
    icon: '#6B7F7D',
    tabIconDefault: '#6B7F7D',
    tabIconSelected: '#086B68',

    success: '#20B486',
    successBg: '#E6F7F2',
    successBorder: '#B4EADB',

    warning: '#E9A83B',
    warningBg: '#FDF6E9',
    warningBorder: '#F7E1B8',

    danger: '#E35D6A',
    dangerBg: '#FCEEEF',
    dangerBorder: '#F7C7CC',

    info: '#12A89D',
    infoBg: '#E7F7F3',
    infoBorder: '#B9EDE1',
  },
};

export const Typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 30,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#073F3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  hover: {
    shadowColor: '#073F3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

