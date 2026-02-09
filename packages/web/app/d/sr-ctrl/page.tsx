'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { AdminLogin } from '@/components/AdminLogin';

// Code-split: dashboard only loads after successful authentication
const AdminDashboard = dynamic(
  () => import('@/components/AdminDashboard').then((mod) => mod.AdminDashboard),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 rounded-full border-4 border-solana-purple/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-solana-purple animate-spin"></div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  const handleLogout = () => {
    sessionStorage.removeItem('sr-admin-key');
    setToken(null);
  };

  if (!token) {
    return <AdminLogin onAuthenticated={setToken} />;
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
