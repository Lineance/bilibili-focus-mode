import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from './App';
import type { ExtensionStorage } from '@core/types';

// Mock chrome.storage
const mockStorage: Partial<ExtensionStorage> = {};
const mockListeners: Array<(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void> = [];

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
    // Use getAllByText for buttons that appear in both nav and content
    expect(screen.getAllByText('学习').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('娱乐').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('冷静期').length).toBeGreaterThanOrEqual(1);
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
      totalAccrued: 50,
      totalRepaid: 20,
      bankruptcyCount: 0,
      bankruptcyEndTime: null,
    };

    render(<App />);
    
    fireEvent.click(screen.getByText('债务'));
    
    expect(screen.getByText('30.0 分钟')).toBeTruthy();
    // 30 minutes shows "债务状况良好" (not > 30 threshold)
    expect(screen.getByText('债务状况良好')).toBeTruthy();
  });

  it('should show bankruptcy warning', () => {
    mockStorage.debtAccount = {
      currentDebt: 60,
      totalAccrued: 80,
      totalRepaid: 20,
      bankruptcyCount: 1,
      bankruptcyEndTime: null,
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
    });

    it('should add to permanent group when clicking 学习', async () => {
      render(<App />);
      
      const learningButtons = screen.getAllByText('学习');
      // Click the action button (not the tab)
      const actionButton = learningButtons.find(btn => 
        btn.classList.contains('bg-green-600')
      );
      expect(actionButton).toBeTruthy();
      
      if (actionButton) {
        fireEvent.click(actionButton);
      }

      // Verify storage was updated
      await vi.waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            limboList: [],
            permanentGroups: expect.arrayContaining([
              expect.objectContaining({
                items: expect.arrayContaining([
                  expect.objectContaining({
                    bvid: 'BV1xx',
                    tag: 'LEARNING',
                  }),
                ]),
              }),
            ]),
          })
        );
      });
    });

    it('should add to permanent group when clicking 娱乐', async () => {
      render(<App />);
      
      const entertainmentButtons = screen.getAllByText('娱乐');
      const actionButton = entertainmentButtons.find(btn => 
        btn.classList.contains('bg-yellow-600')
      );
      expect(actionButton).toBeTruthy();
      
      if (actionButton) {
        fireEvent.click(actionButton);
      }

      await vi.waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            limboList: [],
            permanentGroups: expect.arrayContaining([
              expect.objectContaining({
                items: expect.arrayContaining([
                  expect.objectContaining({
                    bvid: 'BV1xx',
                    tag: 'ENTERTAINMENT',
                  }),
                ]),
              }),
            ]),
          })
        );
      });
    });

    it('should add to cooling list when clicking 冷静期', async () => {
      render(<App />);
      
      const coolingButtons = screen.getAllByText('冷静期');
      const actionButton = coolingButtons.find(btn => 
        btn.classList.contains('bg-blue-600')
      );
      expect(actionButton).toBeTruthy();
      
      if (actionButton) {
        fireEvent.click(actionButton);
      }

      await vi.waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({
            limboList: [],
            coolingList: expect.arrayContaining([
              expect.objectContaining({
                bvid: 'BV1xx',
                availableAt: expect.any(Number),
                expiresAt: expect.any(Number),
              }),
            ]),
          })
        );
      });
    });

    it('should delete item when clicking 删除', async () => {
      render(<App />);
      
      const deleteButtons = screen.getAllByText('删除');
      const actionButton = deleteButtons.find(btn => 
        btn.classList.contains('bg-red-600')
      );
      expect(actionButton).toBeTruthy();
      
      if (actionButton) {
        fireEvent.click(actionButton);
      }

      await vi.waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          limboList: [],
        });
      });
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
          id: 'group1',
          name: 'Test Group',
          items: [
            {
              bvid: 'BV1xx',
              title: 'Permanent Video',
              uploader: 'Uploader',
              coverUrl: '',
              tag: 'LEARNING' as const,
              addedAt: Date.now(),
            },
          ],
          debtPriority: 1,
        },
      ];

      render(<App />);
      fireEvent.click(screen.getByText('永久分组'));
      
      // Use getAllByText since group name appears with count
      expect(screen.getAllByText(/Test Group/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Permanent Video')).toBeTruthy();
    });
  });
});
