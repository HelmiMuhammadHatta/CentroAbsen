import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { employeeService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const ProfileSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => employeeService.changePassword(user!.id, data),
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Kata sandi berhasil diubah." });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      toast({ 
        title: "Gagal", 
        description: err.response?.data?.message || "Gagal mengubah kata sandi.", 
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Validasi Gagal", description: "Kata sandi baru tidak cocok dengan konfirmasi.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">Profil Saya</h2>
      
      <div className="space-y-4 mb-8">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Nama Lengkap</label>
          <p className="text-foreground font-semibold">{user?.fullName}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Email / NIK</label>
          <p className="text-foreground font-semibold">{user?.email} / {user?.employeeId}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Role</label>
          <p className="text-foreground font-semibold">{user?.role}</p>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-bold mb-4">Ganti Kata Sandi</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Kata Sandi Saat Ini</label>
            <Input 
              type="password" 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Kata Sandi Baru</label>
            <Input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              minLength={8}
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Konfirmasi Kata Sandi Baru</label>
            <Input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              minLength={8}
              required 
            />
          </div>
          <Button type="submit" disabled={changePasswordMutation.isPending}>
            {changePasswordMutation.isPending ? "Menyimpan..." : "Simpan Kata Sandi"}
          </Button>
        </form>
      </div>
    </div>
  );
};
