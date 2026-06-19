import { ExpirationService } from '@core/services/';

describe('ExpirationService', () => {
  let service: ExpirationService;

  beforeEach(() => {
    service = new ExpirationService(24, 48, 6, 7);
  });

  describe('createCoolingItem', () => {
    it('should create cooling item with correct timestamps', () => {
      const before = Date.now();
      const item = service.createCoolingItem({
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: before,
      });
      const after = Date.now();

      expect(item.availableAt).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
      expect(item.availableAt).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
      expect(item.expiresAt).toBe(item.availableAt + 48 * 60 * 60 * 1000);
    });
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

  describe('createGhostItem', () => {
    it('should create ghost item with correct timestamps', () => {
      const before = Date.now();
      const item = service.createGhostItem({
        bvid: 'BV1xx',
        title: 'Test',
        uploader: 'Test',
        coverUrl: '',
        tag: 'ENTERTAINMENT',
        addedAt: before,
      });
      const after = Date.now();

      expect(item.diedAt).toBeGreaterThanOrEqual(before);
      expect(item.diedAt).toBeLessThanOrEqual(after);
      expect(item.canResurrectUntil).toBe(item.diedAt + 7 * 24 * 60 * 60 * 1000);
    });
  });
});
