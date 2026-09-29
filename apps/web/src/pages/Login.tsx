import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/apiService';
import { useAuthStore } from '../store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Login = () => {
  const [email, setEmail] = useState('EMP001');
  const [password, setPassword] = useState('password123');
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.login({ email, password });
      
      const meRes = await authService.getMe();
      const userData = meRes.data || meRes;

      setAuth({
          id: userData.id,
          email: userData.email,
          employeeId: userData.employeeId || userData.nik,
          role: (userData.roles && userData.roles[0]) || 'Employee',
          permissions: userData.permissions || [],
          fullName: userData.fullName || userData.name,
          work_arrangement: userData.work_arrangement,
          primary_work_location: userData.primary_work_location
      });

      toast({ title: "Login Berhasil", description: "Selamat datang kembali!" });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ 
        title: "Login Gagal", 
        description: err.response?.data?.message || err.response?.data?.errors?.[0] || "Terjadi kesalahan", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Kiri: Form */}
      <div className="w-full lg:w-[480px] bg-white flex flex-col justify-center px-8 md:px-12 py-12 shrink-0">
        <div className="mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6">
            <span className="text-primary-foreground font-bold text-2xl">C</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Selamat Datang</h1>
          <p className="text-slate-500">Silakan masuk ke akun CentroAbsen Anda.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email atau NIK</label>
            <Input 
              type="text" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="Masukkan email/NIK"
              required 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-700">Kata Sandi</label>
              <Link to="/forgot-password" className="text-sm text-primary font-medium hover:underline">
                Lupa password?
              </Link>
            </div>
            <Input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Masukkan kata sandi"
              required 
            />
          </div>
          
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? "Masuk..." : "Masuk"}
          </Button>
        </form>
      </div>

      {/* Kanan: Ilustrasi */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <div className="relative z-10 max-w-lg text-center text-primary-foreground">
          <h2 className="text-4xl font-bold mb-6">Sistem HR Terintegrasi</h2>
          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            Kelola data absensi, pengajuan cuti, dan operasional karyawan dalam satu platform yang efisien dan modern.
          </p>
        </div>
      </div>
    </div>
  );
};
