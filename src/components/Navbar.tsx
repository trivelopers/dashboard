'use client';
import Link from 'next/link';
import { useSession } from '@/context/SessionContext';

export default function Navbar() {
  const { user, logout } = useSession();

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
      <div className="space-x-4">
        <Link href="/dashboard">Dashboard</Link>
        {user && (user.role === 'ADMIN' || user.role === 'EDITOR') && (
          <>
            <Link href="/prompt">Prompt</Link>
            <Link href="/contacts">Contacts</Link>
          </>
        )}
        {user?.role === 'ADMIN' && <Link href="/users">Users</Link>}
      </div>
      <div className="flex items-center space-x-2">
        {user && <span>{user.email} ({user.role})</span>}
        {user && <button onClick={logout} className="text-red-600">Logout</button>}
      </div>
    </nav>
  );
}
