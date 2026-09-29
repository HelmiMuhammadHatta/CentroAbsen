import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dailyReportService, attendanceService } from '../services/apiService';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { FileText, Plus, X, Search, Edit2, Trash2, CheckCircle, MessageSquare, Clock } from 'lucide-react';

export const DailyReportList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [reviewingReport, setReviewingReport] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    reportDate: new Date().toLocaleDateString('en-CA'),
    tasksCompleted: '',
    blockers: ''
  });
  
  const [dateWarning, setDateWarning] = useState('');
  
  const [reviewData, setReviewData] = useState({
    managerFeedback: ''
  });

  const [dateFilter, setDateFilter] = useState('');
  
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['daily-reports', dateFilter],
    queryFn: () => {
      const params: any = { page: 1, pageSize: 50 };
      if (dateFilter) {
        params.startDate = dateFilter;
        params.endDate = dateFilter;
      }
      return dailyReportService.getAll(params);
    }
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance', 'today', user?.employeeId],
    queryFn: async () => {
      const res = await attendanceService.getAttendances({ page: 1, pageSize: 10, employeeId: user?.employeeId });
      const today = new Date().toLocaleDateString();
      return res.data?.data?.find((a: any) => new Date(a.clockIn).toLocaleDateString() === today);
    }
  });

  const checkEligibility = async (dateStr: string) => {
    if (!dateStr) {
      setDateWarning('');
      return;
    }
    try {
      const attRes = await attendanceService.getAttendances({ page: 1, pageSize: 50, employeeId: user?.employeeId });
      const attendances = attRes.data || [];
      const hasClockedIn = attendances.some((a: any) => {
        const localDate = new Date(a.clockIn).toLocaleDateString('en-CA');
        return localDate === dateStr;
      });

      if (!hasClockedIn) {
        setDateWarning('Anda belum melakukan clock-in pada tanggal ini.');
        return;
      }

      const repRes = await dailyReportService.getAll({ page: 1, pageSize: 50 });
      const reports = repRes.data || [];
      const existingReport = reports.find((r: any) => {
        const rDate = r.reportDate.split('T')[0];
        return rDate === dateStr && (r.employeeId === user?.employeeId || r.employeeName === user?.fullName);
      });

      if (existingReport && (!editingReport || existingReport.id !== editingReport.id)) {
        setDateWarning('Anda sudah membuat laporan harian untuk tanggal ini.');
        return;
      }
      setDateWarning('');
    } catch (e) {
      console.error('Error checking eligibility', e);
    }
  };

  useEffect(() => {
    if (isModalOpen && formData.reportDate && !isManagerOrAdmin) {
      checkEligibility(formData.reportDate);
    }
  }, [formData.reportDate, isModalOpen, isManagerOrAdmin, editingReport]);

  const createMutation = useMutation({
    mutationFn: (data: any) => dailyReportService.create(data),
    onSuccess: () => {
      toast.success('Laporan harian berhasil dikirim');
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Gagal mengirim laporan')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => dailyReportService.update(id, data),
    onSuccess: () => {
      toast.success('Laporan harian berhasil diperbarui');
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Gagal memperbarui laporan')
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => dailyReportService.review(id, data),
    onSuccess: () => {
      toast.success('Feedback berhasil diberikan');
      setIsReviewModalOpen(false);
      setReviewData({ managerFeedback: '' });
      setReviewingReport(null);
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Gagal memberikan feedback')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dailyReportService.delete(id),
    onSuccess: () => {
      toast.success('Laporan berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Gagal menghapus laporan')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tasksCompleted.trim()) {
      toast.error('Tasks completed tidak boleh kosong');
      return;
    }

    if (editingReport) {
      updateMutation.mutate({
        id: editingReport.id,
        data: {
          ...formData,
          reportDate: new Date(formData.reportDate).toISOString()
        }
      });
    } else {
      createMutation.mutate({
        reportDate: new Date(formData.reportDate).toISOString(),
        tasksCompleted: formData.tasksCompleted,
        blockers: formData.blockers
      });
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewData.managerFeedback.trim()) {
      toast.error('Feedback tidak boleh kosong');
      return;
    }

    reviewMutation.mutate({
      id: reviewingReport.id,
      data: reviewData
    });
  };

  const resetForm = () => {
    setFormData({ reportDate: new Date().toLocaleDateString('en-CA'), tasksCompleted: '', blockers: '' });
    setEditingReport(null);
    setDateWarning('');
  };

  const openCreateModal = () => {
    if (!todayAttendance) {
      toast.error('Anda belum melakukan clock-in hari ini.');
      return;
    }
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (report: any) => {
    setEditingReport(report);
    setFormData({
      reportDate: new Date(report.reportDate).toLocaleDateString('en-CA'),
      tasksCompleted: report.tasksCompleted,
      blockers: report.blockers || ''
    });
    setIsModalOpen(true);
  };

  const openReviewModal = (report: any) => {
    setReviewingReport(report);
    setReviewData({
      managerFeedback: report.managerFeedback || ''
    });
    setIsReviewModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Daily Reports
          </h1>
          <p className="text-slate-500 mt-1">Kelola laporan pekerjaan harian Anda</p>
        </div>
        {!isManagerOrAdmin && (
          <button 
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            disabled={!todayAttendance}
          >
            <Plus size={20} />
            Buat Laporan Hari Ini
          </button>
        )}
      </div>

      {!todayAttendance && !isManagerOrAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
          <MessageSquare className="text-yellow-600" size={20} />
          <p className="font-medium text-sm">Anda belum melakukan clock-in hari ini. Laporan harian hanya bisa dibuat jika sudah clock-in.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="relative w-64">
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-500 text-sm border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Tanggal</th>
                {isManagerOrAdmin && <th className="px-6 py-4 font-semibold">Karyawan</th>}
                <th className="px-6 py-4 font-semibold">Tugas Selesai</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Feedback</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-red-500">Gagal memuat data laporan harian.</td>
                </tr>
              ) : (!data?.data || data.data.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Belum ada laporan harian.</td>
                </tr>
              ) : (
                data.data.map((report: any) => (
                  <tr key={report.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {new Date(report.reportDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </td>
                    {isManagerOrAdmin && (
                      <td className="px-6 py-4 text-slate-600">
                        {report.employeeName}
                      </td>
                    )}
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={report.tasksCompleted}>
                      {report.tasksCompleted}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        report.status === 'Submitted' 
                          ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' 
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {report.status === 'Submitted' ? <Clock size={14} /> : <CheckCircle size={14} />}
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {report.managerFeedback || <span className="text-slate-400 italic">Belum ada</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isManagerOrAdmin ? (
                          <button 
                            onClick={() => openReviewModal(report)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Beri Feedback"
                          >
                            <MessageSquare size={16} />
                          </button>
                        ) : (
                          report.status === 'Submitted' && (
                            <>
                              <button 
                                onClick={() => openEditModal(report)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(report.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Hapus"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingReport ? 'Edit Laporan Harian' : 'Buat Laporan Harian'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tanggal Laporan <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    max={new Date().toLocaleDateString('en-CA')}
                    value={formData.reportDate}
                    onChange={(e) => setFormData({...formData, reportDate: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    required
                  />
                  {dateWarning && <p className="text-xs text-yellow-600 mt-1 font-medium">{dateWarning}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Pekerjaan yang Diselesaikan Hari Ini <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    value={formData.tasksCompleted}
                    onChange={(e) => setFormData({...formData, tasksCompleted: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm min-h-[120px]"
                    placeholder="Deskripsikan tugas-tugas yang berhasil diselesaikan..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kendala (Blockers) <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <textarea 
                    value={formData.blockers}
                    onChange={(e) => setFormData({...formData, blockers: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm min-h-[80px]"
                    placeholder="Apakah ada kendala dalam menyelesaikan pekerjaan hari ini?"
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending || !!dateWarning}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Menyimpan...' : 'Simpan Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal for Manager */}
      {isReviewModalOpen && reviewingReport && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                Review Laporan {reviewingReport.employeeName}
              </h2>
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReviewSubmit} className="p-6">
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tugas Selesai</h4>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewingReport.tasksCompleted}</p>
                  
                  {reviewingReport.blockers && (
                    <>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2">Kendala</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{reviewingReport.blockers}</p>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 mt-2">
                    Feedback Manager <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    value={reviewData.managerFeedback}
                    onChange={(e) => setReviewData({...reviewData, managerFeedback: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm min-h-[100px]"
                    placeholder="Berikan feedback atau catatan atas laporan ini..."
                    required
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {reviewMutation.isPending ? 'Menyimpan...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
