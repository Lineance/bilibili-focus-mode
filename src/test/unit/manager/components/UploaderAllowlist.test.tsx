import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploaderAllowlist } from '@manager/components/UploaderAllowlist';

describe('UploaderAllowlist', () => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

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
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGet.mockResolvedValue({ allowedUploaders: [] });
    mockSet.mockResolvedValue(undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
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
