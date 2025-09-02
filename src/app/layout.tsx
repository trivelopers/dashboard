import './globals.css';
import React from 'react';
import { SessionProvider } from '@/context/SessionContext';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Chatbot Dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider>
          <Navbar />
          <main className="p-4">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
