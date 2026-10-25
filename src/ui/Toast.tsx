/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<(next: ToastItem[]) => void>();

function emit(): void {
  for (const listener of listeners) listener(items);
}

function push(kind: ToastKind, message: string): void {
  const id = ++counter;
  items = [...items, { id, kind, message }];
  emit();

  window.setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    emit();
  }, 3600);
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
};

export function ToastHost(): React.JSX.Element {
  const [list, setList] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return (
    <div className="fm-toast-host" aria-live="polite">
      {list.map((item) => {
        const icon = item.kind === 'success' ? 'check' : item.kind === 'error' ? 'alert' : 'spark';
        return (
          <div key={item.id} className={`fm-toast fm-toast--${item.kind}`}>
            <span className={`fm-toast__icon fm-toast__icon--${item.kind}`}>
              <Icon name={icon} size={15} />
            </span>
            <span>{item.message}</span>
          </div>
        );
      })}
    </div>
  );
}
