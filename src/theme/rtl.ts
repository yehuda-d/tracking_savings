import { I18nManager, Platform } from 'react-native';

/**
 * The UI is Hebrew-only. Release builds force native RTL (expo-localization forcesRTL);
 * the web sets dir="rtl" on <html>. Expo Go may still run LTR, so layout code uses these
 * helpers instead of plain 'row' / 'left' / 'right' to render RTL in every environment.
 */
const nativeRTL = Platform.OS === 'web' || I18nManager.isRTL;

/** flexDirection for a horizontal row that starts on the right. */
export const row = nativeRTL ? ('row' as const) : ('row-reverse' as const);

/** textAlign value that aligns text to the right edge (the start in Hebrew). */
export const textStart = Platform.OS !== 'web' && I18nManager.isRTL ? ('left' as const) : ('right' as const);

/** textAlign value that aligns text to the left edge (the end in Hebrew). */
export const textEnd = textStart === 'right' ? ('left' as const) : ('right' as const);

/** Icon pointing "back" (toward the start, i.e. right) and "forward". */
export const backIcon = 'chevron-right' as const;
export const forwardIcon = 'chevron-left' as const;
