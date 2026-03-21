// Mock webext-bridge before any imports
import { vi } from 'vitest';

// Mock webext-bridge/options module to avoid loading webextension-polyfill
vi.mock('webext-bridge/options', () => ({
  sendMessage: vi.fn(() => Promise.resolve({})),
}));

// Mock chrome object
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
});

// Now import modules
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ExtensionStorage } from '@core/types';
import { App } from '@manager/App';

// Mock storage for testing
const mockStorage: Partial<ExtensionStorage> = {};
const mockListeners: Array<(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void> = [];

// Override chrome.storage with our mock implementation
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
      addListener: vi.fn((listener) => mockListeners.push(listener)),
      removeListener: vi.fn(),
    },
  },
});

// Mock useStorage hook
vi.mock('@hooks/useStorage', () => ({
  useStorage: () => mockStorage,
}));

describe('Manager App', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete (mockStorage as Record<string, unknown>)[key]);
    mockListeners.length = 0;
    vi.clearAllMocks();
    
    // Mock window.confirm and window.alert
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('alert', vi.fn());
  });

  it('should render header', () => {
    render(<App />);
    
    expect(screen.getByText('Bilibili Focus Mode')).toBeTruthy();
    expect(screen.getByText('意图性娱乐时间管理工具')).toBeTruthy();
  });

  it('should render navigation tabs', () => {
    render(<App />);
    
    expect(screen.getByText('待审池')).toBeTruthy();
    expect(screen.getByText('冷静期')).toBeTruthy();
    expect(screen.getByText('即时许可')).toBeTruthy();
    expect(screen.getByText('永久分组')).toBeTruthy();
    expect(screen.getByText('幽灵档案')).toBeTruthy();
    expect(screen.getByText('债务')).toBeTruthy();
  });

  it('should show empty limbo message', () => {
    render(<App />);
    
    expect(screen.getByText('待审池为空，在B站播放页添加视频')).toBeTruthy();
  });

  it('should switch tabs when clicked', () => {
    render(<App />);
    
    // Click on debt tab
    fireEvent.click(screen.getByText('债务'));
    
    expect(screen.getByText('债务仪表盘')).toBeTruthy();
  });

  it('should show limbo items when storage has data', () => {
    mockStorage.limboList = [
      {
        bvid: 'BV1xx',
        title: 'Test Video',
        uploader: 'Test Uploader',
        coverUrl: 'https://example.com/cover.jpg',
        tag: 'ENTERTAINMENT',
        addedAt: Date.now(),
        sourceUrl: 'https://bilibili.com/video/BV1xx',
      },
    ];

    render(<App />);
    
    expect(screen.getByText('Test Video')).toBeTruthy();
    expect(screen.getByText('Test Uploader')).toBeTruthy();
    // Check for tag display and action buttons
    expect(screen.getByText('🎮 娱乐')).toBeTruthy();
    // Use getAllByText for buttons that also appear in nav
    expect(screen.getAllByText('永久').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('冷静期').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('立即').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('删除').length).toBeGreaterThanOrEqual(1);
  });

  it('should show clear button when limbo has items', () => {
    mockStorage.limboList = [
      {
        bvid: 'BV1xx',
        title: 'Test Video',
        uploader: 'Test Uploader',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: Date.now(),
        sourceUrl: 'https://bilibili.com/video/BV1xx',
      },
    ];

    render(<App />);
    
    expect(screen.getByText('清空待审池')).toBeTruthy();
  });

  it('should show debt dashboard', () => {
    mockStorage.debtAccount = {
      currentDebt: 30,
      bankruptcyCount: 0,
      bankruptcyEndTime: null,
      totalEntertainmentMinutes: 15,
      totalLearningMinutes: 10,
      totalMusicMinutes: 0,
    };

    render(<App />);
    
    fireEvent.click(screen.getByText('债务'));
    
    // Check for debt dashboard title and status
    expect(screen.getByText('债务仪表盘')).toBeTruthy();
    expect(screen.getByText('债务状况良好')).toBeTruthy();
    // Check for watch time statistics
    expect(screen.getByText('娱乐时长')).toBeTruthy();
    expect(screen.getByText('学习时长')).toBeTruthy();
  });

  it('should show bankruptcy warning', () => {
    // Set entertainment minutes to create debt >= maxDebtMinutes (60)
    // 35 minutes * 2.0 ratio = 70 debt, which exceeds 60 threshold
    mockStorage.debtAccount = {
      currentDebt: 70,
      bankruptcyCount: 1,
      bankruptcyEndTime: null,
      totalEntertainmentMinutes: 35,
      totalLearningMinutes: 0,
      totalMusicMinutes: 0,
    };

    render(<App />);
    
    fireEvent.click(screen.getByText('债务'));
    
    expect(screen.getByText('⚠️ 已破产！24小时内禁止新申请')).toBeTruthy();
  });

  describe('Limbo Review Actions', () => {
    const mockItem = {
      bvid: 'BV1xx',
      title: 'Test Video',
      uploader: 'Test Uploader',
      coverUrl: 'https://example.com/cover.jpg',
      tag: 'ENTERTAINMENT' as const,
      addedAt: Date.now(),
      sourceUrl: 'https://bilibili.com/video/BV1xx',
    };

    beforeEach(() => {
      mockStorage.limboList = [mockItem];
      mockStorage.permanentGroups = [];
      mockStorage.coolingList = [];
      mockStorage.instantList = [];
    });

    it('should show action buttons for limbo items', () => {
      render(<App />);
      
      // Check that action buttons are rendered (use getAllByText since they also appear in nav)
      expect(screen.getAllByText('永久').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('冷静期').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('立即').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('删除').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Other Tabs', () => {
    it('should show cooling list', () => {
      const now = Date.now();
      mockStorage.coolingList = [
        {
          bvid: 'BV1xx',
          title: 'Cooling Video',
          uploader: 'Uploader',
          coverUrl: '',
          tag: 'ENTERTAINMENT' as const,
          addedAt: now,
          availableAt: now + 24 * 3600000,
          expiresAt: now + 72 * 3600000,
        },
      ];

      render(<App />);
      fireEvent.click(screen.getByText('冷静期'));
      
      expect(screen.getByText('Cooling Video')).toBeTruthy();
      expect(screen.getByText('Uploader')).toBeTruthy();
    });

    it('should show instant list', () => {
      const now = Date.now();
      mockStorage.instantList = [
        {
          bvid: 'BV1xx',
          title: 'Instant Video',
          uploader: 'Uploader',
          coverUrl: '',
          tag: 'ENTERTAINMENT' as const,
          addedAt: now,
          expiresAt: now + 6 * 3600000,
          fuseCode: 'ABCD-1234',
          usedFuse: false,
        },
      ];

      render(<App />);
      fireEvent.click(screen.getByText('即时许可'));
      
      expect(screen.getByText('Instant Video')).toBeTruthy();
    });

    it('should show permanent groups', () => {
      mockStorage.permanentGroups = [
        {
          id: 'learning',
          name: '学习',
          items: [
            {
              bvid: 'BV1xx',
              title: 'Learning Video',
              uploader: 'Uploader',
              coverUrl: '',
              tag: 'LEARNING' as const,
              addedAt: Date.now(),
            },
          ],
          debtPriority: 1,
        },
        {
          id: 'entertainment',
          name: '娱乐',
          items: [
            {
              bvid: 'BV2xx',
              title: 'Entertainment Video',
              uploader: 'Uploader2',
              coverUrl: '',
              tag: 'ENTERTAINMENT' as const,
              addedAt: Date.now(),
            },
          ],
          debtPriority: 2,
        },
      ];

      render(<App />);
      fireEvent.click(screen.getByText('永久分组'));
      
      // Check for the two-column layout with learning and entertainment sections
      expect(screen.getByText('📚')).toBeTruthy();
      expect(screen.getByText('🎮')).toBeTruthy();
      expect(screen.getByText('学习 (1)')).toBeTruthy();
      expect(screen.getByText('娱乐 (1)')).toBeTruthy();
      expect(screen.getByText('Learning Video')).toBeTruthy();
      expect(screen.getByText('Entertainment Video')).toBeTruthy();
    });
  });
});
