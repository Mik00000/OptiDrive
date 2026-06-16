"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';
import { InviteMemberModal } from './InviteMemberModal';

export const TeamTab = () => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const members = [
    { name: 'John Doe', email: 'john@example.com', role: 'Owner' },
    { name: 'Jane Smith', email: 'jane@example.com', role: 'Admin' },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8 relative">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        <div className="border-border border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <span className="text-text-light text-lg font-semibold">
              Team Members
            </span>
            <p className="text-text-muted text-sm mt-1">
              Manage who has access to this project.
            </p>
          </div>
          <Button variant="primary" className="w-full sm:w-auto shrink-0 justify-center" onClick={() => setIsInviteModalOpen(true)}>
            <Icon icon="lucide:user-plus" width="16" height="16" className="mr-2" />
            Invite Member
          </Button>
        </div>
        
        <div className="flex flex-col p-0">
          {members.map((member, idx) => (
            <div key={idx} className="border-border flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b last:border-b-0 gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-accent/20 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold">
                  {member.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-text-light font-medium">{member.name}</span>
                  <span className="text-text-muted text-sm">{member.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="bg-bg border-border text-text-muted border px-2 py-1 rounded text-xs font-medium">
                  {member.role}
                </span>
                <button className="text-text-muted hover:text-error transition-colors p-1">
                  <Icon icon="lucide:x" width="18" height="18" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />
    </div>
  );
};
