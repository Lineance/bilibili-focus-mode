/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

let state: ConfirmState | null = null;
let notify: (() => void) | null = null;

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  // Resolve any pending confirmation as "cancel" so multiple prompts cannot stack.
  state?.resolve(false);

  return new Promise<boolean>((resolve) => {
    state = { ...options, resolve };
    notify?.();
  });
}

export function ConfirmHost(): React.JSX.Element {
  const [, force] = useState(0);

  useEffect(() => {
    notify = () => force((n) => n + 1);
    return () => {
      notify = null;
    };
  }, []);

  const close = (result: boolean) => {
    state?.resolve(result);
    state = null;
    force((n) => n + 1);
  };

  return (
    <Dialog
      open={state !== null}
      onClose={() => close(false)}
      title={state?.title ?? ''}
      description={state?.description}
      maxWidth={420}
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            {state?.cancelLabel ?? '取消'}
          </Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
            {state?.confirmLabel ?? '确定'}
          </Button>
        </>
      }
    >
      <p className="fm-hint">此操作会立即生效。</p>
    </Dialog>
  );
}
