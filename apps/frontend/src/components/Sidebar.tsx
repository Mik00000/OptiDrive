"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import { Button } from './Button';
import { twMerge } from 'tailwind-merge';
import { useSidebar } from '@/contexts/SidebarContext';

interface MenuItem {
  text: string;
  link: string;
  icon: string;
}

const menu: MenuItem[] = [
  { text: 'Dashboard', link: '/dashboard', icon: 'lucide:layout-dashboard' },
  { text: 'Media Library', link: '/media', icon: 'lucide:image' },
  { text: 'API Keys', link: '/api-keys', icon: 'lucide:key' },
  { text: 'Billing', link: '/billing', icon: 'lucide:credit-card' },
  { text: 'Documentation', link: '/api-docs', icon: 'lucide:book' },
  { text: 'Settings', link: '/settings', icon: 'lucide:settings' },
];

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside
        className={twMerge(
          'bg-sidebar flex h-screen w-65 shrink-0 flex-col border-r border-border p-4 pt-6.5',
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out',
          'md:sticky md:top-0 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className,
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.svg" alt="Logo" width={32} height={32} />
            <span className="text-lg font-bold text-text-light">OptiDrive</span>
          </div>
          <Button 
            variant="ghost" 
            mobileBehavior="none" 
            className="md:hidden -mr-2"
            onClick={() => setIsOpen(false)}
          >
            <Icon icon="lucide:x" width={20} height={20} />
          </Button>
        </div>

      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          {menu.map((item) => (
            <li key={item.text}>
              <Link
                href={item.link}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-text-muted transition-colors duration-200 hover:bg-slate-800/50 hover:text-text-light"
              >
                <Icon icon={item.icon} width={20} />
                <span className="text-sm font-medium">{item.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto border-t border-border pt-4">
        <div className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-800/50">
          <div className="bg-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-light">
            <Icon icon="lucide:user" width={20} height={20} />
          </div>

          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-text-light">
              Alice Chen
            </span>
            <span className="truncate text-xs text-text-muted">
              alice@acmecorp.com
            </span>
          </div>
          <Button variant="ghost" mobileBehavior="none">
            <Icon
              icon="lucide:more-vertical"
              className="ml-auto shrink-0 text-text-muted"
              width={16}
              height={16}
            />
          </Button>
        </div>
      </div>
    </aside>
    </>
  );
};
