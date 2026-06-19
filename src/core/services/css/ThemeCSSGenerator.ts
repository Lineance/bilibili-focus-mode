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
        
        /* Status color RGB values (for rgba usage) */
        --fm-text-success-rgb: 16, 185, 129;
        --fm-text-error-rgb: 239, 68, 68;
        --fm-text-warning-rgb: 245, 158, 11;
        
        /* Special colors */
        --fm-overlay: ${colors.overlay};
        --fm-shadow: ${colors.shadow};
        
        /* Semantic text color aliases */
        --fm-text-success: ${colors.success};
        --fm-text-error: ${colors.error};
        --fm-text-warning: ${colors.warning};
        --fm-text-info: ${colors.info};
        --fm-accent-primary-hover: ${colors.accentHover};
        
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

      /* Gray shades */
      .bg-gray-600 { background-color: var(--fm-bg-tertiary) !important; }
      .bg-gray-700 { background-color: var(--fm-bg-tertiary) !important; }
      .bg-gray-900 { background-color: var(--fm-bg-secondary) !important; }

      .text-gray-200 { color: var(--fm-text-primary) !important; }
      .text-gray-300 { color: var(--fm-text-secondary) !important; }
      .text-gray-400 { color: var(--fm-text-tertiary) !important; }
      .text-gray-500 { color: var(--fm-text-muted) !important; }

      /* Blue shades */
      .bg-blue-500 { background-color: var(--fm-accent-primary) !important; }
      .bg-blue-700 { background-color: var(--fm-accent-primary-hover) !important; }
      .text-blue-200 { color: var(--fm-text-info) !important; }
      .text-blue-300 { color: var(--fm-text-info) !important; }
      .text-blue-400 { color: var(--fm-text-info) !important; }
      .ring-blue-500 { --tw-ring-color: var(--fm-accent-primary) !important; }

      /* Green shades */
      .bg-green-500 { background-color: var(--fm-text-success) !important; }
      .bg-green-600 { background-color: var(--fm-success) !important; }
      .bg-green-700 { background-color: var(--fm-text-success) !important; opacity: 0.9; }
      .bg-green-800 { background-color: var(--fm-text-success) !important; opacity: 0.8; }
      .bg-green-900\\/30 { background-color: rgba(var(--fm-text-success-rgb), 0.3) !important; }
      .bg-green-900\\/50 { background-color: rgba(var(--fm-text-success-rgb), 0.5) !important; }
      .text-green-200 { color: var(--fm-text-success) !important; }
      .text-green-300 { color: var(--fm-text-success) !important; }

      /* Red shades */
      .bg-red-500 { background-color: var(--fm-text-error) !important; }
      .bg-red-600 { background-color: var(--fm-error) !important; }
      .bg-red-700 { background-color: var(--fm-text-error) !important; opacity: 0.9; }
      .bg-red-800 { background-color: var(--fm-text-error) !important; opacity: 0.8; }
      .bg-red-900\\/30 { background-color: rgba(var(--fm-text-error-rgb), 0.3) !important; }
      .bg-red-900\\/70 { background-color: rgba(var(--fm-text-error-rgb), 0.7) !important; }
      .text-red-300 { color: var(--fm-text-error) !important; }

      /* Yellow shades */
      .bg-yellow-500 { background-color: var(--fm-text-warning) !important; }
      .bg-yellow-700 { background-color: var(--fm-text-warning) !important; opacity: 0.9; }
      .bg-yellow-900\\/50 { background-color: rgba(var(--fm-text-warning-rgb), 0.5) !important; }
      .text-yellow-200 { color: var(--fm-text-warning) !important; }
      .text-yellow-300 { color: var(--fm-text-warning) !important; }

      /* Orange shades */
      .bg-orange-600 { background-color: var(--fm-accent-primary) !important; }
      .bg-orange-700 { background-color: var(--fm-accent-hover) !important; }
      .text-orange-400 { color: var(--fm-text-warning) !important; }

      /* Purple shades */
      .bg-purple-600 { background-color: #8B5CF6 !important; }
      .bg-purple-700 { background-color: #7C3AED !important; }

      /* Border colors */
      .border-gray-700 { border-color: var(--fm-border-secondary) !important; }
      .border-orange-500\\/30 { border-color: rgba(249, 115, 22, 0.3) !important; }
      .border-orange-900\\/50 { border-color: rgba(249, 115, 22, 0.5) !important; }

      /* Black overlays */
      .bg-black\\/20 { background-color: rgba(0, 0, 0, 0.2) !important; }
      .bg-black\\/30 { background-color: rgba(0, 0, 0, 0.3) !important; }
      .bg-black\\/40 { background-color: rgba(0, 0, 0, 0.4) !important; }
      .bg-black\\/80 { background-color: rgba(0, 0, 0, 0.8) !important; }
      .bg-black\\/95 { background-color: rgba(0, 0, 0, 0.95) !important; }
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
