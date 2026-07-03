import { ExpirationService } from '@core/services/';

describe('ExpirationService', () => {
  let service: ExpirationService;

  beforeEach(() => {
    service = new ExpirationService(6);
  });

  describe('createInstantItem', () => {
    it('should create instant item with correct timestamps', () => {
      const before = Date.now();
      const item = service.createInstantItem(
        {
          bvid: 'BV1xx',
          title: 'Test',
          uploader: 'Test',
          coverUrl: '',
          tag: 'ENTERTAINMENT',
          addedAt: before,
        },
        'ABCD-1234'
      );
      const after = Date.now();

      expect(item.expiresAt).toBeGreaterThanOrEqual(before + 6 * 60 * 60 * 1000);
      expect(item.expiresAt).toBeLessThanOrEqual(after + 6 * 60 * 60 * 1000);
      expect(item.fuseCode).toBe('ABCD-1234');
      expect(item.usedFuse).toBe(false);
    });
  });
});
