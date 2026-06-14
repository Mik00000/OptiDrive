import { Button } from '@/components/Button';
import Switch from '@/components/Switch';

export const NotificationsTab = () => {
  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        <div className="border-border border-b px-4 py-4 sm:px-6">
          <span className="text-text-light text-lg font-semibold">
            Notification Preferences
          </span>
          <p className="text-text-muted text-sm mt-1">
            Choose what you want to be notified about.
          </p>
        </div>
        
        <div className="flex flex-col p-4 sm:p-6 gap-6">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-text-light font-medium">Email Notifications</span>
              <span className="text-text-muted text-sm">Receive daily summary emails.</span>
            </div>
            <Switch/>
          </div>

          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-text-light font-medium">Push Notifications</span>
              <span className="text-text-muted text-sm">Get notified instantly in your browser.</span>
            </div>
            <Switch/>
          </div>
        </div>
        
        <div className="bg-bg flex items-center justify-end px-4 py-4 sm:px-6">
          <Button variant="accent" className="w-full sm:w-auto justify-center">Save Preferences</Button>
        </div>
      </div>
    </div>
  );
};
