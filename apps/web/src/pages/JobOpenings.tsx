import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobOpeningService, departmentService, positionService } from '../services/apiService';
import { Plus, Edit2, Trash2, Link as LinkIcon, Check, X, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';

export const JobOpenings = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: jobOpenings, isLoading: loadingJobs } = useQuery({
    queryKey: ['job-openings'],
    queryFn: jobOpeningService.getAll
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAll
  });

  const { data: positions } = useQuery({
    queryKey: ['positions'],
    queryFn: positionService.getAll
  });

  const createMutation = useMutation({
    mutationFn: jobOpeningService.create,
    onSuccess: () => {
      toast.success("Lowongan pekerjaan berhasil ditambahkan!");
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
      setShowModal(false);
      setSelectedJob(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menambahkan lowongan pekerjaan");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => jobOpeningService.update(id, data),
    onSuccess: () => {
      toast.success("Lowongan pekerjaan berhasil diubah!");
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
      setShowModal(false);
      setSelectedJob(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mengubah lowongan pekerjaan");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: jobOpeningService.delete,
    onSuccess: () => {
      toast.success("Lowongan pekerjaan berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menghapus lowongan pekerjaan");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: jobOpeningService.toggleStatus,
    onSuccess: () => {
      toast.success("Status lowongan berhasil diubah!");
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mengubah status lowongan");
    }
  });

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/careers/apply/${id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Link formulir berhasil disalin!"))
      .catch(() => toast.error("Gagal menyalin link"));
  };

  const handleEdit = (job: any) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus lowongan ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      departmentId: formData.get('departmentId'),
      positionId: formData.get('positionId'),
      description: formData.get('description'),
      requirements: formData.get('requirements'),
      isActive: formData.get('isActive') === 'on'
    };

    if (selectedJob) {
      updateMutation.mutate({ id: selectedJob.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredJobs = jobOpenings?.filter((job: any) => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.position?.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Openings</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola lowongan pekerjaan dan bagikan form pendaftaran kandidat.</p>
        </div>
        <button
          onClick={() => {
            setSelectedJob(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Tambah Loker
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Cari lowongan berdasarkan judul, departemen, atau posisi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Posisi / Judul</th>
                <th className="px-6 py-4">Departemen</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingJobs ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p>Memuat data lowongan...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <FileText size={24} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">Tidak ada lowongan ditemukan</p>
                        <p className="text-xs mt-1 text-slate-500">Silakan tambah loker baru atau ubah kata kunci pencarian Anda.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{job.title}</div>
                      <div className="text-xs font-medium text-blue-600 mt-1 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        {job.position?.title || 'Posisi tidak diketahui'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {job.department?.name || 'Departemen tidak diketahui'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStatusMutation.mutate(job.id)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                          job.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        }`}
                        title="Klik untuk mengubah status (Buka/Tutup)"
                      >
                        {job.isActive ? 'Buka (Active)' : 'Tutup (Closed)'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => copyToClipboard(job.id)}
                          className="px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                          title="Salin Link Form Pendaftaran untuk Kandidat"
                        >
                          <LinkIcon size={14} /> Link Form
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1 my-auto"></div>
                        <button
                          onClick={() => handleEdit(job)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Lowongan"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Lowongan"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedJob ? 'Edit Lowongan' : 'Tambah Lowongan Pekerjaan'}
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    {selectedJob ? 'Ubah informasi detail lowongan' : 'Isi form berikut untuk membuka lowongan baru'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5 bg-slate-50/50">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Judul Loker <span className="text-red-500">*</span></label>
                  <input
                    name="title"
                    type="text"
                    required
                    defaultValue={selectedJob?.title}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-shadow"
                    placeholder="Contoh: Senior Frontend Developer"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Departemen <span className="text-red-500">*</span></label>
                    <select
                      name="departmentId"
                      required
                      defaultValue={selectedJob?.departmentId}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-shadow"
                    >
                      <option value="" disabled>Pilih Departemen...</option>
                      {departments?.map((dept: any) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Posisi / Jabatan <span className="text-red-500">*</span></label>
                    <select
                      name="positionId"
                      required
                      defaultValue={selectedJob?.positionId}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm transition-shadow"
                    >
                      <option value="" disabled>Pilih Posisi...</option>
                      {positions?.map((pos: any) => (
                        <option key={pos.id} value={pos.id}>{pos.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Deskripsi Pekerjaan <span className="text-red-500">*</span></label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    defaultValue={selectedJob?.description}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none bg-white shadow-sm transition-shadow"
                    placeholder="Deskripsikan peran, tanggung jawab, dan tentang pekerjaan ini..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Persyaratan (Requirements) <span className="text-red-500">*</span></label>
                  <textarea
                    name="requirements"
                    required
                    rows={4}
                    defaultValue={selectedJob?.requirements}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none bg-white shadow-sm transition-shadow"
                    placeholder="Sebutkan syarat-syarat pendaftaran, kualifikasi, pengalaman, dsb..."
                  ></textarea>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center justify-center w-6 h-6 bg-white border border-slate-300 rounded-md shadow-sm">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      defaultChecked={selectedJob ? selectedJob.isActive : true}
                      className="w-4 h-4 text-blue-600 border-none rounded focus:ring-0 focus:outline-none cursor-pointer"
                    />
                  </div>
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                    Buka Lowongan Sekarang (Tampil di Publik)
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-blue-200"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>Menyimpan...</>
                  ) : (
                    <>
                      <Check size={18} /> Simpan Loker
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
