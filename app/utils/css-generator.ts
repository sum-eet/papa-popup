/**
 * Utility functions for generating dynamic CSS from PopupDesign configurations
 */

interface PopupDesign {
  id: string;
  popupId: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  overlayColor: string;
  fontFamily: string;
  headingFontSize: string;
  bodyFontSize: string;
  buttonFontSize: string;
  fontWeight: string;
  borderRadius: string;
  padding: string;
  maxWidth: string;
  spacing: string;
  customCSS?: string | null;
  cssVariables: any;
}

/**
 * Generate CSS from PopupDesign configuration
 */
export function generatePopupCSS(design: PopupDesign): string {
  const css = `/* Papa Popup Dynamic Styles - Generated ${new Date().toISOString()} */
:root {
  --papa-popup-primary: ${design.primaryColor};
  --papa-popup-background: ${design.backgroundColor};
  --papa-popup-text: ${design.textColor};
  --papa-popup-border: ${design.borderColor};
  --papa-popup-overlay: ${design.overlayColor};
  --papa-popup-font: ${design.fontFamily};
  --papa-popup-heading-size: ${design.headingFontSize};
  --papa-popup-body-size: ${design.bodyFontSize};
  --papa-popup-button-size: ${design.buttonFontSize};
  --papa-popup-font-weight: ${design.fontWeight};
  --papa-popup-radius: ${design.borderRadius};
  --papa-popup-padding: ${design.padding};
  --papa-popup-max-width: ${design.maxWidth};
  --papa-popup-spacing: ${design.spacing};
  
  /* Additional CSS variables from theme analysis */
  ${generateCSSVariables(design.cssVariables)}
}

/* Popup Overlay */
#papa-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--papa-popup-overlay);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: papaPopupFadeIn 0.3s ease-out;
}

/* Main Popup Modal */
#papa-popup-modal {
  background: var(--papa-popup-background);
  color: var(--papa-popup-text);
  padding: var(--papa-popup-padding);
  border-radius: var(--papa-popup-radius);
  max-width: var(--papa-popup-max-width);
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: papaPopupSlideIn 0.3s ease-out;
  font-family: var(--papa-popup-font);
  font-size: var(--papa-popup-body-size);
  line-height: 1.5;
}

/* Close Button */
#papa-popup-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--papa-popup-text);
  opacity: 0.7;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

#papa-popup-close:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.1);
}

/* Typography */
.papa-popup-heading,
.papa-popup-modal h1,
.papa-popup-modal h2,
.papa-popup-modal h3 {
  font-family: var(--papa-popup-font);
  font-size: var(--papa-popup-heading-size);
  font-weight: var(--papa-popup-font-weight);
  color: var(--papa-popup-text);
  margin: 0 0 var(--papa-popup-spacing) 0;
  line-height: 1.3;
}

.papa-popup-text,
.papa-popup-modal p {
  font-family: var(--papa-popup-font);
  font-size: var(--papa-popup-body-size);
  color: var(--papa-popup-text);
  margin: 0 0 var(--papa-popup-spacing) 0;
  line-height: 1.5;
}

/* Quiz Options */
.papa-popup-option {
  padding: 12px 16px;
  margin: 8px 0;
  background: rgba(0, 0, 0, 0.05);
  border: 2px solid var(--papa-popup-border);
  border-radius: calc(var(--papa-popup-radius) * 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--papa-popup-font);
  font-size: var(--papa-popup-body-size);
  color: var(--papa-popup-text);
  display: block;
  width: 100%;
  text-align: left;
  box-sizing: border-box;
}

.papa-popup-option:hover {
  background: rgba(0, 0, 0, 0.1);
  border-color: var(--papa-popup-primary);
  transform: translateY(-1px);
}

.papa-popup-option.selected {
  background: var(--papa-popup-primary);
  color: white;
  border-color: var(--papa-popup-primary);
}

/* Form Elements */
.papa-popup-input {
  padding: 12px;
  border: 2px solid var(--papa-popup-border);
  border-radius: calc(var(--papa-popup-radius) * 0.5);
  font-size: var(--papa-popup-body-size);
  font-family: var(--papa-popup-font);
  color: var(--papa-popup-text);
  background: var(--papa-popup-background);
  outline: none;
  transition: border-color 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  margin: 8px 0;
}

.papa-popup-input:focus {
  border-color: var(--papa-popup-primary);
  box-shadow: 0 0 0 3px rgba(0, 124, 186, 0.1);
}

.papa-popup-input::placeholder {
  color: rgba(0, 0, 0, 0.5);
  opacity: 1;
}

/* Buttons */
.papa-popup-button {
  background: var(--papa-popup-primary);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: calc(var(--papa-popup-radius) * 0.5);
  font-size: var(--papa-popup-button-size);
  font-weight: 600;
  cursor: pointer;
  font-family: var(--papa-popup-font);
  transition: all 0.2s ease;
  margin: 5px;
  min-width: 120px;
  display: inline-block;
}

.papa-popup-button:hover {
  background: var(--papa-popup-primary);
  filter: brightness(0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.papa-popup-button:active {
  transform: translateY(0);
}

.papa-popup-button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.papa-popup-button.secondary {
  background: transparent;
  color: var(--papa-popup-text);
  border: 2px solid var(--papa-popup-border);
}

.papa-popup-button.secondary:hover {
  background: var(--papa-popup-border);
  filter: none;
}

/* Discount Code Display */
.papa-popup-discount-code {
  font-size: calc(var(--papa-popup-heading-size) * 0.8);
  font-weight: bold;
  color: var(--papa-popup-primary);
  background: rgba(0, 124, 186, 0.05);
  padding: 16px;
  border: 2px dashed var(--papa-popup-primary);
  border-radius: var(--papa-popup-radius);
  margin: var(--papa-popup-spacing) 0;
  font-family: var(--papa-popup-font);
  letter-spacing: 1px;
}

/* Progress Indicator */
.papa-popup-progress {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--papa-popup-spacing);
  padding-bottom: var(--papa-popup-spacing);
  border-bottom: 1px solid var(--papa-popup-border);
}

.papa-popup-progress-step {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--papa-popup-border);
  transition: background-color 0.3s ease;
}

.papa-popup-progress-step.active {
  background: var(--papa-popup-primary);
}

.papa-popup-progress-step.completed {
  background: #28a745;
}

/* Animations */
@keyframes papaPopupFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes papaPopupSlideIn {
  from { 
    transform: translateY(-50px); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0); 
    opacity: 1; 
  }
}

/* Responsive Design */
@media (max-width: 480px) {
  #papa-popup-modal {
    padding: calc(var(--papa-popup-padding) * 0.7);
    margin: 20px;
    width: calc(100% - 40px);
  }
  
  .papa-popup-heading,
  .papa-popup-modal h1,
  .papa-popup-modal h2,
  .papa-popup-modal h3 {
    font-size: calc(var(--papa-popup-heading-size) * 0.9);
  }
  
  .papa-popup-button {
    width: 100%;
    margin: 8px 0;
  }
}

/* Custom CSS from user */
${design.customCSS || ''}
`;

  return css;
}

/**
 * Generate CSS variables from theme analysis or custom variables
 */
function generateCSSVariables(variables: any): string {
  if (!variables || typeof variables !== 'object') {
    return '';
  }
  
  const cssVars = Object.entries(variables)
    .filter(([key, value]) => typeof value === 'string')
    .map(([key, value]) => `  --papa-popup-${key}: ${value};`)
    .join('\n');
    
  return cssVars;
}

/**
 * Get ETag for CSS caching
 */
export function generateCSSETag(design: PopupDesign): string {
  // Create a hash-like string from key design properties
  const content = [
    design.primaryColor,
    design.backgroundColor,
    design.fontFamily,
    design.updatedAt || design.id
  ].join('|');
  
  // Simple hash function for ETag
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
}