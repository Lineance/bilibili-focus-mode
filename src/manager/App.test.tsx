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
    expect(screen.getByText('学习')).toBeTruthy();
    expect(screen.getByText('娱乐')).toBeTruthy();
    expect(screen.getByText('冷静期')).toBeTruthy();
    expect(screen.getByText('删除')).toBeTruthy();
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
    expect(screen.getByText('债务较高，建议观看学习类视频偿还')).toBeTruthy();
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
});
