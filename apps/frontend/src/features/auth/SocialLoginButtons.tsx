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
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-text-muted">Or continue with</span>
        </div>
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
