"use client";

import { Icon } from '@iconify/react';
import Image from 'next/image';
import { Button } from './Button';
import { twMerge } from 'tailwind-merge';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import Link from 'next/link';

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const { toggle } = useSidebar();
  const { user } = useAuth();

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
          <Link href="/settings" className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity">
            <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size={36} />
          </Link>
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
