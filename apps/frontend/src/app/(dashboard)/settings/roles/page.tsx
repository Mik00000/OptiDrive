import { Metadata } from 'next';
import { RolesTab } from '@/features/settings/components/RolesTab';

export const metadata: Metadata = {
  title: 'Roles & Permissions - OptiDrive',
  description: 'Manage custom roles and permissions for your workspace.',
};

export default function RolesPage() {
  return <RolesTab />;
}
