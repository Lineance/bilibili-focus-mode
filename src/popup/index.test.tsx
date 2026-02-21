import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Popup } from './Popup';

// Mock chrome APIs
const mockOpenOptionsPage = vi.fn();
const mockCreate = vi.fn();

vi.stubGlobal('chrome', {
  runtime: {
    openOptionsPage: mockOpenOptionsPage,
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
    
    expect(screen.getByText('Bilibili Focus Mode')).toBeTruthy();
    expect(screen.getByText('打开管理页')).toBeTruthy();
    expect(screen.getByText('前往B站')).toBeTruthy();
    expect(screen.getByText('快捷键: Ctrl+Shift+A 快速添加')).toBeTruthy();
  });

  it('should open options page when button clicked', () => {
    render(<Popup />);
    
    fireEvent.click(screen.getByText('打开管理页'));
    
    expect(mockOpenOptionsPage).toHaveBeenCalled();
  });

  it('should open bilibili when button clicked', () => {
    render(<Popup />);
    
    fireEvent.click(screen.getByText('前往B站'));
    
    expect(mockCreate).toHaveBeenCalledWith({ url: 'https://www.bilibili.com' });
  });
});
