'use client';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import useSWR from 'swr';
import api from '@/lib/api';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';

const schema = yup.object({
  prompt: yup.string().required()
});

type FormData = yup.InferType<typeof schema>;

export default function PromptPage() {
  const { user } = useSession();
  const router = useRouter();
  if (user && user.role === 'VIEWER') router.push('/dashboard');
  if (!user) router.push('/login');

  const { data, mutate } = useSWR('/api/v1/botsettings/', (url) => api.get(url).then(r => r.data));
  const { register, handleSubmit, reset } = useForm<FormData>({ resolver: yupResolver(schema), defaultValues: { prompt: data?.promptSystem } });

  const onSubmit = async (form: FormData) => {
    await api.patch('/api/v1/botsettings/', { promptSystem: form.prompt });
    mutate();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <textarea className="w-full border p-2" rows={8} {...register('prompt')} />
      <button type="submit" className="bg-green-600 text-white px-4 py-2">Save</button>
    </form>
  );
}
