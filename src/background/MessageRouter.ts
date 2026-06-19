import { logger } from '@core/utils/logger';

type MessageHandler = (request: unknown, sender: chrome.runtime.MessageSender) => Promise<unknown>;

function assertAction(message: unknown): string {
  if (!message || typeof message !== 'object' || !('action' in message)) {
    throw new Error('Invalid message: missing action');
  }
  const { action } = message as { action: unknown };
  if (typeof action !== 'string') {
    throw new Error('Invalid message: action is not a string');
  }
  return action;
}

export class MessageRouter {
  private handlers = new Map<string, MessageHandler>();

  register(action: string, handler: MessageHandler): void {
    this.handlers.set(action, handler);
  }

  listen(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const action = assertAction(request);
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
