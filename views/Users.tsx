import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import Spinner from '../components/Spinner';
import GradientSection from '../components/GradientSection';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Fix: Use yup.object({...}) and yup.mixed<Role>() to correctly infer the schema type and match AddUserFormData.
const addUserSchema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Must be a valid email').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  role: yup.mixed<Role>().oneOf(Object.values(Role)).required('Role is required'),
});
// Fix: Simplify AddUserFormData to be directly inferred from the updated schema.
type AddUserFormData = yup.InferType<typeof addUserSchema>;


const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<AddUserFormData>({
    resolver: yupResolver(addUserSchema),
    defaultValues: { role: Role.VIEWER }
  });

  const fetchAndSetUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<{ Users: User[] }>('/dashboard/Users');
      setUsers(data.Users || []);
    } catch (error) {
      console.error('Failed to fetch users', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAndSetUsers();
  }, []);

  const handleAddUser = async (data: AddUserFormData) => {
    if (!currentUser) return;
    setCreationError(null);
    try {
        const newUserPayload = {
            ...data,
            clientId: currentUser.clientId,
            role: data.role.toLowerCase() // Backend expects lowercase role
        };

        await api.post('/auth/register', newUserPayload);

        await fetchAndSetUsers(); // Refresh list with real data
        setIsModalOpen(false);
        reset();
    } catch(error: any) {
        console.error("Failed to create user", error);
        const message = error.response?.data?.message || 'An unexpected error occurred.';
        setCreationError(message);
    }
  };
  
  return (
    <>
      <GradientSection
        title={t('users.title')}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-brand-soft transition hover:bg-brand-primary-hover"
          >
            {t('users.addNewUser')}
          </button>
        }
      >
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Spinner />
            </div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-brand-muted">{t('users.noUsers')}</div>
          ) : (
            <table className="min-w-full divide-y divide-brand-border/80 rounded-2xl bg-white/90 shadow-brand-soft backdrop-blur">
              <thead className="bg-brand-muted text-brand-surface">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('users.fullName')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('users.email')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    {t('users.role')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 bg-white/85">
                {users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-brand-background/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-dark">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-muted">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          user.role === Role.ADMIN
                            ? 'bg-brand-primary text-brand-dark'
                            : user.role === Role.EDITOR
                            ? 'bg-brand-accent text-white'
                            : 'bg-brand-info text-brand-dark'
                        }`}
                      >
                        {user.role === Role.ADMIN
                          ? t('users.admin')
                          : user.role === Role.EDITOR
                          ? t('users.editor')
                          : t('users.viewer')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GradientSection>

      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/70 z-50 flex justify-center items-center backdrop-blur-sm">
          <div className="bg-brand-surface rounded-xl shadow-brand-soft p-8 w-full max-w-md border border-brand-border/60">
            <h2 className="text-2xl font-bold text-brand-dark mb-6">{t('users.addNewUser')}</h2>
            <form onSubmit={handleSubmit(handleAddUser)} className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-brand-dark">{t('users.fullName')}</label>
                  <input type="text" {...register('name')} className={`mt-1 w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-brand-border'} rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary`} />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark">{t('users.email')}</label>
                  <input type="email" {...register('email')} className={`mt-1 w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-brand-border'} rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary`} />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark">{t('users.password')}</label>
                  <input type="password" {...register('password')} className={`mt-1 w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-brand-border'} rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary`} />
                  {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark">{t('users.role')}</label>
                  <select {...register('role')} className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md bg-brand-background focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary">
                      <option value={Role.VIEWER}>{t('users.viewer')}</option>
                      <option value={Role.EDITOR}>{t('users.editor')}</option>
                      <option value={Role.ADMIN}>{t('users.admin')}</option>
                  </select>
              </div>
              {creationError && <p className="text-sm text-brand-warm text-center">{creationError}</p>}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setCreationError(null); reset(); }}
                  className="px-4 py-2 rounded-md border border-brand-border text-brand-dark hover:bg-brand-background transition"
                >
                  {t('users.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover disabled:bg-brand-disabled disabled:text-white/80 transition"
                >
                  {isSubmitting ? t('common.loading') : t('users.createUser')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Users;
