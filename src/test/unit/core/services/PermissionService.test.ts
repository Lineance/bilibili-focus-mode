import { beforeEach, describe, expect, it } from 'vitest';
import { PermissionService } from '@core/services/PermissionService';
import type { ExtensionStorage } from '@core/types';
import { DEFAULT_STORAGE } from '@core/constants';

describe('PermissionService', () => {
  let service: PermissionService;
  let mockStorage: ExtensionStorage;

  beforeEach(() => {
    mockStorage = {
      ...DEFAULT_STORAGE,
      permanentGroups: [],
      debtAccount: {
        ...DEFAULT_STORAGE.debtAccount,
        bankruptcyEndTime: null,
      },
    };
    service = new PermissionService(mockStorage);
  });

  it('should allow permanent group videos', () => {
    mockStorage.permanentGroups = [{
      id: 'learning',
      name: '学习',
      items: [{
        bvid: 'BV1xx',
        title: 'Test Video',
        uploader: 'Test Uploader',
        coverUrl: '',
        tag: 'LEARNING',
        addedAt: Date.now(),
      }],
      debtPriority: 1,
    }];
    service = new PermissionService(mockStorage);

    expect(service.check('BV1xx')).toMatchObject({ allowed: true, reason: 'PERMANENT' });
  });

  it('should allow configured uploaders', () => {
    mockStorage.allowedUploaders = [{
      id: 'uploader-1',
      name: 'Trusted Uploader',
      addedAt: Date.now(),
      tag: 'LEARNING',
    }];
    service = new PermissionService(mockStorage);

    expect(service.check('BV2xx', 'Trusted Uploader')).toMatchObject({
      allowed: true,
      reason: 'PERMANENT',
      uploaderAllowed: true,
      videoTag: 'LEARNING',
    });
  });

  it('should allow keyword matches with their configured tag', () => {
    mockStorage.config = {
      ...mockStorage.config,
      keywordRules: {
        enabled: true,
        keywords: ['tutorial'],
        tag: 'LEARNING',
        items: [{ keyword: 'tutorial', tag: 'LEARNING' }],
      },
    };
    service = new PermissionService(mockStorage);

    expect(service.check('BV3xx', undefined, 'Python Tutorial')).toMatchObject({
      allowed: true,
      reason: 'KEYWORD',
      videoTag: 'LEARNING',
    });
  });

  it('should allow permanent videos during bankruptcy', () => {
    mockStorage.debtAccount.bankruptcyEndTime = Date.now() + 86400000;
    mockStorage.permanentGroups = [{
      id: 'learning',
      name: '学习',
      items: [{
        bvid: 'BV4xx',
        title: 'Test Video',
        uploader: 'Test Uploader',
        coverUrl: '',
        tag: 'LEARNING',
        addedAt: Date.now(),
      }],
      debtPriority: 1,
    }];
    service = new PermissionService(mockStorage);

    expect(service.check('BV4xx')).toMatchObject({ allowed: true, reason: 'PERMANENT' });
  });

  it('should allow learning keyword content during bankruptcy', () => {
    mockStorage.debtAccount.bankruptcyEndTime = Date.now() + 86400000;
    mockStorage.config = {
      ...mockStorage.config,
      keywordRules: { enabled: true, keywords: ['tutorial'], tag: 'LEARNING' },
    };
    service = new PermissionService(mockStorage);

    expect(service.check('BV5xx', undefined, 'Python Tutorial')).toMatchObject({
      allowed: true,
      reason: 'KEYWORD',
    });
  });

  it('should block unknown entertainment content during bankruptcy', () => {
    mockStorage.debtAccount.bankruptcyEndTime = Date.now() + 86400000;
    service = new PermissionService(mockStorage);

    expect(service.check('BV6xx')).toMatchObject({ allowed: false, reason: 'BANKRUPTCY' });
  });

  it('should deny videos without a matching rule', () => {
    expect(service.check('BV7xx')).toMatchObject({
      allowed: false,
      reason: 'NO_PERMISSION',
      videoTag: 'ENTERTAINMENT',
    });
  });
});
