'use client';
import useSWR from 'swr';
import api from '@/lib/api';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  requireAdmin: boolean;
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function ContactsPage() {
  const { user } = useSession();
  const router = useRouter();
  if (!user) router.push('/login');

  const { data, mutate } = useSWR<Contact[]>('/api/v1/contacts/', fetcher);

  const toggle = async (contact: Contact) => {
    await api.patch(`/api/v1/contacts/${contact.id}/`, { requireAdmin: !contact.requireAdmin });
    mutate();
  };

  return (
    <table className="w-full text-left">
      <thead>
        <tr><th>Name</th><th>Phone</th><th>Require Admin</th></tr>
      </thead>
      <tbody>
        {data?.map(c => (
          <tr key={c.id} className="border-t">
            <td>{c.name}</td>
            <td>{c.phoneNumber}</td>
            <td>
              {user && user.role !== 'VIEWER' ? (
                <button onClick={() => toggle(c)} className="text-blue-600">
                  {c.requireAdmin ? 'Deactivate' : 'Activate'}
                </button>
              ) : (
                c.requireAdmin ? 'Yes' : 'No'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
