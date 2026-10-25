import React from 'react';

interface FieldProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactNode;
}

/** One settings row: label/description left, control right. */
export function Field({ label, description, control }: FieldProps): React.JSX.Element {
  return (
    <div className="fm-field">
      <div className="min-w-0">
        <div className="fm-field__label">{label}</div>
        {description && <div className="fm-field__desc">{description}</div>}
      </div>
      <div className="fm-field__control">{control}</div>
    </div>
  );
}

export function FieldGroup({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div>{children}</div>;
}
