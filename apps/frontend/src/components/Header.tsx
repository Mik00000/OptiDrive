"use client";

import { Icon } from '@iconify/react';
import Image from 'next/image';
import { Button } from './Button';
import { twMerge } from 'tailwind-merge';
import { useSidebar } from '@/contexts/SidebarContext';

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const { toggle } = useSidebar();

  return (
    <>
      <header
        className={twMerge(
          'border-border bg-sidebar flex w-full items-center justify-between gap-3 border-b px-4 py-3',
          className,
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <Image src="/images/logo.svg" alt="Logo" width={32} height={32} />
          <span className="text-text-light text-lg font-bold">OptiDrive</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-accent text-text-light flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <Button variant="ghost" mobileBehavior="none">
              <Icon icon="lucide:user" width={20} height={20} />
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button variant="ghost" mobileBehavior="none" onClick={toggle}>
              <Icon icon="lucide:menu" width={22} height={22} />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
