import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import Spinner from '../components/Spinner';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// MOCK SERVICE for fetching users.
// TODO: Replace with a real API call once the backend endpoint is available.
let mockTeamUsers: User[] = [
    { id: '1', email: 'admin@example.com', name: 'Admin (mock)', role: Role.ADMIN, clientId: 'awesome-inc-client-id' },
    { id: '2', email: 'editor@example.com', name: 'Editor User', role: Role.EDITOR, clientId: 'awesome-inc-client-id' },
    { id: '3', email: 'viewer@example.com', name: 'Viewer User', role: Role.VIEWER, clientId: 'awesome-inc-client-id' },
];

const fetchUsers = (): Promise<User[]> => {
    return new Promise(resolve => setTimeout(() => resolve([...mockTeamUsers]), 500));
};

// This mock function is updated to reflect the creation and is used by the fetch mock
const addUserToMock = (user: User) => {
    mockTeamUsers.push(user);
}

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
    const data = await fetchUsers();
    setUsers(data);
    setIsLoading(false);
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

        const response = await api.post('/auth/register', newUserPayload);
        
        // Update mock data for immediate UI feedback
        const createdUser = response.data.user;
        addUserToMock({
            id: createdUser.id,
            email: createdUser.email,
            name: createdUser.name,
            role: data.role, // Use the uppercase role for frontend consistency
            clientId: createdUser.clientId,
        });

        await fetchAndSetUsers(); // Refetch users from mock service
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
      <div className="bg-brand-surface p-8 rounded-xl shadow-brand-soft border border-brand-border/60">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-brand-dark">{t('users.title')}</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-brand-primary text-white font-semibold rounded-md shadow-brand-soft hover:bg-brand-primary-hover transition"
          >
            {t('users.addNewUser')}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <Spinner />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-brand-muted py-10">
              {t('users.noUsers')}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-brand-border">
              <thead className="bg-brand-background">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">{t('users.fullName')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">{t('users.email')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">{t('users.role')}</th>
                </tr>
              </thead>
              <tbody className="bg-brand-surface divide-y divide-brand-border/70">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-dark">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-muted">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                           user.role === Role.ADMIN ? 'bg-brand-primary text-brand-dark' :
                           user.role === Role.EDITOR ? 'bg-brand-accent text-white' : 'bg-brand-info text-brand-dark'
                       }`}>
                           {user.role === Role.ADMIN ? t('users.admin') : 
                            user.role === Role.EDITOR ? t('users.editor') : t('users.viewer')}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
