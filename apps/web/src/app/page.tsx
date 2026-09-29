'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">CentroAbsen</h1>
        <p className="text-gray-500">Pilih modul antarmuka yang ingin Anda tinjau:</p>
        
        <div className="flex flex-col space-y-4">
          <Link 
            href="/absen" 
            className="block p-4 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-medium"
          >
            📱 UI Absensi Kamera (Karyawan)
          </Link>

          <Link 
            href="/approval" 
            className="block p-4 bg-white text-blue-900 border-2 border-blue-900 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            💻 UI Approval Panel (Atasan/Keuangan)
          </Link>
        </div>
        
        <p className="text-xs text-gray-400 mt-8">
          *Backend API dan DB MariaDB tidak terhubung karena Docker tidak menyala di local device Anda saat ini. Layar ini hanya memuat komponen statis antarmuka Next.js.
        </p>
      </div>
    </div>
  );
}
