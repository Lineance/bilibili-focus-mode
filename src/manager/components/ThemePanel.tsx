import React, { useEffect, useState } from 'react';
import { ThemeService } from '@core/services';
import { THEMES } from '@core/theme/themes';
import type { ThemeMode, ThemeColorScheme } from '@core/types';
import { Button, Card, Icon, PageIntro, SectionHeader, Toggle } from '@ui';

const themeService = ThemeService.getInstance();

function Swatches({ scheme, mode }: { scheme: ThemeColorScheme; mode: ThemeMode }) {
  const palette = THEMES[scheme][mode];
  return (
    <div className="flex items-center gap-1.5">
      {[palette.bgPrimary, palette.bgTertiary, palette.accentPrimary, palette.warning, palette.success].map((color, index) => (
        <span
          key={`${scheme}-${index}`}
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: color, boxShadow: 'inset 0 0 0 1px rgba(127,127,127,0.25)' }}
        />
      ))}
    </div>
  );
}

export function ThemePanel(): React.JSX.Element {
  const [mode, setMode] = useState<ThemeMode>(themeService.getThemeConfig().mode);
  const [scheme, setScheme] = useState<ThemeColorScheme>(themeService.getThemeConfig().colorScheme);

  useEffect(() => themeService.subscribe((config) => {
    setMode(config.mode);
    setScheme(config.colorScheme);
  }), []);

  const handleResetTheme = () => {
    if (!confirm('确定要重置主题为默认设置吗？')) return;
    themeService.setMode('dark');
    themeService.setScheme('tokyo');
  };

  return (
    <div>
      <PageIntro
        eyebrow="Appearance"
        title="主题"
        description="两套配色共用同一套语义槽位；切换只影响强调色与底色，不改信息层级。"
      />

      <div className="mb-6 flex justify-end">
        <Button variant="ghost" size="sm" icon="history" onClick={handleResetTheme}>
          重置默认
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="fm-label">显示模式</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-tertiary text-secondary">
                <Icon name={mode === 'light' ? 'sun' : 'moon'} size={16} />
              </span>
              <div>
                <p className="text-[13px] font-medium">{mode === 'light' ? '浅色' : '深色'}</p>
                <p className="mt-0.5 text-[11.5px] text-tertiary">
                  {mode === 'light' ? '明亮通透，适合白天' : '低亮度护眼，适合夜间'}
                </p>
              </div>
            </div>
            <Toggle
              checked={mode === 'dark'}
              onChange={(next) => themeService.setMode(next ? 'dark' : 'light')}
              label="切换深色模式"
            />
          </div>
        </Card>

        <Card>
          <p className="fm-label">跟随系统</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium">使用系统外观</p>
              <p className="mt-0.5 text-[11.5px] text-tertiary">在浅色/深色之间自动切换。</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon="spark"
              onClick={() => {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                themeService.setMode(prefersDark ? 'dark' : 'light');
              }}
            >
              应用系统设置
            </Button>
          </div>
        </Card>
      </div>

      <SectionHeader title="配色方案" icon="palette" description="选择一套底色与强调色组合，所有页面会立即更新。" />

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {themeService.getAvailableThemes().map((theme) => {
          const isActive = scheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => themeService.setScheme(theme.id)}
              className={`rounded-[14px] border p-4 text-left transition-colors ${
                isActive ? 'border-accent bg-accent/10' : 'border-secondary bg-secondary hover:border-accent/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[14px] font-semibold ${isActive ? 'text-accent' : 'text-primary'}`}>
                    {theme.name}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{theme.description}</p>
                </div>
                <Swatches scheme={theme.id} mode={mode} />
              </div>
              {isActive && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-accent">
                  <Icon name="check" size={13} /> 当前使用
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <h3 className="fm-section-title">色板预览</h3>

        <div className="space-y-5">
          <div>
            <p className="fm-label mb-2">表层</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { className: 'bg-primary', label: '底色', text: 'text-tertiary' },
                { className: 'bg-secondary', label: '卡片', text: 'text-tertiary' },
                { className: 'bg-tertiary', label: '次级', text: 'text-tertiary' },
                { className: 'bg-accent', label: '强调', text: 'text-on-accent' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex h-16 items-end justify-center rounded-lg border border-secondary pb-2 ${item.className}`}
                >
                  <span className={`text-[11px] ${item.text}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="fm-label mb-2">语义状态</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { color: 'var(--fm-success)', label: '学习', icon: 'book' as const },
                { color: 'var(--fm-warning)', label: '娱乐', icon: 'gamepad' as const },
                { color: 'var(--fm-info)', label: '音乐', icon: 'music' as const },
                { color: 'var(--fm-error)', label: '风险', icon: 'alert' as const },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-secondary px-3 py-3" style={{ color: item.color }}>
                  <Icon name={item.icon} size={15} />
                  <span className="mt-2 block text-[12.5px] font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="fm-label mb-2">交互元素</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon="check">主要按钮</Button>
              <Button variant="ghost">次要按钮</Button>
              <Button variant="danger" icon="trash">危险操作</Button>
              <span className="fm-chip fm-chip--study"><Icon name="book" size={12} />学习</span>
              <span className="fm-chip fm-chip--ent"><Icon name="gamepad" size={12} />娱乐</span>
              <span className="fm-chip fm-chip--music"><Icon name="music" size={12} />音乐</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
