'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle, XCircle } from 'lucide-react';

// Ini adalah contoh layout dua kolom (Master-Detail) untuk Atasan / Keuangan
// Secara nyata datanya akan dimuat via TanStack Query dari /api/v1/approvals/pending

export default function ApprovalDashboard() {
  const [selectedId, setSelectedId] = useState<string | null>('REQ-001');
  
  // Dummy Data
  const queue = [
    { id: 'REQ-001', name: 'Budi Santoso', type: 'Cuti Tahunan', date: '2026-10-01 - 2026-10-03' },
    { id: 'REQ-002', name: 'Siti Aminah', type: 'Reimbursement', date: 'Rp 1.500.000' },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      {/* Kolom Kiri: Antrian (Master) */}
      <div className="w-1/3 min-w-[320px] bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-semibold text-lg text-gray-900">Perlu Diproses</h2>
          <p className="text-sm text-gray-500">{queue.length} antrian menunggu</p>
        </div>
        <div className="divide-y divide-gray-100">
          {queue.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={cn(
                "w-full text-left p-4 hover:bg-blue-50 transition-colors focus:outline-none",
                selectedId === item.id ? "bg-blue-50 border-l-4 border-blue-900" : "border-l-4 border-transparent"
              )}
            >
              <div className="flex justify-between mb-1">
                <span className="font-medium text-gray-900">{item.name}</span>
                <span className="text-xs text-gray-500">{item.id}</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{item.type}</p>
              <p className="text-xs font-semibold text-gray-700">{item.date}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Kolom Kanan: Detail & Aksi (Detail) */}
      <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
        {selectedId ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h1 className="text-2xl font-bold text-gray-900">Pengajuan Cuti Tahunan</h1>
                  <p className="text-gray-500">Oleh Budi Santoso (NIK: 2026001)</p>
               </div>
               <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">MENUNGGU</span>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
               <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Tanggal Mulai - Selesai</p>
                  <p className="font-medium">1 Okt 2026 - 3 Okt 2026</p>
               </div>
               <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Total Hari Kerja</p>
                  <p className="font-medium">3 Hari</p>
               </div>
               <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Alasan</p>
                  <p className="font-medium">Acara keluarga di luar kota</p>
               </div>
            </div>

            <div className="flex items-center p-4 border border-blue-100 bg-blue-50/50 rounded-lg mb-8">
               <FileText className="w-8 h-8 text-blue-600 mr-3" />
               <div className="flex-1">
                 <p className="text-sm font-medium text-gray-900">Lampiran tersedia</p>
                 <button className="text-xs text-blue-700 font-semibold hover:underline">Unduh undangan.pdf (2.4 MB)</button>
               </div>
            </div>

            <div className="border-t border-gray-100 pt-6 flex space-x-4 justify-end">
               <Button variant="destructive" className="px-8"><XCircle className="w-4 h-4 mr-2"/> Tolak</Button>
               <Button className="px-8 bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="w-4 h-4 mr-2"/> Setujui</Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
             <p>Pilih pengajuan di sebelah kiri untuk melihat detail</p>
          </div>
        )}
      </div>
    </div>
  );
}
