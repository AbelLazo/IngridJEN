/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

import { Platform } from 'react-native';

const tintColorLight = '#D4AF37'; // Ballet Gold
const tintColorDark = '#F8C8DC'; // Rose Pink

export const Colors = {
  light: {
    text: '#2D2621', // Bark Brown
    background: '#F5F5F7', // Apple Gallery Gray for better Blur contrast
    tint: '#AF4328', // Oxide Red
    icon: '#5D5043', // Earth Brown
    tabIconDefault: '#C5A88F', // Taupe
    tabIconSelected: '#AF4328',
    card: 'rgba(255, 255, 255, 0.6)', // Standard Elite Glassmorphism opacity
    border: '#C5A88F',
    notification: '#AF4328',
    primary: '#000000',
    secondary: '#C5A88F',
    surface: '#ffffff',
    overlay: 'rgba(245, 241, 233, 0.4)',
    modal: '#FFFFFF',
  },
  dark: {
    text: '#F5F1E9', // Linen Cream
    background: '#2D2621', // Bark Brown
    tint: '#CD855F', // terracotta
    icon: '#C5A88F',
    tabIconDefault: '#5D5043',
    tabIconSelected: '#CD855F',
    card: '#261F1A',
    border: '#5D5043',
    notification: '#CD855F',
    primary: '#EBDCCB', // Sand/Cream contrast for dark mode buttons
    secondary: '#5D5043',
    surface: '#261F1A',
    overlay: 'rgba(45, 38, 33, 0.6)',
    modal: '#261F1A',
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

