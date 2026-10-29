import React from 'react';

import { Icon, type IconName } from './Icon';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: IconName;
  children: React.ReactNode;
}

/** Consistent visual frame for the settings modules. */
export function SettingsSection({ title, description, icon, children }: SettingsSectionProps): React.JSX.Element {
  return (
    <section className="fm-settings-section">
      <header className="fm-settings-section__header">
        <span className="fm-settings-section__icon" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="fm-settings-section__title">{title}</h2>
          {description && <p className="fm-settings-section__description">{description}</p>}
        </div>
      </header>
      <div className="fm-settings-section__body">{children}</div>
    </section>
  );
}
