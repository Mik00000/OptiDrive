"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import PageHeading from '@/components/PageHeading';
import AnalyticsChart from '@/features/dashboard/AnalyticsChart';
import InfoBlocks from '@/features/dashboard/InfoBlocks';
import RecentActivity from '@/features/dashboard/RecentActivity';
import StorageUsedBar from '@/features/dashboard/StorageUsedBar';
import { Icon } from '@iconify/react';
import { UploadMediaModal } from '@/features/media/UploadMediaModal';
import { getWorkspaceStatsApi, WorkspaceStats } from '@/features/dashboard/api';

const DashboardPage = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getWorkspaceStatsApi();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <section className="dashboard-page">
      <PageHeading title="Dashboard">
        <Button variant="accent" mobileBehavior="icon-only" onClick={() => setIsUploadModalOpen(true)}>
          <div className="inline-flex h-5 w-5 items-center justify-center sm:h-4 sm:w-4">
            <Icon icon="lucide:upload" width="100%" height="100%" />
          </div>
          <span>Quick Upload</span>
        </Button>
      </PageHeading>
      <div className="flex flex-col gap-6 p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={32} />
          </div>
        ) : stats ? (
          <>
            <InfoBlocks stats={stats} />
            <StorageUsedBar stats={stats} />
            <AnalyticsChart stats={stats} />
            <RecentActivity activities={stats.recentActivity} />
          </>
        ) : (
          <div className="text-center text-text-muted">Failed to load statistics</div>
        )}
      </div>
      
      <UploadMediaModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </section>
  );
};

export default DashboardPage;
