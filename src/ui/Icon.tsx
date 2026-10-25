import React from 'react';

export type IconName =
  | 'list'
  | 'bolt'
  | 'folder'
  | 'chart'
  | 'user'
  | 'tag'
  | 'sliders'
  | 'palette'
  | 'plus'
  | 'trash'
  | 'external'
  | 'check'
  | 'clock'
  | 'alert'
  | 'lock'
  | 'search'
  | 'sun'
  | 'moon'
  | 'x'
  | 'chevronDown'
  | 'upload'
  | 'download'
  | 'play'
  | 'book'
  | 'music'
  | 'gamepad'
  | 'shield'
  | 'arrowRight'
  | 'filter'
  | 'key'
  | 'spark'
  | 'history'
  | 'settings';

const ICONS: Record<IconName, React.ReactNode> = {
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1" />
      <circle cx="3.5" cy="12" r="1" />
      <circle cx="3.5" cy="18" r="1" />
    </>
  ),
  bolt: <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />,
  folder: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3l2 2.5h8A2.5 2.5 0 0 1 21 10v7.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />,
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.6 3.6-5.5 7-5.5s5.8 1.9 7 5.5" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.7 0 2.5-1 2.5-2.2 0-1.4-1.2-1.8-1.2-3 0-1 .8-1.8 2-1.8H17a4 4 0 0 0 4-4C21 6.2 17 3 12 3Z" />
      <circle cx="7.5" cy="10" r="1.1" />
      <circle cx="10.5" cy="6.8" r="1.1" />
      <circle cx="15" cy="7.5" r="1.1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-8 8" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  check: <path d="M5 12.5 9.5 17 19 6.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.8 19h18.4z" />
      <path d="M12 9v4.5M12 16.8v.2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  upload: (
    <>
      <path d="M12 16V4M7.5 8 12 3.5 16.5 8" />
      <path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12M7.5 11.5 12 16l4.5-4.5" />
      <path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" />
    </>
  ),
  play: <path d="M9 6.5v11l9-5.5z" />,
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5V5.5M20 18v3H6.5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l10-2v11" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="15" r="2.5" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 9h10a5 5 0 0 1 5 5c0 2.2-1.8 3.5-3.5 2.6L16 15H8l-2.5 1.6C3.8 17.5 2 16.2 2 14a5 5 0 0 1 5-5Z" />
      <path d="M8 12v2M7 13h2M15.5 13h.01M17.5 14.5h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.2 2.8 7.6 7 9.5 4.2-1.9 7-5.3 7-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  arrowRight: <path d="M4 12h15M14 7l5 5-5 5" />,
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4z" />,
  key: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 9 9M16 16l2-2M19 19l2-2" />
    </>
  ),
  spark: <path d="M12 2.5 13.8 9l6.2 1.8-6.2 1.8L12 19l-1.8-6.4L4 10.8 10.2 9z" />,
  history: (
    <>
      <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" />
      <path d="M12 8v4.5l3 1.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, className, strokeWidth = 1.7 }: IconProps): React.JSX.Element {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
