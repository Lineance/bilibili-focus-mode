import { useState, useEffect } from 'react';
import { ThemeService } from '@core/services';
import type { ThemeMode, ThemeColorScheme } from '@core/types';

export function ThemePanel() {
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
    });

    return () => unsubscribe();
  }, [themeService]);

  const handleModeToggle = () => {
    themeService.toggleMode();
  };

  const handleSchemeChange = (newScheme: ThemeColorScheme) => {
    themeService.setScheme(newScheme);
  };

  const handleResetTheme = () => {
    if (confirm('确定要重置主题为默认设置吗？')) {
      themeService.setMode('dark');
      themeService.setScheme('tokyo');
    }
  };

  const availableThemes = themeService.getAvailableThemes();

  return (
    <div className="bg-secondary border border-secondary rounded-lg p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary mb-2">🎨 主题配置</h2>
          <p className="text-secondary">自定义您的视觉体验</p>
        </div>
        <button
          onClick={handleResetTheme}
          className="px-4 py-2 bg-tertiary text-primary rounded text-sm hover:bg-accent-primary hover:text-white transition-all duration-300"
        >
          重置默认
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Mode Toggle Card */}
        <div className="bg-tertiary border border-secondary rounded-lg p-5">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <span className="text-xl">🌓</span>
            显示模式
          </h3>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-primary font-medium mb-1">
                {mode === 'light' ? '浅色模式' : '深色模式'}
              </span>
              <span className="text-muted text-sm">
                {mode === 'light' ? '明亮清爽，适合白天使用' : '柔和护眼，适合夜间使用'}
              </span>
            </div>
            
            <button
              onClick={handleModeToggle}
              className="relative w-16 h-8 bg-tertiary border-2 border-secondary rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
              aria-label={`切换到${mode === 'light' ? '深色' : '浅色'}模式`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center text-sm shadow-md ${
                  mode === 'light' 
                    ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 translate-x-1' 
                    : 'bg-gradient-to-br from-indigo-400 to-purple-600 translate-x-8'
                }`}
              >
                {mode === 'light' ? '☀️' : '🌙'}
              </div>
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <div className="flex-1 h-10 rounded bg-primary border border-secondary flex items-center justify-center transition-colors">
              <span className="text-xs text-primary">背景</span>
            </div>
            <div className="flex-1 h-10 rounded bg-secondary border border-secondary flex items-center justify-center transition-colors">
              <span className="text-xs text-secondary">次要</span>
            </div>
          </div>
        </div>

        {/* Color Scheme Selection Card */}
        <div className="bg-tertiary border border-secondary rounded-lg p-5">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <span className="text-xl">🎨</span>
            配色方案
          </h3>

          <div className="space-y-3">
            {availableThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleSchemeChange(theme.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                  scheme === theme.id
                    ? 'border-accent-primary bg-accent-primary/25 shadow-lg scale-[1.02] ring-2 ring-accent-primary/30'
                    : 'border-secondary hover:border-accent-hover hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {theme.id === 'minimal' ? '⚫' : '🌃'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-semibold ${
                          scheme === theme.id ? 'text-accent-primary font-bold' : 'text-primary'
                        }`}>
                          {theme.name}
                        </span>
                        {scheme === theme.id && (
                          <div className="w-5 h-5 bg-accent-primary rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{theme.description}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color Preview Section */}
      <div className="bg-tertiary border border-secondary rounded-lg p-5 mb-6">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <span className="text-xl">👁️</span>
          颜色预览
        </h3>

        <div className="space-y-4">
          {/* Background Colors */}
          <div>
            <h4 className="text-sm text-muted mb-2">背景色</h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="h-16 rounded-lg bg-primary border border-secondary flex items-end justify-center pb-2">
                <span className="text-xs text-primary">主要</span>
              </div>
              <div className="h-16 rounded-lg bg-secondary border border-secondary flex items-end justify-center pb-2">
                <span className="text-xs text-secondary">次要</span>
              </div>
              <div className="h-16 rounded-lg bg-tertiary border border-secondary flex items-end justify-center pb-2">
                <span className="text-xs text-tertiary">第三</span>
              </div>
              <div className="h-16 rounded-lg bg-hover border border-secondary flex items-end justify-center pb-2">
                <span className="text-xs text-primary">悬停</span>
              </div>
            </div>
          </div>

          {/* Accent Colors */}
          <div>
            <h4 className="text-sm text-muted mb-2">强调色</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-12 rounded-lg bg-accent-primary flex items-center justify-center">
                <span className="text-xs text-white font-medium">主色</span>
              </div>
              <div className="h-12 rounded-lg bg-accent-hover flex items-center justify-center">
                <span className="text-xs text-white font-medium">悬停</span>
              </div>
              <div className="h-12 rounded-lg bg-accent-active flex items-center justify-center">
                <span className="text-xs text-white font-medium">激活</span>
              </div>
            </div>
          </div>

          {/* Status Colors */}
          <div>
            <h4 className="text-sm text-muted mb-2">状态色</h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="h-12 rounded-lg border border-success flex items-center justify-center">
                <span className="text-xs text-success font-medium">成功</span>
              </div>
              <div className="h-12 rounded-lg border border-warning flex items-center justify-center">
                <span className="text-xs text-warning font-medium">警告</span>
              </div>
              <div className="h-12 rounded-lg border border-error flex items-center justify-center">
                <span className="text-xs text-error font-medium">错误</span>
              </div>
              <div className="h-12 rounded-lg border border-info flex items-center justify-center">
                <span className="text-xs text-info font-medium">信息</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Elements Preview */}
      <div className="bg-tertiary border border-secondary rounded-lg p-5">
        <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <span className="text-xl">🔧</span>
          交互元素预览
        </h3>

        <div className="space-y-4">
          {/* Buttons */}
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition-colors">
              主要按钮
            </button>
            <button className="px-4 py-2 bg-secondary text-primary border border-secondary rounded-lg hover:bg-accent-primary/10 transition-colors">
              次要按钮
            </button>
            <button className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/80 transition-colors">
              成功
            </button>
            <button className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 transition-colors">
              危险
            </button>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="输入框"
              className="w-full px-4 py-2 bg-secondary border border-secondary rounded-lg text-primary placeholder-muted focus:border-accent-primary focus:outline-none transition-colors"
            />
            <select className="w-full px-4 py-2 bg-secondary border border-secondary rounded-lg text-primary focus:border-accent-primary focus:outline-none transition-colors">
              <option>下拉选择框</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
