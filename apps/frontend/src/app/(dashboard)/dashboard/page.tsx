import { Button } from '@/components/Button';
import PageHeading from '@/components/PageHeading';
import AnalyticsChart from '@/features/dashboard/AnalyticsChart';
import InfoBlocks from '@/features/dashboard/InfoBlocks';
import RecentActivity from '@/features/dashboard/RecentActivity';
import StorageUsedBar from '@/features/dashboard/StorageUsedBar';
import { Icon } from '@iconify/react';

const DashboardPage = () => {
  return (
    <section className="dashboard-page">
      <PageHeading title="Dashboard">
        <Button variant="accent" mobileBehavior="icon-only">
          <div className="inline-flex h-5 w-5 items-center justify-center sm:h-4 sm:w-4">
            <Icon icon="lucide:upload" width="100%" height="100%" />
          </div>
          <span>Quick Upload</span>
        </Button>
      </PageHeading>
      <div className="flex flex-col gap-6 p-8 pb-0">
        <InfoBlocks />
        <StorageUsedBar />
        <AnalyticsChart />
        <RecentActivity />
      </div>
    </section>
  );
};

export default DashboardPage;
