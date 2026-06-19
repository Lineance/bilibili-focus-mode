type StorageOperation = () => Promise<void>;

class StorageQueue {
  private queue: StorageOperation[] = [];
  private processing = false;

  async enqueue(operation: StorageOperation): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await operation();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      try {
        await operation();
      } catch (error) {
        console.error('[StorageQueue] Operation failed:', error);
      }
    }
    this.processing = false;
  }
}

export const storageQueue = new StorageQueue();
