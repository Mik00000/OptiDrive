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
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex flex-1 flex-col w-full min-w-0">
          <Header className="md:hidden" />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
