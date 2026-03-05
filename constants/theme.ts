/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

import { Platform } from 'react-native';

const tintColorLight = '#EC4899'; // Vibrant Pink
const tintColorDark = '#F472B6'; // Softer Pink for dark mode

export const Colors = {
  light: {
    text: '#1A1A2E', // Deep navy-black for sharp contrast
    background: '#FFFFFF', // Pure white background
    tint: tintColorLight,
    icon: '#EC4899', // Pink icons
    tabIconDefault: '#D1D5DB', // Light cool gray
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    border: '#FECDD3', // Soft pink border
    notification: '#EC4899',
    primary: '#1A1A2E',
    secondary: '#FFF1F2', // Very light pink for backgrounds
    surface: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.2)',
    modal: '#FFFFFF',
  },
  dark: {
    text: '#F9FAFB',
    background: '#0F172A', // Deep slate
    tint: tintColorDark,
    icon: '#F472B6',
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
    card: '#1E293B',
    border: '#334155',
    notification: '#F472B6',
    primary: '#F1F5F9',
    secondary: '#1E293B',
    surface: '#1E293B',
    overlay: 'rgba(0, 0, 0, 0.6)',
    modal: '#1E293B',
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

