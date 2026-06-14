import PageHeading from '@/components/PageHeading';
import { SettingsTabs } from '@/features/settings/components/SettingsTabs';
import { ReactNode } from 'react';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <section className="dashboard-page flex flex-col h-full overflow-hidden">
      <div className="shrink-0">
        <PageHeading title="Settings" />
        <SettingsTabs />
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-0 sm:pt-0 lg:pt-0">
        {children}
      </div>
    </section>
  );
}
