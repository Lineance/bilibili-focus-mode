import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}

export function Dialog({ open, onClose, title, description, children, footer, maxWidth = 520 }: DialogProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fm-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="fm-dialog" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth }}>
        <div className="fm-dialog__head">
          <div>
            <h2 className="fm-dialog__title">{title}</h2>
            {description && <p className="fm-dialog__desc">{description}</p>}
          </div>
          <IconButton icon="x" label="关闭" onClick={onClose} />
        </div>
        <div className="fm-dialog__body">{children}</div>
        {footer && <div className="fm-dialog__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
