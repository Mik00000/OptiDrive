import Header from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen xl:h-screen xl:overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col w-full min-w-0 xl:h-full xl:overflow-y-auto">
          <Header className="md:hidden" />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
