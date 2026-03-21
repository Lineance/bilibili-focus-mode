import { useState, useEffect } from 'react';
import { ThemeService } from '@core/services';
import type { ThemeMode, ThemeColorScheme } from '@core/types';

interface ThemeSwitcherProps {
  onThemeChange?: (mode: ThemeMode, scheme: ThemeColorScheme) => void;
}

export function ThemeSwitcher({ onThemeChange }: ThemeSwitcherProps) {
  const [themeService] = useState(() => new ThemeService());
  const [mode, setMode] = useState<ThemeMode>(themeService.getThemeConfig().mode);
  const [scheme, setScheme] = useState<ThemeColorScheme>(themeService.getThemeConfig().colorScheme);

  // Initialize theme service on mount
  useEffect(() => {
    themeService.initialize();
  }, [themeService]);

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = themeService.subscribe((config) => {
      setMode(config.mode);
      setScheme(config.colorScheme);
      onThemeChange?.(config.mode, config.colorScheme);
    });

    return () => unsubscribe();
  }, [themeService, onThemeChange]);

  const handleModeToggle = () => {
    themeService.toggleMode();
  };

  const handleSchemeChange = (newScheme: ThemeColorScheme) => {
    themeService.setScheme(newScheme);
  };

  const availableThemes = themeService.getAvailableThemes();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl">
      <h3 className="text-lg font-semibold mb-4 text-primary">🎨 主题设置</h3>
      
      {/* Mode Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-secondary">显示模式</span>
          <button
            onClick={handleModeToggle}
            className="relative w-14 h-7 bg-tertiary rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-accent-primary"
            aria-label={`切换到${mode === 'light' ? '深色' : '浅色'}模式`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full transition-transform duration-300 flex items-center justify-center text-xs ${
                mode === 'light' 
                  ? 'bg-gray-300 translate-x-1' 
                  : 'bg-accent-primary translate-x-8'
              }`}
            >
              {mode === 'light' ? '☀️' : '🌙'}
            </div>
          </button>
        </div>
        <p className="text-xs text-muted">
          当前：{mode === 'light' ? '浅色模式' : '深色模式'}
        </p>
      </div>

      {/* Color Scheme Selection */}
      <div>
        <label className="block text-sm text-secondary mb-3">
          配色方案
        </label>
        <div className="grid grid-cols-2 gap-3">
          {availableThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSchemeChange(theme.id)}
              className={`relative p-3 rounded-lg border-2 transition-all duration-300 text-left ${
                scheme === theme.id
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-secondary hover:border-accent-hover'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">
                  {theme.id === 'minimal' ? '⚫' : '🌃'}
                </span>
                <span className={`text-sm font-medium ${
                  scheme === theme.id ? 'text-accent-primary' : 'text-primary'
                }`}>
                  {theme.name}
                </span>
              </div>
              <p className="text-xs text-muted line-clamp-2">
                {theme.description}
              </p>
              {scheme === theme.id && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-accent-primary rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 pt-4 border-t border-secondary">
        <p className="text-xs text-muted mb-2">预览效果：</p>
        <div className="flex gap-2">
          <div className="flex-1 h-12 rounded bg-primary border border-secondary flex items-center justify-center">
            <span className="text-xs text-primary">背景</span>
          </div>
          <div className="flex-1 h-12 rounded bg-secondary border border-secondary flex items-center justify-center">
            <span className="text-xs text-secondary">次要</span>
          </div>
          <div className="flex-1 h-12 rounded bg-tertiary border border-secondary flex items-center justify-center">
            <span className="text-xs text-tertiary">第三</span>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button className="flex-1 h-8 rounded bg-accent-primary text-white text-xs hover:bg-accent-hover transition-colors">
            按钮
          </button>
          <div className="flex-1 h-8 rounded border border-success flex items-center justify-center">
            <span className="text-xs text-success">成功</span>
          </div>
          <div className="flex-1 h-8 rounded border border-error flex items-center justify-center">
            <span className="text-xs text-error">错误</span>
          </div>
        </div>
      </div>
    </div>
  );
}
