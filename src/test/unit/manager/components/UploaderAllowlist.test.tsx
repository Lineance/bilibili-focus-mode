import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploaderAllowlist } from '@manager/components/UploaderAllowlist';

describe('UploaderAllowlist', () => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: mockGet,
        set: mockSet,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ allowedUploaders: [] });
    mockSet.mockResolvedValue(undefined);
  });

  it('should log add success as info instead of warning', async () => {
    render(<UploaderAllowlist uploaders={[]} />);

    fireEvent.change(screen.getByPlaceholderText('输入UP主名称'), {
      target: { value: 'Test Uploader' },
    });
    fireEvent.click(screen.getByText('添加'));

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalled();
    });

    expect(infoSpy).toHaveBeenCalledWith('[UploaderAllowlist] 添加成功！');
    expect(warnSpy).not.toHaveBeenCalledWith('[UploaderAllowlist] 添加成功！');
  });
});
