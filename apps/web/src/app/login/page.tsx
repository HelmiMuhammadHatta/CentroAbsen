'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('hr@centroabsen.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Panggil backend login yang sudah kita buat sebelumnya
      const res = await api.post('/auth/login', { email, password });
      
      // Simpan dummy token di cookie (secara aman backend yang harusnya me-set HTTPOnly)
      // Namun untuk memperlancar UI di sisi client, kita set cookie pembantu
      document.cookie = `centroabsen_auth=${res.data.access_token}; path=/; max-age=86400`;
      
      // Arahkan ke root, yang akan otomatis me-redirect ke /absen
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal login. Periksa kembali email dan kata sandi Anda.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          CentroAbsen HRIS
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Satu aplikasi terpadu untuk Karyawan dan Manajemen
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
               <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-md">
                 {error}
               </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Karyawan</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kata Sandi</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Memeriksa...' : 'Masuk'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
