"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityProps {
  activities?: any[];
}

const RecentActivity = ({ activities = [] }: RecentActivityProps) => {
  const [showAll, setShowAll] = useState(false);
  
  const displayedActivities = showAll ? activities : activities.slice(0, 5);

  return (
    <section className="border-border bg-card flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border">
      <div className="border-border flex items-center justify-between border-b px-6 py-5">
        <h3 className="text-text-light text-lg font-semibold">
          Recent Activity
        </h3>
        {activities.length > 5 && (
          <Button 
            variant="ghost" 
            className="text-accent"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : 'View All'}
          </Button>
        )}
      </div>
      
      {activities.length === 0 ? (
        <div className="p-8 text-center text-text-muted">No recent activity</div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {displayedActivities.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-6 py-4 transition-colors duration-200 hover:bg-border/25 hover:text-text-light"
            >
              <div className="flex items-center gap-4">
                <div className="border-border bg-bg rounded-xl border p-2.25">
                  <Icon icon={
                    item.type === 'FILE_UPLOADED' ? 'lucide:image' :
                    item.type === 'FILE_DELETED' ? 'lucide:trash' :
                    item.type.includes('KEY') ? 'lucide:key' :
                    item.type === 'MEMBER_INVITED' ? 'lucide:mail' :
                    item.type === 'MEMBER_JOINED' ? 'lucide:user-check' :
                    item.type === 'MEMBER_REMOVED' || item.type === 'MEMBER_LEFT' ? 'lucide:user-minus' :
                    item.type === 'ROLE_UPDATED' ? 'lucide:shield' :
                    item.type === 'OWNERSHIP_TRANSFERRED' ? 'lucide:crown' :
                    item.type === 'WORKSPACE_CREATED' ? 'lucide:briefcase' :
                    'lucide:activity'
                  } />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-text-light text-sm">{item.description}</span>
                  <p className="text-text-muted font-mono text-xs">
                    {item.type.split("_").map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 sm:gap-6 flex-col sm:flex-row items-end sm:items-center">
                <p className="text-brand text-xs">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecentActivity;
