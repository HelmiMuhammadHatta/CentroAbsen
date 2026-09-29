import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/axios';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: "Token tidak valid", description: "Tautan reset kata sandi tidak valid atau sudah kadaluarsa.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Validasi Gagal", description: "Kata sandi dan konfirmasi kata sandi tidak cocok.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast({ title: "Berhasil", description: "Kata sandi Anda telah berhasil direset. Silakan login dengan kata sandi baru." });
      navigate('/');
    } catch (err: any) {
      toast({ 
        title: "Gagal", 
        description: err.response?.data?.message || "Terjadi kesalahan saat mereset kata sandi", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center space-y-4">
           <h1 className="text-xl font-bold text-destructive">Tautan Tidak Valid</h1>
           <p className="text-slate-500">Tautan reset kata sandi tidak ditemukan.</p>
           <Link to="/">
              <Button className="mt-4">Kembali ke Login</Button>
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Buat Kata Sandi Baru</h1>
          <p className="text-slate-500 text-sm">Silakan masukkan kata sandi baru Anda.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Kata Sandi Baru</label>
            <Input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Minimal 8 karakter"
              minLength={8}
              required 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Konfirmasi Kata Sandi</label>
            <Input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Ulangi kata sandi baru"
              minLength={8}
              required 
            />
          </div>
          
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Kata Sandi"}
          </Button>
        </form>
      </div>
    </div>
  );
};
