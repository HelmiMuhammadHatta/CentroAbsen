import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/axios';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
      toast({ title: "Email Terkirim", description: "Periksa kotak masuk email Anda untuk instruksi reset kata sandi." });
    } catch (err: any) {
      toast({ 
        title: "Gagal", 
        description: err.response?.data?.message || "Terjadi kesalahan saat memproses permintaan", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Lupa Kata Sandi</h1>
          <p className="text-slate-500 text-sm">Masukkan email Anda dan kami akan mengirimkan tautan untuk reset kata sandi.</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-success/10 text-success rounded-lg text-sm">
              Tautan reset kata sandi telah dikirim ke <strong>{email}</strong>
            </div>
            <Link to="/">
              <Button className="w-full mt-4" variant="outline">Kembali ke Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email Terdaftar</label>
              <Input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="nama@perusahaan.com"
                required 
              />
            </div>
            
            <div className="space-y-3">
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Mengirim..." : "Kirim Link Reset"}
              </Button>
              <Link to="/">
                <Button type="button" variant="ghost" className="w-full h-11 text-slate-500 hover:text-slate-900">
                  Kembali ke Login
                </Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
