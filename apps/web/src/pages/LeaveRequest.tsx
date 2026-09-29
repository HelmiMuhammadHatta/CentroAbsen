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
import { Plus, Inbox, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';

export const LeaveRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'cuti' | 'keuangan'>('cuti');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Leave Form State
  const [leaveType, setLeaveType] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Finance Form State
  const [financeType, setFinanceType] = useState('Reimbursement');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeDescription, setFinanceDescription] = useState('');
  const [financeFiles, setFinanceFiles] = useState<FileList | null>(null);
  const [financeApproverId, setFinanceApproverId] = useState('');

  // Additional Leave State
  const [leaveApproverId, setLeaveApproverId] = useState('');
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
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      setLeaveApproverId('');
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
      setFinanceApproverId('');
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err.response?.data?.message || err.response?.data?.errors?.[0] || "Gagal membuat pengajuan keuangan", variant: "destructive" });
    }
  });

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leaveFiles) {
      const formData = new FormData();
      formData.append('leaveTypeId', leaveType);
      formData.append('startDate', `${leaveStart}T00:00:00Z`);
      formData.append('endDate', `${leaveEnd}T00:00:00Z`);
      formData.append('reason', leaveReason);
      if (leaveApproverId) formData.append('approverId', leaveApproverId);
      
      Array.from(leaveFiles).forEach(file => {
        formData.append('attachments', file);
      });
      createLeaveMutation.mutate(formData);
    } else {
      createLeaveMutation.mutate({
        leaveTypeId: leaveType,
        startDate: `${leaveStart}T00:00:00Z`,
        endDate: `${leaveEnd}T00:00:00Z`,
        reason: leaveReason,
        approverId: leaveApproverId
      });
    }
  };

  const handleFinanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('type', financeType);
    formData.append('amount', financeAmount);
    formData.append('description', financeDescription);
    if (financeApproverId) formData.append('approverId', financeApproverId);
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
                        <Input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tanggal Selesai</label>
                        <Input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} required />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alasan / Keterangan</label>
                      <Input value={leaveReason} onChange={e => setLeaveReason(e.target.value)} placeholder="Tulis alasan cuti..." required />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pilih Atasan (Approver)</label>
                      <Select value={leaveApproverId} onValueChange={setLeaveApproverId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih atasan untuk approval" />
                        </SelectTrigger>
                        <SelectContent>
                          {employeeList?.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.full_name || emp.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          <SelectItem value="Cash Advance">Cash Advance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Jumlah (Rp)</label>
                      <Input type="number" min="0" value={financeAmount} onChange={e => setFinanceAmount(e.target.value)} placeholder="Misal: 500000" required />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Keterangan</label>
                      <Input value={financeDescription} onChange={e => setFinanceDescription(e.target.value)} placeholder="Tulis keperluan..." required />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pilih Atasan (Approver)</label>
                      <Select value={financeApproverId} onValueChange={setFinanceApproverId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih atasan untuk approval" />
                        </SelectTrigger>
                        <SelectContent>
                          {employeeList?.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.full_name || emp.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
