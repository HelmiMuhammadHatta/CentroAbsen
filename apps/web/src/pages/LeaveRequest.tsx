import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService, financeService, employeeService } from '../services/apiService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUpload } from '@/components/ui/file-upload';
import { Plus, Inbox, FileText, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { formatRupiah } from '@/lib/formatters';

export const LeaveRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'cuti' | 'keuangan'>('cuti');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const leaveList = Array.isArray(leaves?.data) ? leaves.data : (Array.isArray(leaves?.data?.data) ? leaves.data.data : []);
  const financeList = Array.isArray(finances?.data) ? finances.data : (Array.isArray(finances?.data?.data) ? finances.data.data : []);
  const employeeList = Array.isArray(employeesData) ? employeesData : (Array.isArray(employeesData?.data) ? employeesData.data : (Array.isArray(employeesData?.data?.data) ? employeesData.data.data : []));

  // Mutations
  const createLeaveMutation = useMutation({
    mutationFn: leaveService.create,
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Pengajuan cuti berhasil dibuat." });
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
      toast({ title: "Gagal", description: err.response?.data?.message || err.response?.data?.errors?.[0] || "Gagal membuat pengajuan cuti", variant: "destructive" });
    }
  });

  const createFinanceMutation = useMutation({
    mutationFn: financeService.create,
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Pengajuan keuangan berhasil dibuat." });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      setIsDrawerOpen(false);
      setFinanceType('Reimbursement');
      setFinanceAmount('');
      setFinanceDescription('');
      setFinanceFiles(null);
      setFinanceApproverIds(['']);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.response?.data?.message || err.response?.data?.errors?.[0] || "Gagal membuat pengajuan keuangan", variant: "destructive" });
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

  const handleFinanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('kind', financeType);
    formData.append('amountIdr', financeAmount);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-success/20 text-success hover:bg-success/30 font-semibold border-none">Disetujui</Badge>;
      case 'Rejected':
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 font-semibold border-none">Ditolak</Badge>;
      case 'Pending':
      default:
        return <Badge className="bg-warning/20 text-warning-foreground hover:bg-warning/30 font-semibold border-none">Menunggu</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pengajuan</h1>
          <p className="text-muted-foreground">Kelola cuti dan keuangan Anda.</p>
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
                      <Input type="number" min="0" value={financeAmount} onChange={e => setFinanceAmount(e.target.value)} placeholder="Misal: 500000" required />
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cuti">Cuti</TabsTrigger>
          <TabsTrigger value="keuangan">Keuangan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cuti" className="mt-6 space-y-4">
          {leaveList.length === 0 ? (
            <EmptyState icon={CalendarIcon} title="Belum Ada Pengajuan Cuti" description="Anda belum membuat pengajuan cuti apapun." />
          ) : (
            leaveList.map((req: any) => (
              <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">{req.leaveType?.name || 'Cuti'}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(req.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(req.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                  <span className="font-medium">Alasan:</span> {req.reason}
                </div>
              </div>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="keuangan" className="mt-6 space-y-4">
          {financeList.length === 0 ? (
            <EmptyState icon={FileText} title="Belum Ada Pengajuan Keuangan" description="Anda belum membuat pengajuan keuangan apapun." />
          ) : (
            financeList.map((req: any) => (
              <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">{req.type}</h3>
                    <p className="font-bold text-primary mt-1">{formatRupiah(req.amount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                  <span className="font-medium">Keterangan:</span> {req.description}
                </div>
                {req.attachments && req.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {req.attachments.map((att: any, i: number) => (
                       <Badge key={i} variant="outline" className="text-[10px]">Lampiran {i+1}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
