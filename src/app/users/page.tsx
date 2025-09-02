'use client';
import useSWR from 'swr';
import api from '@/lib/api';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

const fetcher = (url: string) => api.get(url).then(res => res.data);

const schema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().required(),
  role: yup.mixed<'ADMIN' | 'EDITOR' | 'VIEWER'>().oneOf(['ADMIN','EDITOR','VIEWER']).required()
});

type FormData = yup.InferType<typeof schema>;

export default function UsersPage() {
  const { user } = useSession();
  const router = useRouter();
  if (!user) router.push('/login');
  if (user && user.role !== 'ADMIN') router.push('/dashboard');

  const { data, mutate } = useSWR<User[]>('/api/v1/users/', fetcher);
  const { register, handleSubmit, reset } = useForm<FormData>({ resolver: yupResolver(schema) });

  const onSubmit = async (form: FormData) => {
    await api.post('/api/v1/users/', form);
    reset();
    mutate();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-x-2">
        <input placeholder="Email" className="border p-2" {...register('email')} />
        <input type="password" placeholder="Password" className="border p-2" {...register('password')} />
        <select className="border p-2" {...register('role')}>
          <option value="ADMIN">ADMIN</option>
          <option value="EDITOR">EDITOR</option>
          <option value="VIEWER">VIEWER</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2">Add</button>
      </form>
      <table className="w-full text-left">
        <thead><tr><th>Email</th><th>Role</th></tr></thead>
        <tbody>
          {data?.map(u => (
            <tr key={u.id} className="border-t"><td>{u.email}</td><td>{u.role}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
