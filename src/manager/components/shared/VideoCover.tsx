import React, { useState } from 'react';

export function VideoCover({ url, title, small = false }: { url: string; title: string; small?: boolean }): React.JSX.Element {
  const [error, setError] = useState(false);
  const sizeClass = small ? 'w-20 h-12' : 'w-32 h-20';

  if (error || !url) {
    return (
      <div className={`${sizeClass} bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400`}>
        无封面
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={title}
      className={`${sizeClass} object-cover rounded`}
      onError={() => setError(true)}
      crossOrigin="anonymous"
    />
  );
}
