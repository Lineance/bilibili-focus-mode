import React, { useState } from 'react';

const PLACEHOLDER = (() => {
  try {
    return chrome.runtime.getURL('cover-placeholder.svg');
  } catch {
    return '';
  }
})();

export const VideoCover = React.memo(function VideoCover({
  url,
  title,
  small = false,
}: {
  url: string;
  title: string;
  small?: boolean;
}): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const sizeClass = small ? 'h-12 w-20' : 'h-[68px] w-[118px]';
  const src = !url || failed ? PLACEHOLDER : url;

  return (
    <div className={`${sizeClass} shrink-0 overflow-hidden rounded-md border border-secondary bg-tertiary`}>
      {src ? (
        <img
          src={src}
          alt={title}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </div>
  );
});
