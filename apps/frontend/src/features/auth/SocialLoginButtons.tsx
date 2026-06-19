import React from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';

export function SocialLoginButtons() {
  const handleGoogle = () => {
    // Тут буде перенаправлення на Google OAuth (або відкриття popup)
    window.location.href = '/api/internal/auth/google';
  };

  const handleGithub = () => {
    // Тут буде перенаправлення на GitHub OAuth
    window.location.href = '/api/internal/auth/github';
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* Виправлений розділювач */}
      <div className="flex items-center w-full my-2">
        <div className="flex-grow border-t border-border"></div>
        <span className="px-3 text-xs uppercase text-text-muted whitespace-nowrap">
          Or continue with
        </span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="bordered" onClick={handleGoogle} type="button" className="justify-center">
          <Icon icon="mdi:google" width={18} height={18} />
          <span>Google</span>
        </Button>
        <Button variant="bordered" onClick={handleGithub} type="button" className="justify-center">
          <Icon icon="mdi:github" width={18} height={18} />
          <span>GitHub</span>
        </Button>
      </div>
    </div>
  );
}