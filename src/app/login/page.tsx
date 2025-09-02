'use client';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';

const schema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().required()
});

type FormData = yup.InferType<typeof schema>;

export default function LoginPage() {
  const { register, handleSubmit } = useForm<FormData>({ resolver: yupResolver(schema) });
  const { login } = useSession();
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    await login(data.email, data.password);
    router.push('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm mx-auto mt-24 space-y-4">
      <input className="w-full border p-2" placeholder="Email" {...register('email')} />
      <input type="password" className="w-full border p-2" placeholder="Password" {...register('password')} />
      <button type="submit" className="w-full bg-blue-600 text-white py-2">Login</button>
    </form>
  );
}
