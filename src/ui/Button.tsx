import React from 'react';
import { Icon, type IconName } from './Icon';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
}

export function Button({
  variant = 'ghost',
  size = 'md',
  icon,
  iconRight,
  block = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps): React.JSX.Element {
  const classes = [
    'fm-btn',
    `fm-btn--${variant}`,
    size === 'sm' ? 'fm-btn--sm' : '',
    block ? 'fm-btn--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
}

export function IconButton({ icon, label, className, ...rest }: IconButtonProps): React.JSX.Element {
  return (
    <button type="button" className={`fm-icon-btn ${className ?? ''}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
