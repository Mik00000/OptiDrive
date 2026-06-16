"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import PageHeading from '@/components/PageHeading';
import AnalyticsChart from '@/features/dashboard/AnalyticsChart';
import InfoBlocks from '@/features/dashboard/InfoBlocks';
import RecentActivity from '@/features/dashboard/RecentActivity';
import StorageUsedBar from '@/features/dashboard/StorageUsedBar';
import { Icon } from '@iconify/react';
import { UploadMediaModal } from '@/features/media/UploadMediaModal';

const DashboardPage = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
        <InfoBlocks />
        <StorageUsedBar />
        <AnalyticsChart />
        <RecentActivity />
      </div>
      
      <UploadMediaModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </section>
  );
};

export default DashboardPage;
