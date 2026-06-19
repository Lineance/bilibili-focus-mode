import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyBypassSettings } from '@manager/components/config/DailyBypassSettings';
import { DEFAULT_CONFIG } from '@core/constants';
import type { ExtensionConfig, FieldDescription } from '@core/types';

describe('DailyBypassSettings', () => {
  const mockUpdateConfig = vi.fn();

  const descriptions: Record<string, FieldDescription> = {
    dailyBypassEnabled: {
      label: '启用每日放行',
      description: '开启后，每天可使用N次放行功能，暂时跳过视频拦截',
      type: 'toggle',
    },
    dailyBypassQuota: {
      label: '每日放行次数',
      description: '每天可使用放行功能的次数（1-10）',
      type: 'number',
      min: 1,
      max: 10,
      step: 1,
    },
    dailyBypassDurationMinutes: {
      label: '放行时长（分钟）',
      description: '每次放行的有效时长（5-120分钟）',
      type: 'number',
      min: 5,
      max: 120,
      step: 5,
    },
  };

  const defaultConfig: ExtensionConfig = {
    ...DEFAULT_CONFIG,
    dailyBypassEnabled: true,
    dailyBypassQuota: 3,
    dailyBypassDurationMinutes: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the section title', () => {
    render(
      <DailyBypassSettings
        config={defaultConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    expect(screen.getByRole('heading', { name: /每日放行/ })).toBeDefined();
  });

  it('should render the checkbox with correct label when enabled', () => {
    render(
      <DailyBypassSettings
        config={defaultConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText('启用每日放行')).toBeDefined();
  });

  it('should render checkbox as unchecked when disabled', () => {
    const disabledConfig = { ...defaultConfig, dailyBypassEnabled: false };

    render(
      <DailyBypassSettings
        config={disabledConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('should call updateConfig with false when checkbox is unchecked', () => {
    render(
      <DailyBypassSettings
        config={defaultConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockUpdateConfig).toHaveBeenCalledWith('dailyBypassEnabled', false);
  });

  it('should call updateConfig with true when checkbox is checked', () => {
    const disabledConfig = { ...defaultConfig, dailyBypassEnabled: false };

    render(
      <DailyBypassSettings
        config={disabledConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockUpdateConfig).toHaveBeenCalledWith('dailyBypassEnabled', true);
  });

  it('should show quota and duration inputs when enabled', () => {
    render(
      <DailyBypassSettings
        config={defaultConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    expect(screen.getByText('每日放行次数')).toBeDefined();
    expect(screen.getByText('放行时长（分钟）')).toBeDefined();
  });

  it('should hide quota and duration inputs when disabled', () => {
    const disabledConfig = { ...defaultConfig, dailyBypassEnabled: false };

    render(
      <DailyBypassSettings
        config={disabledConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    expect(screen.queryByText('每日放行次数')).toBeNull();
    expect(screen.queryByText('放行时长（分钟）')).toBeNull();
  });

  it('should display current quota value', () => {
    render(
      <DailyBypassSettings
        config={defaultConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    const quotaInput = screen.getByDisplayValue('3') as HTMLInputElement;
    expect(quotaInput).toBeDefined();
    expect(quotaInput.type).toBe('number');
  });

  it('should display current duration value', () => {
    render(
      <DailyBypassSettings
        config={defaultConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    const durationInput = screen.getByDisplayValue('30') as HTMLInputElement;
    expect(durationInput).toBeDefined();
    expect(durationInput.type).toBe('number');
  });

  it('should call updateConfig when quota is changed', () => {
    render(
      <DailyBypassSettings
        config={defaultConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    const quotaInput = screen.getByDisplayValue('3');
    fireEvent.change(quotaInput, { target: { value: '5' } });

    expect(mockUpdateConfig).toHaveBeenCalledWith('dailyBypassQuota', 5);
  });

  it('should call updateConfig when duration is changed', () => {
    render(
      <DailyBypassSettings
        config={defaultConfig}
        updateConfig={mockUpdateConfig}
        descriptions={descriptions}
      />
    );

    const durationInput = screen.getByDisplayValue('30');
    fireEvent.change(durationInput, { target: { value: '60' } });

    expect(mockUpdateConfig).toHaveBeenCalledWith('dailyBypassDurationMinutes', 60);
  });

  it('should render with minimal descriptions', () => {
    const minimalDescriptions: Record<string, FieldDescription> = {
      dailyBypassEnabled: { label: 'Bypass', description: '', type: 'toggle' },
      dailyBypassQuota: { label: 'Quota', description: '', type: 'number' },
      dailyBypassDurationMinutes: { label: 'Duration', description: '', type: 'number' },
    };

    render(
      <DailyBypassSettings
        config={defaultConfig}
        updateConfig={mockUpdateConfig}
        descriptions={minimalDescriptions}
      />
    );

    expect(screen.getByText('Bypass')).toBeDefined();
    expect(screen.getByText('Quota')).toBeDefined();
    expect(screen.getByText('Duration')).toBeDefined();
  });
});
