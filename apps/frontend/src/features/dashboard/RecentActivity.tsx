import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';

const RecentActivity = () => {
  const mockItems = [
    {
      name: 'hero-banner.png',
      startSize: '2.4 MB',
      endSize: '450 KB',
      time: '2 mins ago',
      status: '200 OK',
      shortStatus: '200 OK',
      image: null,
    },
    {
      name: 'avatar-user.jpg',
      startSize: '850 KB',
      endSize: '120 KB',
      time: '15 mins ago',
      status: '200 OK',
      shortStatus: '200 OK',
      image: null,
    },
    {
      name: 'product-shot.webp',
      startSize: '1.2 MB',
      endSize: 'Error',
      time: '1 hour ago',
      status: '400 Bad Request',
      shortStatus: '400 Error',
      image: null,
    },
    {
      name: 'background-pattern.png',
      startSize: '5.1 MB',
      endSize: '1.1 MB',
      time: '3 hours ago',
      status: '200 OK',
      shortStatus: '200 OK',
      image: null,
    },
    {
      name: 'logo-transparent.png',
      startSize: '300 KB',
      endSize: '85 KB',
      time: '5 hours ago',
      status: '200 OK',
      shortStatus: '200 OK',
      image: null,
    },
  ];

  return (
<section className="border-border bg-card flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border">
      <div className="border-border flex items-center justify-between border-b px-6 py-5">
        <h3 className="text-text-light text-lg font-semibold">
          Recent Activity
        </h3>
        <Button variant="ghost" className="text-accent">
          View All
        </Button>
      </div>
      
      <div className="flex flex-col divide-y divide-border">
        {mockItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-6 py-4 transition-colors duration-200 hover:bg-border/25 hover:text-text-light"
          >
            <div className="flex items-center gap-4">
              <div className="border-border bg-bg rounded-xl border p-2.25">
                <Icon icon="lucide:image" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-text-light text-sm">{item.name}</span>
                <p className="text-text-muted font-mono text-xs">
                  {item.startSize} -&gt; {item.endSize}
                </p>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-6 flex-col sm:flex-row items-end sm:items-center">
              <p className="text-brand text-xs">{item.time}</p>
              <p
                className={`rounded-full px-2.5 py-1 font-mono text-xs hidden sm:block ${
                  item.status.startsWith('200')
                    ? 'bg-success/10 text-success'
                    : 'bg-error/10 text-error'
                }`}
              >
                {item.status}
              </p>
              <p
                className={`rounded-full px-2.5 py-1 font-mono text-xs sm:hidden ${
                  item.status.startsWith('200')
                    ? 'bg-success/10 text-success'
                    : 'bg-error/10 text-error'
                }`}
              >
                {item.shortStatus}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentActivity;
