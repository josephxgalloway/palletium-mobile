export const theme = {
  colors: {
    // Palladium metal theme
    primary: '#E8E8E8',
    secondary: '#B8B8B8',
    background: '#1A1A1A',
    surface: '#2A2A2A',
    surfaceElevated: '#3A3A3A',
    accent: '#C0C0C0',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#707070',
    border: '#404040',
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
