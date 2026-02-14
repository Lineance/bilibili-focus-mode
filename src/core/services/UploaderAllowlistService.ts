import type { AllowedUploader, VideoMetadata, VideoTag } from '@core/types';

export class UploaderAllowlistService {
  private readonly STORAGE_KEY = 'allowedUploaders';

  /**
   * Get all allowed uploaders
   */
  async getAllowedUploaders(): Promise<AllowedUploader[]> {
    const storage = await chrome.storage.local.get(this.STORAGE_KEY);
    return (storage[this.STORAGE_KEY] as AllowedUploader[]) || [];
  }

  /**
   * Add an uploader to the allowlist
   */
  async addUploader(name: string, tag: VideoTag = 'ENTERTAINMENT'): Promise<AllowedUploader> {
    const uploaders = await this.getAllowedUploaders();
    
    // Check if already exists
    const exists = uploaders.some(u => u.name === name);
    if (exists) {
      throw new Error('UP主已在白名单中');
    }

    const newUploader: AllowedUploader = {
      id: `uploader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      addedAt: Date.now(),
      tag,
    };

    await chrome.storage.local.set({
      [this.STORAGE_KEY]: [...uploaders, newUploader],
    });

    return newUploader;
  }

  /**
   * Remove an uploader from the allowlist
   */
  async removeUploader(id: string): Promise<void> {
    const uploaders = await this.getAllowedUploaders();
    const filtered = uploaders.filter(u => u.id !== id);
    await chrome.storage.local.set({
      [this.STORAGE_KEY]: filtered,
    });
  }

  /**
   * Check if an uploader is in the allowlist
   */
  async isAllowed(uploaderName: string): Promise<boolean> {
    const uploaders = await this.getAllowedUploaders();
    return uploaders.some(u => u.name === uploaderName);
  }

  /**
   * Get uploader tag if allowed
   */
  async getUploaderTag(uploaderName: string): Promise<VideoTag | null> {
    const uploaders = await this.getAllowedUploaders();
    const uploader = uploaders.find(u => u.name === uploaderName);
    return uploader?.tag || null;
  }

  /**
   * Check if video's uploader is allowed and return metadata if so
   */
  async checkVideoAllowed(video: VideoMetadata): Promise<{ allowed: boolean; tag?: VideoTag }> {
    const tag = await this.getUploaderTag(video.uploader);
    if (tag) {
      return { allowed: true, tag };
    }
    return { allowed: false };
  }

  /**
   * Update uploader tag
   */
  async updateUploaderTag(id: string, tag: VideoTag): Promise<void> {
    const uploaders = await this.getAllowedUploaders();
    const updated = uploaders.map(u => {
      if (u.id === id) {
        return { ...u, tag };
      }
      return u;
    });
    await chrome.storage.local.set({
      [this.STORAGE_KEY]: updated,
    });
  }

  /**
   * Clear all allowed uploaders
   */
  async clearAll(): Promise<void> {
    await chrome.storage.local.set({
      [this.STORAGE_KEY]: [],
    });
  }

  /**
   * Get count of allowed uploaders
   */
  async getCount(): Promise<number> {
    const uploaders = await this.getAllowedUploaders();
    return uploaders.length;
  }
}
