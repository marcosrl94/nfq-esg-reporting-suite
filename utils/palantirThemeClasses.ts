/**
 * PALANTIR Theme Class Utilities
 * Centralized theme classes for consistent styling
 */

export const palantirTheme = {
  // Backgrounds
  bg: {
    primary: 'bg-black',
    secondary: 'bg-[#0a0a0a]',
    tertiary: 'bg-[#1a1a1a]',
    card: 'bg-[#1e1e1e]',
    hover: 'bg-[#2a2a2a]',
  },
  
  // Text colors
  text: {
    primary: 'text-white',
    secondary: 'text-[#cccccc]',
    tertiary: 'text-[#aaaaaa]',
    muted: 'text-[#6a6a6a]',
  },
  
  // Borders
  border: {
    default: 'border-[#2a2a2a]',
    light: 'border-[#3a3a3a]',
    hover: 'border-[#4a4a4a]',
  },
  
  // Buttons
  button: {
    primary: 'bg-[#0066ff] hover:bg-[#0052cc] text-white',
    secondary: 'bg-transparent border border-[#2a2a2a] hover:bg-[#1a1a1a] text-[#cccccc]',
    success: 'bg-[#00ff88] hover:bg-[#00cc6a] text-black',
    danger: 'bg-[#ff4444] hover:bg-[#cc3333] text-white',
  },
  
  // Inputs
  input: 'bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder:text-[#6a6a6a] focus:border-[#00d4ff] focus:ring-0',
  
  // Cards
  card: 'bg-[#1e1e1e] border border-[#2a2a2a] rounded',
  
  // Status colors
  status: {
    approved: 'bg-[#00ff88] text-black',
    review: 'bg-[#ffaa00] text-black',
    draft: 'bg-[#6a6a6a] text-white',
    locked: 'bg-[#2a2a2a] text-[#aaaaaa]',
  },
} as const;

/**
 * Get status color classes
 */
export const getStatusColorClasses = (status: string) => {
  switch (status) {
    case 'Approved':
      return 'bg-[#1a1a1a] text-[#00ff88] border-[#00ff88]';
    case 'Review':
      return 'bg-[#1a1a1a] text-[#ffaa00] border-[#ffaa00]';
    case 'Locked':
      return 'bg-[#1a1a1a] text-[#6a6a6a] border-[#6a6a6a]';
    default:
      return 'bg-[#1a1a1a] text-[#6a6a6a] border-[#6a6a6a]';
  }
};
