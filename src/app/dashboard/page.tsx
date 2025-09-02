'use client';
import useSWR from 'swr';
import api from '@/lib/api';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';

interface DashboardData {
  clientName: string;
  updatedAt: string;
  contactsCount: number;
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function DashboardPage() {
  const { user } = useSession();
  const router = useRouter();
  if (!user) {
    router.push('/login');
  }

  const { data } = useSWR<DashboardData>('/api/v1/botsettings/', fetcher);

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {data && (
        <ul className="mt-4 space-y-2">
          <li>Client: {data.clientName}</li>
          <li>Last update: {data.updatedAt}</li>
          <li>Contacts: {data.contactsCount}</li>
        </ul>
      )}
    </div>
  );
}
