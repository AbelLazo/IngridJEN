/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

import { Platform } from 'react-native';

const tintColorLight = '#6366f1';
const tintColorDark = '#818cf8';

export const Colors = {
  light: {
    text: '#1e293b',
    background: '#f8fafc',
    tint: tintColorLight,
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
    card: '#ffffff',
    border: '#e2e8f0',
    notification: '#f43f5e',
    primary: '#6366f1',
    secondary: '#10b981',
    surface: '#ffffff',
  },
  dark: {
    text: '#f8fafc',
    background: '#0f172a',
    tint: tintColorDark,
    icon: '#94a3b8',
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
    card: '#1e293b',
    border: '#334155',
    notification: '#fb7185',
    primary: '#818cf8',
    secondary: '#34d399',
    surface: '#1e293b',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
});

