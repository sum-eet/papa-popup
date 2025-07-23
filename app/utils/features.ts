/**
 * Feature flag utilities for Papa Popup
 * 
 * Handles feature toggles and system detection
 */

/**
 * Check if multi-popup system is enabled
 * @returns boolean - true if multi-popup system should be used
 */
export function isMultiPopupEnabled(): boolean {
  return process.env.ENABLE_MULTI_POPUP === 'true';
}

/**
 * Get the popup system type being used
 * @returns 'legacy' | 'multi'
 */
export function getPopupSystemType(): 'legacy' | 'multi' {
  return isMultiPopupEnabled() ? 'multi' : 'legacy';
}

/**
 * Check if current environment supports multi-popup features
 * Useful for showing/hiding UI elements
 */
export function hasMultiPopupSupport(): boolean {
  // Could add additional checks here (like database schema version)
  return isMultiPopupEnabled();
}

/**
 * Feature flags object for easy access
 */
export const Features = {
  MULTI_POPUP: isMultiPopupEnabled(),
  POPUP_ANALYTICS: isMultiPopupEnabled(), // Analytics only available in multi-popup
  QUIZ_BUILDER: isMultiPopupEnabled(), // Quiz functionality only in multi-popup
  DISCOUNT_LOGIC: isMultiPopupEnabled(), // Advanced discount logic only in multi-popup
} as const;

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof Features): boolean {
  return Features[feature];
}