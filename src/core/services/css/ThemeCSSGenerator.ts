import type { ThemeColors, ThemeMode } from '../../types/theme';

export class ThemeCSSGenerator {
  generateCSSVariables(colors: ThemeColors, mode: ThemeMode): string {
    return `
      :root {
        /* Background colors */
        --fm-bg-primary: ${colors.bgPrimary};
        --fm-bg-secondary: ${colors.bgSecondary};
        --fm-bg-tertiary: ${colors.bgTertiary};
        --fm-bg-hover: ${colors.bgHover};
        
        /* Text colors */
        --fm-text-primary: ${colors.textPrimary};
        --fm-text-secondary: ${colors.textSecondary};
        --fm-text-tertiary: ${colors.textTertiary};
        --fm-text-muted: ${colors.textMuted};
        
        /* Border colors */
        --fm-border-primary: ${colors.borderPrimary};
        --fm-border-secondary: ${colors.borderSecondary};
        
        /* Accent colors */
        --fm-accent-primary: ${colors.accentPrimary};
        --fm-accent-hover: ${colors.accentHover};
        --fm-accent-active: ${colors.accentActive};
        
        /* Status colors */
        --fm-success: ${colors.success};
        --fm-warning: ${colors.warning};
        --fm-error: ${colors.error};
        --fm-info: ${colors.info};
        
        /* Special colors */
        --fm-overlay: ${colors.overlay};
        --fm-shadow: ${colors.shadow};
        
        /* Mode indicator */
        --fm-mode: "${mode}";
      }
    `;
  }

  generateBaseStyles(): string {
    return [
      this.generateBodyStyles(),
      this.generateUtilityClassStyles(),
      this.generateButtonStyles(),
      this.generateInputStyles(),
      this.generateCardStyles(),
      this.generateScrollbarStyles(),
      this.generateSelectionStyles(),
    ].join('\n');
  }

  private generateBodyStyles(): string {
    return `
      /* Base styles using CSS variables */
      body {
        background-color: var(--fm-bg-primary);
        color: var(--fm-text-primary);
        transition: background-color 0.3s ease, color 0.3s ease;
      }
    `;
  }

  private generateUtilityClassStyles(): string {
    return `
      /* Common components */
      .bg-primary { background-color: var(--fm-bg-primary) !important; }
      .bg-secondary { background-color: var(--fm-bg-secondary) !important; }
      .bg-tertiary { background-color: var(--fm-bg-tertiary) !important; }
      .bg-hover:hover { background-color: var(--fm-bg-hover) !important; }

      .text-primary { color: var(--fm-text-primary) !important; }
      .text-secondary { color: var(--fm-text-secondary) !important; }
      .text-tertiary { color: var(--fm-text-tertiary) !important; }
      .text-muted { color: var(--fm-text-muted) !important; }

      .border-primary { border-color: var(--fm-border-primary) !important; }
      .border-secondary { border-color: var(--fm-border-secondary) !important; }

      .accent-primary { color: var(--fm-accent-primary) !important; }
      .accent-hover:hover { color: var(--fm-accent-hover) !important; }

      .text-success { color: var(--fm-success) !important; }
      .text-warning { color: var(--fm-warning) !important; }
      .text-error { color: var(--fm-error) !important; }
      .text-info { color: var(--fm-info) !important; }
    `;
  }

  private generateButtonStyles(): string {
    return `
      /* Buttons and interactive elements */
      button, .btn {
        transition: all 0.3s ease;
      }

      button.bg-blue-600, .btn.bg-blue-600 {
        background-color: var(--fm-accent-primary) !important;
      }

      button.bg-blue-600:hover, .btn.bg-blue-600:hover {
        background-color: var(--fm-accent-hover) !important;
      }

      button.bg-blue-600:active, .btn.bg-blue-600:active {
        background-color: var(--fm-accent-active) !important;
      }
    `;
  }

  private generateInputStyles(): string {
    return `
      /* Input fields */
      input, select, textarea {
        background-color: var(--fm-bg-secondary) !important;
        color: var(--fm-text-primary) !important;
        border-color: var(--fm-border-secondary) !important;
        transition: all 0.3s ease;
      }

      input:focus, select:focus, textarea:focus {
        border-color: var(--fm-accent-primary) !important;
        outline: none;
      }
    `;
  }

  private generateCardStyles(): string {
    return `
      /* Cards and panels */
      .bg-gray-800 {
        background-color: var(--fm-bg-secondary) !important;
        border: 1px solid var(--fm-border-secondary);
      }

      /* Text colors in various contexts */
      .text-gray-400 { color: var(--fm-text-tertiary) !important; }
      .text-gray-500 { color: var(--fm-text-muted) !important; }
      .text-gray-300 { color: var(--fm-text-secondary) !important; }

      /* Background variations */
      .bg-black\\/20, .bg-black\\/30, .bg-black\\/40 {
        background-color: var(--fm-bg-tertiary) !important;
      }

      .bg-gray-700 {
        background-color: var(--fm-bg-tertiary) !important;
      }

      .bg-gray-900 {
        background-color: var(--fm-bg-secondary) !important;
      }

      /* Border colors */
      .border-gray-700 {
        border-color: var(--fm-border-secondary) !important;
      }

      .border-orange-900\\/50 {
        border-color: var(--fm-border-secondary) !important;
      }

      .border-orange-500\\/30 {
        border-color: var(--fm-accent-primary) !important;
        opacity: 0.3;
      }

      /* Status-specific backgrounds */
      .bg-green-900\\/30 {
        background-color: var(--fm-success) !important;
        opacity: 0.1;
      }

      .bg-red-900\\/30 {
        background-color: var(--fm-error) !important;
        opacity: 0.1;
      }

      .bg-green-600 {
        background-color: var(--fm-success) !important;
      }

      .bg-red-600 {
        background-color: var(--fm-error) !important;
      }

      .bg-orange-600 {
        background-color: var(--fm-accent-primary) !important;
      }

      .bg-orange-700 {
        background-color: var(--fm-accent-hover) !important;
      }
    `;
  }

  private generateScrollbarStyles(): string {
    return `
      /* Scrollbar styling */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: var(--fm-bg-tertiary);
      }

      ::-webkit-scrollbar-thumb {
        background: var(--fm-border-secondary);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: var(--fm-text-muted);
      }
    `;
  }

  private generateSelectionStyles(): string {
    return `
      /* Selection color */
      ::selection {
        background-color: var(--fm-accent-primary);
        color: var(--fm-bg-primary);
      }
    `;
  }
}
