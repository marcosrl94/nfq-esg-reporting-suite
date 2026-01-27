/**
 * PALANTIR Color Palette Utilities
 * Centralized color definitions for consistent theming
 */

export const palantirColors = {
  // Backgrounds
  bg: {
    primary: '#000000',
    secondary: '#0a0a0a',
    tertiary: '#1a1a1a',
    card: '#1e1e1e',
    hover: '#2a2a2a',
  },
  
  // Text
  text: {
    primary: '#ffffff',
    secondary: '#cccccc',
    tertiary: '#aaaaaa',
    muted: '#6a6a6a',
  },
  
  // Borders
  border: {
    default: '#2a2a2a',
    light: '#3a3a3a',
    hover: '#4a4a4a',
  },
  
  // Accents
  accent: {
    cyan: '#00d4ff',
    cyanDark: '#00a8cc',
    blue: '#0066ff',
    blueDark: '#0052cc',
    blueLight: '#3385ff',
  },
  
  // Status
  status: {
    success: '#00ff88',
    successDark: '#00cc6a',
    warning: '#ffaa00',
    error: '#ff4444',
    info: '#00d4ff',
  },
  
  // Chart Colors (PALANTIR style)
  chart: {
    primary: '#0066ff',
    secondary: '#00d4ff',
    success: '#00ff88',
    warning: '#ffaa00',
    error: '#ff4444',
    neutral: '#6a6a6a',
  },
} as const;

/**
 * Tailwind-compatible color classes for PALANTIR theme
 */
export const palantirClasses = {
  bg: {
    primary: 'bg-black',
    secondary: 'bg-[#0a0a0a]',
    tertiary: 'bg-[#1a1a1a]',
    card: 'bg-[#1e1e1e]',
    hover: 'bg-[#2a2a2a]',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-[#cccccc]',
    tertiary: 'text-[#aaaaaa]',
    muted: 'text-[#6a6a6a]',
  },
  border: {
    default: 'border-[#2a2a2a]',
    light: 'border-[#3a3a3a]',
    hover: 'border-[#4a4a4a]',
  },
} as const;
