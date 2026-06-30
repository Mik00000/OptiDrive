"use client";

import { Icon } from '@iconify/react';

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number; // px: 32, 40, 48, etc.
  className?: string;
}

/**
 * Універсальний компонент аватарки.
 * Якщо є avatarUrl — показує фото.
 * Якщо є ім'я — показує першу літеру.
 * Інакше — іконку lucide:user.
 */
export function UserAvatar({ name, avatarUrl, size = 36, className = '' }: UserAvatarProps) {
  const sizeStyle = { width: size, height: size, minWidth: size, minHeight: size };

  if (avatarUrl) {
    return (
      <div
        className={`rounded-full overflow-hidden shrink-0 ${className}`}
        style={sizeStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name || 'User avatar'}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback при broken image
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.parentElement as HTMLElement).setAttribute('data-fallback', 'true');
          }}
        />
      </div>
    );
  }

  if (name) {
    return (
      <div
        className={`rounded-full bg-accent flex items-center justify-center shrink-0 text-text-light font-semibold select-none ${className}`}
        style={{ ...sizeStyle, fontSize: Math.round(size * 0.4) }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={`rounded-full bg-accent flex items-center justify-center shrink-0 text-text-light ${className}`}
      style={sizeStyle}
    >
      <Icon icon="lucide:user" width={Math.round(size * 0.55)} height={Math.round(size * 0.55)} />
    </div>
  );
}
