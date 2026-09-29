import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { candidateService, jobOpeningService, departmentService, positionService } from '../services/apiService';
import { toast } from 'sonner';
import { 
  Search, 
  Plus, 
  Users, 
  X, 
  ArrowRight, 
  Briefcase, 
  ExternalLink, 
  Copy, 
  Edit3, 
  Trash2, 
  Globe, 
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

export const CandidateList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active Main Tab: 'candidates' | 'jobOpenings'
  const [activeTab, setActiveTab] = useState<'candidates' | 'jobOpenings'>('candidates');

  // Candidate Filters & Modals
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [jobOpeningFilter, setJobOpeningFilter] = useState('');
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [candidateFormData, setCandidateFormData] = useState({ 
    fullName: '', 
    email: '', 
    phone: '', 
    jobOpeningId: '', 
    appliedDepartmentId: '', 
    appliedPositionId: '', 
    education: '',
    workExperience: '',
    notes: '' 
  });

  // Job Opening Modals & Form
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [jobFormData, setJobFormData] = useState({
    title: '',
    departmentId: '',
    positionId: '',
    description: '',
    requirements: '',
    isActive: true
  });

  // Data Queries
  const { data: candidates, isLoading: isCandidatesLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: candidateService.getAll
  });

  const { data: jobOpenings, isLoading: isJobsLoading } = useQuery({
    queryKey: ['jobOpenings'],
    queryFn: jobOpeningService.getAll
  });

  const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: departmentService.getAll });
  const { data: positions } = useQuery({ queryKey: ['positions'], queryFn: positionService.getAll });

  // Mutations for Candidates
  const createCandidateMutation = useMutation({
    mutationFn: candidateService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('Kandidat berhasil ditambahkan');
      setShowAddCandidateModal(false);
      setCandidateFormData({ 
        fullName: '', 
        email: '', 
        phone: '', 
        jobOpeningId: '', 
        appliedDepartmentId: '', 
        appliedPositionId: '', 
        education: '',
        workExperience: '',
        notes: '' 
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambahkan kandidat');
    }
  });

  // Mutations for Job Openings
  const createJobMutation = useMutation({
    mutationFn: (data: any) => jobOpeningService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobOpenings'] });
      toast.success('Lowongan pekerjaan baru berhasil dibuat');
      setShowJobModal(false);
      resetJobForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat lowongan pekerjaan');
    }
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => jobOpeningService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobOpenings'] });
      toast.success('Lowongan pekerjaan berhasil diperbarui');
      setShowJobModal(false);
      resetJobForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui lowongan');
    }
  });

  const toggleJobStatusMutation = useMutation({
    mutationFn: (id: string) => jobOpeningService.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobOpenings'] });
      toast.success('Status lowongan berhasil diubah');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah status lowongan');
    }
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => jobOpeningService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobOpenings'] });
      toast.success('Lowongan pekerjaan berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus lowongan');
    }
  });

  const resetJobForm = () => {
    setEditingJob(null);
    setJobFormData({
      title: '',
      departmentId: '',
      positionId: '',
      description: '',
      requirements: '',
      isActive: true
    });
  };

  const handleOpenEditJob = (job: any) => {
    setEditingJob(job);
    setJobFormData({
      title: job.title,
      departmentId: job.departmentId,
      positionId: job.positionId,
      description: job.description,
      requirements: job.requirements,
      isActive: job.isActive
    });
    setShowJobModal(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin ke clipboard!`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Applied': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'TestAssigned': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'TestCompleted': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Interview': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Passed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Hired': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredCandidates = candidates?.filter((c: any) => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.appliedPositionName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || c.status === statusFilter;
    const matchesSource = sourceFilter === '' || c.source === sourceFilter;
    const matchesJob = jobOpeningFilter === '' || c.jobOpeningId === jobOpeningFilter;

    return matchesSearch && matchesStatus && matchesSource && matchesJob;
  }) || [];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <header className="bg-white px-8 py-6 border-b border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <Users size={26} className="text-blue-600" />
              Recruitment & Career Management
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Kelola proses rekrutmen kandidat, berkas lamaran, dan publikasi lowongan pekerjaan
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/careers"
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <Globe size={15} />
              <span>Buka Portal Karier Publik</span>
              <ExternalLink size={13} />
            </Link>

            {activeTab === 'candidates' ? (
              <button
                onClick={() => setShowAddCandidateModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-xs font-semibold shadow-sm shadow-blue-200 cursor-pointer"
              >
                <Plus size={16} /> Input Kandidat Manual
              </button>
            ) : (
              <button
                onClick={() => {
                  resetJobForm();
                  setShowJobModal(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-xs font-semibold shadow-sm shadow-blue-200 cursor-pointer"
              >
                <Plus size={16} /> Buat Lowongan Baru
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex gap-6 mt-6 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'candidates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={16} />
            <span>Daftar Pelamar / Kandidat</span>
            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
              {candidates?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('jobOpenings')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'jobOpenings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase size={16} />
            <span>Manajemen Lowongan Kerja (Job Openings)</span>
            <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700">
              {jobOpenings?.length || 0}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-slate-50 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* TAB 1: CANDIDATES LIST */}
          {activeTab === 'candidates' && (
            <>
              {/* Filter Bar */}
              <div className="flex flex-col lg:flex-row gap-3 justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Cari kandidat berdasarkan nama, email, atau posisi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-colors"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="">Semua Status</option>
                    <option value="Applied">Applied</option>
                    <option value="TestAssigned">Test Assigned</option>
                    <option value="TestCompleted">Test Completed</option>
                    <option value="Interview">Interview</option>
                    <option value="Passed">Passed</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Hired">Hired</option>
                  </select>

                  {/* Source Filter */}
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="">Semua Sumber</option>
                    <option value="PublicForm">🌐 Public Career Form</option>
                    <option value="ManualHR">👤 Input Manual HR</option>
                  </select>

                  {/* Job Opening Filter */}
                  <select
                    value={jobOpeningFilter}
                    onChange={(e) => setJobOpeningFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer max-w-[200px] truncate"
                  >
                    <option value="">Semua Lowongan</option>
                    {jobOpenings?.map((j: any) => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>

                  {(searchTerm || statusFilter || sourceFilter || jobOpeningFilter) && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('');
                        setSourceFilter('');
                        setJobOpeningFilter('');
                      }}
                      className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Candidates Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="px-6 py-4">Kandidat</th>
                        <th className="px-6 py-4">Posisi & Departemen</th>
                        <th className="px-6 py-4">Sumber</th>
                        <th className="px-6 py-4">Berkas</th>
                        <th className="px-6 py-4">Tanggal Lamar</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isCandidatesLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Memuat data kandidat...</td>
                        </tr>
                      ) : filteredCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Tidak ada kandidat yang sesuai filter.</td>
                        </tr>
                      ) : (
                        filteredCandidates.map((c: any) => (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{c.fullName}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{c.email}</div>
                              {c.phone && <div className="text-[11px] text-slate-400 mt-0.5">{c.phone}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-800">{c.appliedPositionName}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{c.appliedDepartmentName}</div>
                              {c.jobOpeningTitle && (
                                <div className="text-[11px] text-blue-600 font-medium mt-1">
                                  {c.jobOpeningTitle}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                                c.source === 'PublicForm'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {c.source === 'PublicForm' ? '🌐 Public Form' : '👤 Manual HR'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {c.documents && c.documents.length > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                                  <FileText size={12} />
                                  {c.documents.length} Dokumen
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                              {format(new Date(c.createdAt), 'd MMM yyyy')}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full border ${getStatusColor(c.status)}`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => navigate(`/candidates/${c.id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200/60 rounded-xl hover:bg-blue-100 transition-colors"
                              >
                                Detail <ArrowRight size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: JOB OPENINGS MANAGEMENT */}
          {activeTab === 'jobOpenings' && (
            <div className="space-y-6">
              {/* Info banner with public link */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tautan Publik Halaman Karier</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Bagikan tautan berikut ke calon pelamar atau sosial media perusahaan:
                    </p>
                    <code className="inline-block mt-2 px-3 py-1 bg-white rounded-lg text-xs font-mono text-blue-700 border border-blue-200">
                      {window.location.origin}/careers
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/careers`, 'Tautan Halaman Karier')}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Copy size={14} />
                    Salin URL
                  </button>
                  <Link
                    to="/careers"
                    target="_blank"
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink size={14} />
                    Kunjungi
                  </Link>
                </div>
              </div>

              {/* Job Openings Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isJobsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-64" />
                  ))
                ) : jobOpenings?.length === 0 ? (
                  <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <Briefcase size={36} className="text-slate-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800">Belum Ada Lowongan Pekerjaan</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Buat lowongan pekerjaan pertama Anda agar dapat diakses publik.</p>
                    <button
                      onClick={() => {
                        resetJobForm();
                        setShowJobModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                    >
                      + Buat Lowongan Baru
                    </button>
                  </div>
                ) : (
                  jobOpenings?.map((job: any) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden hover:border-slate-300 transition-all"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            job.isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {job.isActive ? '● Aktif (Publik)' : '○ Nonaktif'}
                          </span>

                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {job.applicantCount} Pelamar
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1">{job.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                          <span className="font-medium text-slate-700">{job.departmentName}</span>
                          <span>•</span>
                          <span>{job.positionName}</span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {job.description}
                        </p>
                      </div>

                      {/* Card Actions */}
                      <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => toggleJobStatusMutation.mutate(job.id)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                            job.isActive
                              ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {job.isActive ? 'Tutup Lowongan' : 'Aktifkan'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/careers/apply/${job.id}`, 'Link Pendaftaran Lowongan')}
                            title="Salin Link Pendaftaran Langsung"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEditJob(job)}
                            title="Edit Lowongan"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus lowongan "${job.title}"?`)) {
                                deleteJobMutation.mutate(job.id);
                              }
                            }}
                            title="Hapus Lowongan"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD CANDIDATE MANUAL */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Input Data Kandidat Baru</h2>
                <p className="text-xs text-slate-500">Pencatatan kandidat dari sumber HR internal/manual</p>
              </div>
              <button onClick={() => setShowAddCandidateModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              createCandidateMutation.mutate({
                fullName: candidateFormData.fullName,
                email: candidateFormData.email,
                phone: candidateFormData.phone || null,
                jobOpeningId: candidateFormData.jobOpeningId || null,
                appliedDepartmentId: candidateFormData.appliedDepartmentId,
                appliedPositionId: candidateFormData.appliedPositionId,
                education: candidateFormData.education || null,
                workExperience: candidateFormData.workExperience || null,
                notes: candidateFormData.notes || null
              });
            }} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input required type="text" className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" value={candidateFormData.fullName} onChange={e => setCandidateFormData({ ...candidateFormData, fullName: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input required type="email" className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" value={candidateFormData.email} onChange={e => setCandidateFormData({ ...candidateFormData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon</label>
                  <input type="text" className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" value={candidateFormData.phone} onChange={e => setCandidateFormData({ ...candidateFormData, phone: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Terkait Lowongan Kerja (Opsional)</label>
                <select className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={candidateFormData.jobOpeningId} onChange={e => setCandidateFormData({ ...candidateFormData, jobOpeningId: e.target.value })}>
                  <option value="">-- Tidak Terkait Lowongan Spesifik --</option>
                  {jobOpenings?.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Departemen *</label>
                  <select required className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={candidateFormData.appliedDepartmentId} onChange={e => setCandidateFormData({ ...candidateFormData, appliedDepartmentId: e.target.value })}>
                    <option value="">Pilih Departemen</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Posisi *</label>
                  <select required className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={candidateFormData.appliedPositionId} onChange={e => setCandidateFormData({ ...candidateFormData, appliedPositionId: e.target.value })}>
                    <option value="">Pilih Posisi</option>
                    {positions?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ringkasan Pendidikan</label>
                <input type="text" placeholder="Contoh: S1 Psikologi UNPAD" className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" value={candidateFormData.education} onChange={e => setCandidateFormData({ ...candidateFormData, education: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ringkasan Pengalaman</label>
                <textarea rows={2} placeholder="Contoh: 2 tahun di bidang rekrutmen" className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" value={candidateFormData.workExperience} onChange={e => setCandidateFormData({ ...candidateFormData, workExperience: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan HR (Internal)</label>
                <textarea rows={2} className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" value={candidateFormData.notes} onChange={e => setCandidateFormData({ ...candidateFormData, notes: e.target.value })} />
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddCandidateModal(false)} className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={createCandidateMutation.isPending} className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-200 disabled:opacity-70 transition-colors">
                  {createCandidateMutation.isPending ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT JOB OPENING */}
      {showJobModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingJob ? 'Edit Lowongan Pekerjaan' : 'Buat Lowongan Pekerjaan Baru'}
                </h2>
                <p className="text-xs text-slate-500">Lowongan yang aktif akan tampil pada portal publik /careers</p>
              </div>
              <button onClick={() => setShowJobModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingJob) {
                updateJobMutation.mutate({ id: editingJob.id, data: jobFormData });
              } else {
                createJobMutation.mutate(jobFormData);
              }
            }} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Lowongan *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Contoh: Senior Full-Stack Developer"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none" 
                  value={jobFormData.title} 
                  onChange={e => setJobFormData({ ...jobFormData, title: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Departemen *</label>
                  <select 
                    required 
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={jobFormData.departmentId} 
                    onChange={e => setJobFormData({ ...jobFormData, departmentId: e.target.value })}
                  >
                    <option value="">Pilih Departemen</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Posisi Jabatan *</label>
                  <select 
                    required 
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={jobFormData.positionId} 
                    onChange={e => setJobFormData({ ...jobFormData, positionId: e.target.value })}
                  >
                    <option value="">Pilih Posisi</option>
                    {positions?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Pekerjaan *</label>
                <textarea 
                  required 
                  rows={4} 
                  placeholder="Jelaskan peran, tanggung jawab, dan gambaran umum pekerjaan..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none leading-relaxed" 
                  value={jobFormData.description} 
                  onChange={e => setJobFormData({ ...jobFormData, description: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kualifikasi & Persyaratan *</label>
                <textarea 
                  required 
                  rows={4} 
                  placeholder="- Minimal 2 tahun pengalaman di bidang terkait&#10;- Menguasai..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none leading-relaxed" 
                  value={jobFormData.requirements} 
                  onChange={e => setJobFormData({ ...jobFormData, requirements: e.target.value })} 
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={jobFormData.isActive}
                  onChange={(e) => setJobFormData({ ...jobFormData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Aktifkan Lowongan (Langsung tayang pada portal publik)
                </label>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowJobModal(false)} className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={createJobMutation.isPending || updateJobMutation.isPending} className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-200 disabled:opacity-70 transition-colors">
                  {editingJob ? 'Simpan Perubahan' : 'Publikasikan Lowongan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
