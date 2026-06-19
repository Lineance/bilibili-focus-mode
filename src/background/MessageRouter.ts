import { logger } from '@core/utils/logger';

type MessageHandler = (request: unknown, sender: chrome.runtime.MessageSender) => Promise<unknown>;

export class MessageRouter {
  private handlers = new Map<string, MessageHandler>();

  register(action: string, handler: MessageHandler): void {
    this.handlers.set(action, handler);
  }

  listen(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const { action } = request as { action: string };
      const handler = this.handlers.get(action);

      if (handler) {
        handler(request, sender)
          .then(sendResponse)
          .catch((error) => {
            logger.error('MessageRouter', `Error handling ${action}:`, error);
            sendResponse({ error: String(error) });
          });
        return true;
      }
    });
  }
}
