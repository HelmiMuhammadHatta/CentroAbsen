import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { publicService } from '../services/apiService';
import { 
  Briefcase, 
  Building2, 
  Search, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  X, 
  ShieldCheck, 
  Award
} from 'lucide-react';

interface PublicJobOpening {
  id: string;
  title: string;
  departmentId: string;
  departmentName: string;
  positionId: string;
  positionName: string;
  description: string;
  requirements: string;
  createdAt: string;
}

export const Careers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedJobForModal, setSelectedJobForModal] = useState<PublicJobOpening | null>(null);

  const { data: jobOpenings = [], isLoading, isError } = useQuery<PublicJobOpening[]>({
    queryKey: ['publicJobOpenings'],
    queryFn: () => publicService.getJobOpenings()
  });

  // Extract unique departments
  const departments = ['ALL', ...Array.from(new Set(jobOpenings.map(j => j.departmentName).filter(Boolean)))];

  const filteredJobs = jobOpenings.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requirements.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = selectedDepartment === 'ALL' || job.departmentName === selectedDepartment;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Public Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <span className="text-white font-black text-xl">E</span>
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">CentroAbsen</span>
              <span className="text-[11px] font-medium text-blue-600 uppercase tracking-wider block">Career Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Login Karyawan
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-[#EEF2F7] border-b border-slate-200 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles size={14} className="text-blue-600" />
            <span>Peluang Karier Terbuka — Bergabunglah Bersama Kami</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Bangun Masa Depan Karier Anda <br className="hidden sm:inline" />
            <span className="text-blue-600">di Lingkungan Profesional & Inovatif</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Kami membuka kesempatan bagi talenta terbaik untuk berkembang, berinovasi, dan memberikan dampak nyata bersama ekosistem CentroAbsen.
          </p>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari posisi atau keahlian (contoh: Developer, HR)..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="sm:w-56">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900 font-medium cursor-pointer"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === 'ALL' ? 'Semua Departemen' : dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Main Job List Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Lowongan Tersedia</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {filteredJobs.length} posisi yang sedang membuka pendaftaran
            </p>
          </div>

          {(searchTerm || selectedDepartment !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('ALL');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-pulse">
                <div className="h-6 bg-slate-200 rounded-md w-3/4 mb-3" />
                <div className="h-4 bg-slate-100 rounded-md w-1/2 mb-6" />
                <div className="space-y-2 mb-6">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                </div>
                <div className="h-10 bg-slate-100 rounded-xl w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="bg-white rounded-2xl p-10 text-center border border-red-200 shadow-sm max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <X size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Gagal Memuat Lowongan</h3>
            <p className="text-xs text-slate-600 mb-4">Terjadi kendala saat mengambil data lowongan pekerjaan.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
            >
              Muat Ulang
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredJobs.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Briefcase size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Belum Ada Lowongan yang Cocok</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Tidak ditemukan posisi dengan kata kunci atau filter departemen yang Anda pilih. Silakan coba kata kunci lain.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('ALL');
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Tampilkan Semua Lowongan
            </button>
          </div>
        )}

        {/* Job Cards Grid */}
        {!isLoading && !isError && filteredJobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      <Building2 size={12} />
                      {job.departmentName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                      {job.positionName}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
                    {job.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                    {job.description}
                  </p>

                  {/* Requirements Snippet */}
                  {job.requirements && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        Kualifikasi Utama:
                      </p>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {job.requirements.split('\n')[0] || job.requirements}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Bottom */}
                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(job.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedJobForModal(job)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                    >
                      Detail
                    </button>
                    <Link
                      to={`/careers/apply/${job.id}`}
                      className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
                    >
                      Lamar
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Company Value Banner */}
        <div className="mt-16 bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Proses Transparan & Adil</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seleksi berbasis kompetensi terstandar dengan asesmen objektif tanpa biaya apapun.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Pengembangan Karier</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Jalur karier terstruktur, pelatihan berkala, dan ruang eksplorasi inovasi profesional.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">Kultur Kerja Kolaboratif</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Lingkungan kerja yang suportif, dinamis, dan menjunjung tinggi integritas bersama.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedJobForModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedJobForModal(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700">
                    {selectedJobForModal.departmentName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                    {selectedJobForModal.positionName}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedJobForModal.title}</h3>
              </div>

              <button
                onClick={() => setSelectedJobForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deskripsi Pekerjaan</h4>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedJobForModal.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kualifikasi & Persyaratan</h4>
                <div className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedJobForModal.requirements}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedJobForModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl"
              >
                Tutup
              </button>
              <Link
                to={`/careers/apply/${selectedJobForModal.id}`}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
              >
                Lamar Posisi Ini
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xs">E</div>
            <span>© {new Date().getFullYear()} CentroAbsen. Seluruh hak cipta dilindungi.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Rekrutmen Bebas Biaya</span>
            <span>Kebijakan Privasi Data Pelamar</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
