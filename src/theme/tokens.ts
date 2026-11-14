export const colors = {
  bg: '#F3F6F5',
  surface: '#FFFFFF',
  primary: '#0F766E',
  primaryDark: '#115E59',
  primarySoft: '#E3F2EF',
  primaryText: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  positive: '#059669',
  negative: '#DC2626',
  negativeSoft: '#FDECEC',
  border: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export const space = (n: number) => n * 4;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const font = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  bold: 'Heebo_700Bold',
} as const;

export const fontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40 } as const;

export const shadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

export const tokens = { colors, space, radius, font, fontSize, shadow };
