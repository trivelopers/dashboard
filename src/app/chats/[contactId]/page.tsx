'use client';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import api from '@/lib/api';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function ChatPage() {
  const { user } = useSession();
  const router = useRouter();
  const params = useParams();
  const contactId = params?.contactId as string;
  if (!user) router.push('/login');

  const { data } = useSWR<Message[]>(`/api/v1/chats/?contactId=${contactId}`, fetcher);

  return (
    <div className="space-y-2">
      {data?.map(m => (
        <div key={m.id} className={`p-2 rounded max-w-lg ${m.role === 'user' ? 'bg-green-100 ml-auto' : 'bg-gray-200'}
        `}>
          <div className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleString()}</div>
          <div>{m.content}</div>
        </div>
      ))}
    </div>
  );
}
