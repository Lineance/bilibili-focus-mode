import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Popup } from '@popup/Popup';

// Mock chrome APIs
const mockOpenOptionsPage = vi.fn();
const mockCreate = vi.fn();

vi.stubGlobal('chrome', {
  runtime: {
    openOptionsPage: mockOpenOptionsPage,
    getURL: (path: string) => `chrome-extension://test/${path}`,
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    create: mockCreate,
  },
});

describe('Popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render popup content', () => {
    render(<Popup />);
    
    expect(screen.getByText('Focus Mode')).toBeTruthy();
    expect(screen.getByText('打开管理页')).toBeTruthy();
    expect(screen.getByText('前往 B 站')).toBeTruthy();
  });

  it('should open options page when button clicked', () => {
    render(<Popup />);
    
    fireEvent.click(screen.getByText('打开管理页'));
    
    expect(mockOpenOptionsPage).toHaveBeenCalled();
  });

  it('should open bilibili when button clicked', () => {
    render(<Popup />);
    
    fireEvent.click(screen.getByText('前往 B 站'));
    
    expect(mockCreate).toHaveBeenCalledWith({ url: 'https://www.bilibili.com' });
  });
});
