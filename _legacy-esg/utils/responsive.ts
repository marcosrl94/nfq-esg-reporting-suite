/**
 * Responsive Utilities
 * Centralized breakpoints and responsive helpers
 */

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Responsive class helpers for common patterns
 */
export const responsiveClasses = {
  // Container padding
  containerPadding: 'p-3 sm:p-4 md:p-5 lg:p-6',
  containerPaddingX: 'px-3 sm:px-4 md:px-5 lg:px-6',
  containerPaddingY: 'py-3 sm:py-4 md:py-5 lg:py-6',
  
  // Text sizes
  heading1: 'text-xl sm:text-2xl lg:text-3xl',
  heading2: 'text-lg sm:text-xl lg:text-2xl',
  heading3: 'text-base sm:text-lg lg:text-xl',
  body: 'text-sm sm:text-base',
  small: 'text-xs sm:text-sm',
  tiny: 'text-[10px] sm:text-xs',
  
  // Spacing
  gap: 'gap-3 sm:gap-4 lg:gap-6',
  gapSmall: 'gap-2 sm:gap-3 lg:gap-4',
  gapLarge: 'gap-4 sm:gap-6 lg:gap-8',
  
  // Grid columns
  grid2: 'grid-cols-1 sm:grid-cols-2',
  grid3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  grid4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
  
  // Flex direction
  flexCol: 'flex-col lg:flex-row',
  
  // Widths
  fullWidth: 'w-full max-w-full',
  noOverflow: 'overflow-x-hidden min-w-0',
} as const;

/**
 * Get responsive width classes for split layouts
 */
export const getSplitLayout = (mobileStack: boolean = true) => {
  if (mobileStack) {
    return {
      left: 'w-full lg:w-1/3',
      right: 'w-full lg:w-2/3',
    };
  }
  return {
    left: 'w-full md:w-1/3',
    right: 'w-full md:w-2/3',
  };
};
