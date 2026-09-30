import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService, financeService, employeeService, approvalService } from '../services/apiService';
import { useAuth } from '../hooks/useAuth';
import { UI_MESSAGES } from '@centroabsen/shared';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUpload } from '@/components/ui/file-upload';
import { Plus, Inbox, FileText, Calendar as CalendarIcon, Trash2, Check, X, Printer, MessageCircle } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { formatRupiah } from '@/lib/formatters';

export const LeaveRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [mainTab, setMainTab] = useState<'my_requests' | 'approval_queue'>('my_requests');
  const [activeTab, setActiveTab] = useState<'cuti' | 'keuangan'>('cuti');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState<{ [key: string]: string }>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Leave Form State
  const [leaveType, setLeaveType] = useState('');
  const [leaveStart, setLeaveStart] = useState<Date>();
  const [leaveEnd, setLeaveEnd] = useState<Date>();
  const [leaveReason, setLeaveReason] = useState('');

  // Finance Form State
  const [financeType, setFinanceType] = useState('Reimbursement');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeDescription, setFinanceDescription] = useState('');
  const [financeFiles, setFinanceFiles] = useState<FileList | null>(null);
  const [financeApproverIds, setFinanceApproverIds] = useState<string[]>(['']);

  // Additional Leave State
  const [leaveApproverIds, setLeaveApproverIds] = useState<string[]>(['']);
  const [leaveFiles, setLeaveFiles] = useState<FileList | null>(null);

  // Queries
  const { data: leaveTypesData } = useQuery({
    queryKey: ['leave-types', user?.employeeId],
    queryFn: () => leaveService.getTypes(user?.employeeId)
  });

  const { data: leaves } = useQuery({
    queryKey: ['leaves', 'my_requests'],
    queryFn: () => leaveService.getRequests()
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll()
  });

  const { data: finances } = useQuery({
    queryKey: ['finances', 'my_requests'],
    queryFn: () => financeService.getRequests()
  });

  const { data: approvalQueueData } = useQuery({
    queryKey: ['approval-queue'],
    queryFn: () => approvalService.getQueue()
  });

  const leaveList = Array.isArray(leaves?.data) ? leaves.data : (Array.isArray(leaves?.data?.data) ? leaves.data.data : []);
  const financeList = Array.isArray(finances?.data) ? finances.data : (Array.isArray(finances?.data?.data) ? finances.data.data : []);
  const employeeList = Array.isArray(employeesData) ? employeesData : (Array.isArray(employeesData?.data) ? employeesData.data : (Array.isArray(employeesData?.data?.data) ? employeesData.data.data : []));
  const approvalQueue = Array.isArray(approvalQueueData?.data) ? approvalQueueData.data : [];

  // Mutations
  const createLeaveMutation = useMutation({
    mutationFn: leaveService.create,
    onSuccess: () => {
      toast({ title: UI_MESSAGES.TOAST_SUCCESS_TITLE, description: UI_MESSAGES.LEAVE_SUBMIT_SUCCESS });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setIsDrawerOpen(false);
      setLeaveType('');
      setLeaveStart(undefined);
      setLeaveEnd(undefined);
      setLeaveReason('');
      setLeaveApproverIds(['']);
      setLeaveFiles(null);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.response?.data?.message || err.response?.data?.error || err.response?.data?.errors?.[0] || "Gagal membuat pengajuan cuti", variant: "destructive" });
    }
  });

  const createFinanceMutation = useMutation({
    mutationFn: financeService.create,
    onSuccess: () => {
      toast({ title: UI_MESSAGES.TOAST_SUCCESS_TITLE, description: UI_MESSAGES.FINANCE_SUBMIT_SUCCESS });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      setIsDrawerOpen(false);
      setFinanceType('Reimbursement');
      setFinanceAmount('');
      setFinanceDescription('');
      setFinanceFiles(null);
      setFinanceApproverIds(['']);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.response?.data?.message || err.response?.data?.error || err.response?.data?.errors?.[0] || "Gagal membuat pengajuan keuangan", variant: "destructive" });
    }
  });

  const actApprovalMutation = useMutation({
    mutationFn: approvalService.act,
    onSuccess: () => {
      toast({ title: UI_MESSAGES.TOAST_SUCCESS_TITLE, description: UI_MESSAGES.APPROVAL_SUCCESS });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      setRejectingId(null);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.response?.data?.error || err.response?.data?.message || "Gagal memproses persetujuan", variant: "destructive" });
    }
  });

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      toast({ title: "Gagal", description: "Pilih tanggal mulai dan selesai", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append('leaveTypeId', leaveType);
    formData.append('startDate', leaveStart.toISOString());
    formData.append('endDate', leaveEnd.toISOString());
    formData.append('reason', leaveReason);
    leaveApproverIds.forEach(id => {
      if (id) formData.append('approverIds', id);
    });
    
    if (leaveFiles) {
      Array.from(leaveFiles).forEach(file => {
        formData.append('attachments', file);
      });
    }
    createLeaveMutation.mutate(formData);
  };

  const handleAmountChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      setFinanceAmount('');
      return;
    }
    const formatted = new Intl.NumberFormat('id-ID').format(Number(digits));
    setFinanceAmount(formatted);
  };

  const handleFinanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = financeAmount.replace(/\D/g, '');
    if (!cleanAmount || Number(cleanAmount) <= 0) {
      toast({ title: "Gagal", description: "Masukkan nominal yang valid", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append('kind', financeType);
    formData.append('category', financeType);
    formData.append('amountIdr', cleanAmount);
    formData.append('description', financeDescription);
    financeApproverIds.forEach(id => {
      if (id) formData.append('approverIds', id);
    });
    if (financeFiles) {
      Array.from(financeFiles).forEach(file => {
        formData.append('attachments', file);
      });
    }
    createFinanceMutation.mutate(formData);
  };

  const handleApprove = (step: any) => {
    actApprovalMutation.mutate({
      requestType: step.request_type,
      requestId: step.request_id,
      action: 'Approve'
    });
  };

  const handleReject = (step: any) => {
    const note = rejectNote[step.id];
    if (!note || note.trim().length < 5) {
      toast({ title: "Gagal", description: "Alasan penolakan minimal 5 karakter", variant: "destructive" });
      return;
    }
    actApprovalMutation.mutate({
      requestType: step.request_type,
      requestId: step.request_id,
      action: 'Reject',
      note
    });
  };

  const handlePrintFinancePdf = (req: any) => {
    const amountVal = Number(req.amount_idr ?? req.amount ?? 0);
    const createdDate = req.created_at || req.createdAt;
    const formattedDate = createdDate ? new Date(createdDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
    const requesterName = req.user?.full_name || user?.fullName || 'Karyawan';
    const requesterNik = req.user?.nik || user?.nik || '-';
    const kindStr = req.kind || req.category || 'Reimbursement';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bukti Persetujuan Keuangan - ${req.id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
          .header h1 { margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
          .header p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
          .status-badge { display: inline-block; background: #10b981; color: white; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 10px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .info-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .info-table td.label { font-weight: 600; color: #475569; width: 35%; background: #f8fafc; }
          .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 25px; }
          .amount-box .val { font-size: 26px; font-weight: bold; color: #15803d; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
          .sig-box { width: 45%; }
          .sig-space { height: 70px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CentroAbsen HRIS</h1>
          <p>SURAT BUKTI PERSETUJUAN PENGAJUAN KEUANGAN</p>
          <div class="status-badge">✓ TELAH DISETUJUI & SIAP DICAIRKAN</div>
        </div>

        <div class="amount-box">
          <div style="font-size: 12px; color: #166534; font-weight: 600;">TOTAL NOMINAL PENGAJUAN</div>
          <div class="val">Rp ${new Intl.NumberFormat('id-ID').format(amountVal)}</div>
        </div>

        <table class="info-table">
          <tr><td class="label">ID Pengajuan</td><td><strong>${req.id}</strong></td></tr>
          <tr><td class="label">Nama Pemohon</td><td>${requesterName} (${requesterNik})</td></tr>
          <tr><td class="label">Jenis Pengajuan</td><td>${kindStr}</td></tr>
          <tr><td class="label">Tanggal Pengajuan</td><td>${formattedDate}</td></tr>
          <tr><td class="label">Keterangan / Keperluan</td><td>${req.description || '-'}</td></tr>
          <tr><td class="label">Status Akhir</td><td><strong style="color:#10b981;">Disetujui (Approved & Siap Dicaikan)</strong></td></tr>
        </table>

        <h3 style="font-size:14px; margin-top:20px; margin-bottom:10px; color:#0f172a; border-bottom:1px solid #cbd5e1; padding-bottom:5px;">RIWAYAT PERSETUJUAN ATASAN (APPROVAL PROOF)</h3>
        <table class="info-table">
          <thead>
            <tr style="background:#f1f5f9; text-align:left;">
              <td style="font-weight:600; padding:8px;">Langkah</td>
              <td style="font-weight:600; padding:8px;">Atasan / Penyetuju</td>
              <td style="font-weight:600; padding:8px;">Status</td>
              <td style="font-weight:600; padding:8px;">Waktu Persetujuan</td>
            </tr>
          </thead>
          <tbody>
            ${(req.approval_steps && req.approval_steps.length > 0) ? req.approval_steps.map((step: any) => `
              <tr>
                <td>Langkah ${step.step_order} (${step.role_required || 'Approver'})</td>
                <td><strong>${step.actor?.full_name || step.assignee?.full_name || 'Atasan Direct'}</strong></td>
                <td><span style="color:${step.status === 'Approved' ? '#10b981' : (step.status === 'Skipped' ? '#64748b' : '#f59e0b')}; font-weight:600;">${step.status === 'Approved' ? '✓ Disetujui' : (step.status === 'Skipped' ? 'Dilewati (CEO/N/A)' : 'Menunggu')}</span></td>
                <td>${step.acted_at ? new Date(step.acted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="text-align:center; color:#64748b;">Disetujui langsung oleh manajemen/sistem</td>
              </tr>
            `}
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-box">
            <p>Pemohon,</p>
            <div class="sig-space"></div>
            <p><strong>${requesterName}</strong></p>
          </div>
          <div class="sig-box">
            <p>Disetujui Oleh (Keuangan/Atasan),</p>
            <div class="sig-space"></div>
            <p><strong>Tim Keuangan & Manajemen</strong></p>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Dicairkan':
        return <Badge className="bg-emerald-500/10 text-emerald-600 font-semibold border-none">Disetujui & Dicairkan</Badge>;
      case 'MenungguPencairan':
        return <Badge className="bg-blue-500/10 text-blue-600 font-semibold border-none">Disetujui Atasan (Proses Pencairan)</Badge>;
      case 'MenungguCEO':
        return <Badge className="bg-amber-500/10 text-amber-600 font-semibold border-none">Menunggu ACC CEO</Badge>;
      case 'Rejected':
      case 'Ditolak':
        return <Badge className="bg-rose-500/10 text-rose-600 font-semibold border-none">Ditolak</Badge>;
      case 'Pending':
      case 'Diajukan':
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 font-semibold border-none">Menunggu Atasan</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pengajuan & Persetujuan</h1>
          <p className="text-muted-foreground">Kelola cuti, keuangan, dan persetujuan tim Anda.</p>
        </div>
        
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <Plus className="h-6 w-6" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>Buat Pengajuan Baru</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 overflow-y-auto">
              <Tabs defaultValue={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="cuti">Cuti</TabsTrigger>
                  <TabsTrigger value="keuangan">Keuangan</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cuti">
                  <form onSubmit={handleLeaveSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Jenis Cuti</label>
                      <Select value={leaveType} onValueChange={setLeaveType} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis cuti" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypesData?.data?.map((type: any) => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tanggal Mulai</label>
                        <DatePicker date={leaveStart} setDate={setLeaveStart} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tanggal Selesai</label>
                        <DatePicker date={leaveEnd} setDate={setLeaveEnd} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alasan / Keterangan</label>
                      <Input value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Tulis alasan cuti..." required minLength={10} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pilih Atasan (Approver)</label>
                      {leaveApproverIds.map((id, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Select value={id} onValueChange={(val) => {
                            const newIds = [...leaveApproverIds];
                            newIds[index] = val;
                            setLeaveApproverIds(newIds);
                          }}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Pilih atasan untuk approval" />
                            </SelectTrigger>
                            <SelectContent>
                              {employeeList?.map((emp: any) => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.full_name || emp.id}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {leaveApproverIds.length > 1 && (
                            <Button type="button" variant="outline" size="icon" onClick={() => setLeaveApproverIds(leaveApproverIds.filter((_, i) => i !== index))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" className="w-full mt-2" onClick={() => setLeaveApproverIds([...leaveApproverIds, ''])}>
                        + Tambah Atasan
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lampiran Bukti (Sakit / Opsional)</label>
                      <FileUpload accept="image/*,.pdf" multiple onFilesChange={setLeaveFiles} />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={createLeaveMutation.isPending}>
                      {createLeaveMutation.isPending ? "Menyimpan..." : "Ajukan Cuti"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="keuangan">
                  <form onSubmit={handleFinanceSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Jenis Pengajuan</label>
                      <Select value={financeType} onValueChange={setFinanceType} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Reimbursement">Reimbursement</SelectItem>
                          <SelectItem value="Purchase">Purchase (Pembelian)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Jumlah (Rp)</label>
                      <Input type="text" value={financeAmount} onChange={e => handleAmountChange(e.target.value)} placeholder="Misal: 500.000" required />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Keterangan</label>
                      <Input value={financeDescription} onChange={e => setFinanceDescription(e.target.value)} placeholder="Tulis keperluan (minimal 10 huruf)..." required minLength={10} />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pilih Atasan (Approver)</label>
                      {financeApproverIds.map((id, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Select value={id} onValueChange={(val) => {
                            const newIds = [...financeApproverIds];
                            newIds[index] = val;
                            setFinanceApproverIds(newIds);
                          }}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Pilih atasan untuk approval" />
                            </SelectTrigger>
                            <SelectContent>
                              {employeeList?.map((emp: any) => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.full_name || emp.id}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {financeApproverIds.length > 1 && (
                            <Button type="button" variant="outline" size="icon" onClick={() => setFinanceApproverIds(financeApproverIds.filter((_, i) => i !== index))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" className="w-full mt-2" onClick={() => setFinanceApproverIds([...financeApproverIds, ''])}>
                        + Tambah Atasan
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lampiran Bukti (Opsional)</label>
                      <FileUpload accept="image/*,.pdf" multiple onFilesChange={setFinanceFiles} />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={createFinanceMutation.isPending}>
                      {createFinanceMutation.isPending ? "Menyimpan..." : "Ajukan Keuangan"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Navigation Switcher between My Requests and Approval Queue */}
      <div className="flex border-b">
        <button
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${mainTab === 'my_requests' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setMainTab('my_requests')}
        >
          <FileText className="w-4 h-4" />
          Pengajuan Saya
        </button>
        <button
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${mainTab === 'approval_queue' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setMainTab('approval_queue')}
        >
          <Inbox className="w-4 h-4" />
          Persetujuan Masuk
          {approvalQueue.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">
              {approvalQueue.length}
            </span>
          )}
        </button>
      </div>

      {mainTab === 'my_requests' ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cuti">Cuti</TabsTrigger>
            <TabsTrigger value="keuangan">Keuangan</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cuti" className="mt-6 space-y-4">
            {leaveList.length === 0 ? (
              <EmptyState icon={CalendarIcon} title="Belum Ada Pengajuan Cuti" description="Anda belum membuat pengajuan cuti apapun." />
            ) : (
              leaveList.map((req: any) => {
                const startDateStr = req.start_date || req.startDate;
                const endDateStr = req.end_date || req.endDate;
                const typeName = req.leave_type?.name || req.leaveType?.name || 'Cuti';
                const pendingStep = (req.approval_steps || []).find((s: any) => s.status === 'Pending');

                return (
                  <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-900">{typeName}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {startDateStr ? new Date(startDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          {endDateStr ? ` - ${new Date(endDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                        </p>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                      <span className="font-medium">Alasan:</span> {req.reason}
                    </div>

                    {req.status === 'Pending' && (
                      <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-lg text-xs">
                        <span className="font-semibold text-amber-900">⏳ Menunggu Persetujuan dari:</span>{' '}
                        <span className="text-amber-800 font-bold">
                          {pendingStep?.assignee?.full_name || pendingStep?.role_required || 'Atasan Direct'}
                        </span>
                        {pendingStep?.step_order ? ` (Langkah ${pendingStep.step_order})` : ''}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
          
          <TabsContent value="keuangan" className="mt-6 space-y-4">
            {financeList.length === 0 ? (
              <EmptyState icon={FileText} title="Belum Ada Pengajuan Keuangan" description="Anda belum membuat pengajuan keuangan apapun." />
            ) : (
              financeList.map((req: any) => {
                const amountVal = Number(req.amount_idr ?? req.amount ?? 0);
                const createdDate = req.created_at || req.createdAt;
                const kindStr = req.kind || req.category || req.type || 'Pengajuan Keuangan';
                const pendingStep = (req.approval_steps || []).find((s: any) => s.status === 'Pending');

                return (
                  <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-900">{kindStr}</h3>
                        <p className="font-bold text-primary mt-1">{formatRupiah(amountVal)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {createdDate ? new Date(createdDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                        </p>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                      <span className="font-medium">Keterangan:</span> {req.description}
                    </div>

                    {['Pending', 'Diajukan', 'MenungguCEO', 'MenungguPencairan'].includes(req.status) && pendingStep && (
                      <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-lg text-xs">
                        <span className="font-semibold text-amber-900">⏳ Menunggu Persetujuan / Proses:</span>{' '}
                        <span className="text-amber-800 font-bold">
                          {pendingStep?.assignee?.full_name || 
                           (pendingStep?.role_required === 'finance.disburse' ? 'Kasir / Tim Keuangan (Pencairan)' :
                            pendingStep?.role_required === 'finance.approve.executive' ? 'CEO / Executive' :
                            pendingStep?.role_required || 'Atasan Direct')}
                        </span>
                        {pendingStep?.step_order ? ` (Langkah ${pendingStep.step_order})` : ''}
                      </div>
                    )}

                    {req.attachments && req.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {req.attachments.map((att: any, i: number) => (
                           <Badge key={i} variant="outline" className="text-[10px]">Lampiran {i+1}</Badge>
                        ))}
                      </div>
                    )}
                    {['Approved', 'MenungguPencairan', 'Dicairkan'].includes(req.status) && (
                      <div className="pt-2 border-t flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          onClick={() => handlePrintFinancePdf(req)}
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Cetak / PDF Bukti ACC
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Approval Queue Section */
        <div className="space-y-4">
          {approvalQueue.length === 0 ? (
            <EmptyState icon={Inbox} title="Belum Ada Persetujuan Masuk" description="Saat ini tidak ada pengajuan yang memerlukan persetujuan Anda." />
          ) : (
            approvalQueue.map((step: any) => {
              const reqData = step.request_data;
              const isLeave = step.request_type === 'Leave';
              const requesterName = reqData?.user?.full_name || 'Karyawan';
              const requesterNik = reqData?.user?.nik ? `(NIK: ${reqData.user.nik})` : '';

              return (
                <div key={step.id} className="bg-white p-5 rounded-xl shadow-sm border flex flex-col gap-4">
                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{requesterName}</span>
                        <span className="text-xs text-muted-foreground">{requesterNik}</span>
                      </div>
                      <p className="text-xs text-primary font-semibold mt-0.5">
                        {isLeave ? `Pengajuan Cuti (${reqData?.leave_type?.name || 'Cuti'})` : `Pengajuan Keuangan (${reqData?.kind || reqData?.category || 'Keuangan'})`}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      Langkah {step.step_order} ({step.role_required || 'Approver'})
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {isLeave ? (
                      <p className="text-slate-700">
                        <span className="font-medium">Periode Cuti:</span>{' '}
                        {reqData?.start_date ? new Date(reqData.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} s/d{' '}
                        {reqData?.end_date ? new Date(reqData.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        {reqData?.total_work_days ? ` (${reqData.total_work_days} hari kerja)` : ''}
                      </p>
                    ) : (
                      <p className="text-slate-700">
                        <span className="font-medium">Nominal:</span>{' '}
                        <span className="font-bold text-emerald-600">{formatRupiah(Number(reqData?.amount_idr || 0))}</span>
                      </p>
                    )}

                    <div className="bg-slate-50 p-3 rounded-lg text-slate-600">
                      <span className="font-medium">Alasan/Keterangan:</span> {reqData?.reason || reqData?.description || '-'}
                    </div>

                    {reqData?.attachments && reqData.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-xs font-medium text-slate-500">Lampiran:</span>
                        {reqData.attachments.map((att: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            Lampiran {idx + 1}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {rejectingId === step.id ? (
                    <div className="space-y-2 border-t pt-3">
                      <Input
                        placeholder="Tulis alasan penolakan (minimal 5 karakter)..."
                        value={rejectNote[step.id] || ''}
                        onChange={(e) => setRejectNote({ ...rejectNote, [step.id]: e.target.value })}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setRejectingId(null)}>Batal</Button>
                        <Button variant="destructive" size="sm" disabled={actApprovalMutation.isPending} onClick={() => handleReject(step)}>
                          Konfirmasi Tolak
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2 border-t pt-3">
                      <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setRejectingId(step.id)}>
                        <X className="w-4 h-4 mr-1" /> Tolak
                      </Button>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actApprovalMutation.isPending} onClick={() => handleApprove(step)}>
                        <Check className="w-4 h-4 mr-1" /> Setujui
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
