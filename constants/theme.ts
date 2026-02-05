export const theme = {
  colors: {
    // Palladium metal theme — matches website (blue-tinted steel grays)
    primary: '#c0c8d6',       // accent-silver (web)
    secondary: '#6c86a8',     // accent-blue / steel (web)
    background: '#161922',    // palladium-950
    surface: '#1b1f2b',       // palladium-900
    surfaceElevated: '#212637', // palladium-850
    accent: '#c0c8d6',        // accent-silver
    textPrimary: '#e8ebf2',   // --text
    textSecondary: '#aeb6c4', // --text-dim
    textMuted: '#65708a',     // palladium-500
    border: '#2a3142',        // --border
    success: '#4ADE80',
    warning: '#FACC15',
    error: '#F87171',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export type Theme = typeof theme;
