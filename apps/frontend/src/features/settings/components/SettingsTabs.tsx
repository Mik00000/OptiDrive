'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SETTINGS_LINKS } from '../constants/settings-links';

export const SettingsTabs = () => {
  const pathname = usePathname();

  return (
    <ul className="border-border mb-4 flex h-14 gap-4 border-t border-b px-4 sm:px-6 lg:px-8 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {SETTINGS_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <li
            key={link.href}
            className={`group relative h-full cursor-pointer px-2 transition-colors whitespace-nowrap shrink-0 ${
              isActive ? 'text-text-light' : 'text-text-muted hover:text-text-light'
            }`}
          >
            <Link href={link.href} className="flex h-full w-full items-center">
              {link.title}
            </Link>
            <span
              className={`bg-accent absolute right-0 bottom-0 left-0 h-0.5 origin-left transition-transform duration-300 ${
                isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`}
            />
          </li>
        );
      })}
    </ul>
  );
};
