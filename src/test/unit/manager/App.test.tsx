import { vi } from 'vitest';

vi.mock('webext-bridge/options', () => ({
  sendMessage: vi.fn(() => Promise.resolve({})),
}));

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
});

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ExtensionStorage } from '@core/types';
import { App } from '@manager/App';

const mockStorage: Partial<ExtensionStorage> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve(mockStorage)),
      set: vi.fn((data) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
});

vi.mock('@hooks/useStorage', () => ({
  useStorage: () => mockStorage,
}));

describe('Manager App', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('alert', vi.fn());
  });

  it('should render header and retained navigation tabs', () => {
    render(<App />);

    expect(screen.getByText('Bilibili Focus Mode')).toBeTruthy();
    expect(screen.getByText('统计')).toBeTruthy();
    expect(screen.getAllByText('永久分组').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('UP 主白名单')).toBeTruthy();
    expect(screen.getByText('关键词规则')).toBeTruthy();
    expect(screen.queryByText('待审池')).toBeNull();
    expect(screen.queryByText('即时许可')).toBeNull();
  });

  it('should show the empty permanent state by default', () => {
    render(<App />);

    expect(screen.getByText('没有永久分组')).toBeTruthy();
  });

  it('should switch to the retained stats dashboard', () => {
    mockStorage.debtAccount = {
      currentDebt: 30,
      bankruptcyCount: 0,
      bankruptcyEndTime: null,
      totalEntertainmentMinutes: 15,
      totalLearningMinutes: 10,
      totalMusicMinutes: 0,
    };
    mockStorage.watchHistory = [];

    render(<App />);
    fireEvent.click(screen.getByText('统计'));

    expect(screen.getByText('屏幕使用时间')).toBeTruthy();
  });

  it('should show permanent groups and videos', () => {
    mockStorage.permanentGroups = [
      {
        id: 'learning',
        name: '学习',
        items: [{
          bvid: 'BV1xx',
          title: 'Learning Video',
          uploader: 'Uploader',
          coverUrl: '',
          tag: 'LEARNING',
          addedAt: Date.now(),
        }],
        debtPriority: 1,
      },
    ];

    render(<App />);

    expect(screen.getByText('Learning Video')).toBeTruthy();
    expect(screen.getByText('Uploader')).toBeTruthy();
  });
});
