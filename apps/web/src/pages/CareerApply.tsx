import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { publicService } from '../services/apiService';
import { 
  ArrowLeft, 
  Building2, 
  Briefcase, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  ShieldCheck,
  GraduationCap,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface PublicJobOpening {
  id: string;
  title: string;
  departmentId: string;
  departmentName: string;
  positionId: string;
  positionName: string;
  description: string;
  requirements: string;
  createdAt: string;
}

export const CareerApply: React.FC = () => {
  const { jobOpeningId } = useParams<{ jobOpeningId: string }>();
  const navigate = useNavigate();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [education, setEducation] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [ijazahFile, setIjazahFile] = useState<File | null>(null);

  // Errors & UI State
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch Job Opening details
  const { data: jobOpening, isLoading: isJobLoading, isError: isJobError } = useQuery<PublicJobOpening>({
    queryKey: ['publicJobOpening', jobOpeningId],
    queryFn: () => publicService.getJobOpeningById(jobOpeningId!),
    enabled: !!jobOpeningId
  });

  // Submit Mutation
  const applyMutation = useMutation({
    mutationFn: (formData: FormData) => publicService.applyJob(formData),
    onSuccess: (res: any) => {
      setIsSubmittedSuccess(true);
      setSuccessMessage(res?.message || 'Lamaran Anda telah kami terima, tim HR akan menghubungi Anda jika lolos seleksi awal');
      toast.success('Lamaran berhasil dikirim!');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Gagal mengirimkan lamaran. Silakan coba lagi.';
      toast.error(msg);
    }
  });

  const validateFile = (file: File, fieldName: string) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxBytes = 5 * 1024 * 1024; // 5 MB

    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      return `Format file ${fieldName} tidak didukung. Format yang diizinkan: PDF, JPG, PNG.`;
    }

    if (file.size > maxBytes) {
      return `Ukuran file ${fieldName} melebihi 5 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
    }

    return null;
  };

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateFile(file, 'CV');
      if (error) {
        toast.error(error);
        return;
      }
      setCvFile(file);
      setValidationErrors(prev => ({ ...prev, cvFile: '' }));
    }
  };

  const handleIjazahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateFile(file, 'Ijazah');
      if (error) {
        toast.error(error);
        return;
      }
      setIjazahFile(file);
      setValidationErrors(prev => ({ ...prev, ijazahFile: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!fullName.trim()) errors.fullName = 'Nama lengkap wajib diisi.';
    if (!email.trim()) {
      errors.email = 'Email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Format email tidak valid.';
    }
    if (!phone.trim()) errors.phone = 'Nomor telepon/WhatsApp wajib diisi.';
    if (!education.trim()) errors.education = 'Ringkasan pendidikan terakhir wajib diisi.';
    if (!cvFile) errors.cvFile = 'File Curriculum Vitae (CV) wajib diunggah.';
    if (!ijazahFile) errors.ijazahFile = 'File Ijazah / Surat Keterangan Lulus wajib diunggah.';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Mohon lengkapi seluruh formulir yang bertanda wajib (*)');
      return;
    }

    setValidationErrors({});

    const formData = new FormData();
    formData.append('fullName', fullName.trim());
    formData.append('email', email.trim());
    formData.append('phone', phone.trim());
    formData.append('jobOpeningId', jobOpeningId!);
    formData.append('education', education.trim());
    formData.append('workExperience', workExperience.trim());
    formData.append('cvFile', cvFile!);
    formData.append('ijazahFile', ijazahFile!);

    applyMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Loading state
  if (isJobLoading) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Memuat rincian lowongan...</p>
        </div>
      </div>
    );
  }

  // Not Found / Error State
  if (isJobError || !jobOpening) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-slate-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Lowongan Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 mb-6">
            Lowongan pekerjaan yang Anda cari sudah ditutup atau tidak lagi tersedia.
          </p>
          <button
            onClick={() => navigate('/careers')}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Lihat Lowongan Lainnya
          </button>
        </div>
      </div>
    );
  }

  // Success State Confirmation
  if (isSubmittedSuccess) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="bg-white rounded-3xl max-w-lg w-full p-8 sm:p-10 text-center border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 size={36} />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Lamaran Berhasil Dikirim!</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {successMessage}
          </p>

          <div className="text-left bg-blue-50/60 rounded-2xl p-4 border border-blue-100 mb-8 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-blue-900 font-semibold">
              <Briefcase size={14} className="text-blue-600" />
              <span>{jobOpening.title}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 size={14} className="text-slate-400" />
              <span>{jobOpening.departmentName} — {jobOpening.positionName}</span>
            </div>
            <div className="text-slate-500 pt-1 text-[11px]">
              Kandidat: <span className="font-medium text-slate-800">{fullName}</span> ({email})
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/careers')}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              Kembali ke Halaman Karier
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col font-sans text-slate-900">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/careers"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Daftar Lowongan</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              E
            </div>
            <span className="font-bold text-sm text-slate-800 hidden sm:inline">CentroAbsen</span>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Job Summary Card */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-4">
                <Building2 size={13} />
                {jobOpening.departmentName}
              </div>

              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                {jobOpening.title}
              </h1>

              <p className="text-xs font-medium text-slate-500 mb-6">
                Posisi: <span className="text-slate-800">{jobOpening.positionName}</span>
              </p>

              <div className="space-y-4 text-xs text-slate-600 border-t border-slate-100 pt-6">
                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                    Deskripsi Pekerjaan
                  </h3>
                  <p className="whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-slate-700">
                    {jobOpening.description}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                    Kualifikasi & Persyaratan
                  </h3>
                  <div className="whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-slate-700">
                    {jobOpening.requirements}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck size={14} className="text-blue-600" />
                <span>Pendaftaran bebas biaya. Waspada penipuan.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Application Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900">Formulir Lamaran Pekerjaan</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Mohon isi data diri dan unggah berkas pendukung Anda dengan benar dan lengkap.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Personal Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                    <h3 className="text-sm font-bold text-slate-900">Data Pribadi</h3>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Masukkan nama lengkap sesuai KTP"
                      className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border ${validationErrors.fullName ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900`}
                    />
                    {validationErrors.fullName && (
                      <p className="text-[11px] text-red-500 mt-1">{validationErrors.fullName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Alamat Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contoh@domain.com"
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border ${validationErrors.email ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900`}
                      />
                      {validationErrors.email && (
                        <p className="text-[11px] text-red-500 mt-1">{validationErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Nomor WhatsApp / Telepon <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081234567890"
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border ${validationErrors.phone ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900`}
                      />
                      {validationErrors.phone && (
                        <p className="text-[11px] text-red-500 mt-1">{validationErrors.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Education & Experience */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                    <h3 className="text-sm font-bold text-slate-900">Pendidikan & Pengalaman</h3>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Ringkasan Pendidikan Terakhir <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="Contoh: S1 Teknik Informatika, Universitas Indonesia (2019-2023, IPK: 3.82)"
                      className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border ${validationErrors.education ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900`}
                    />
                    {validationErrors.education && (
                      <p className="text-[11px] text-red-500 mt-1">{validationErrors.education}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Ringkasan Pengalaman Kerja
                    </label>
                    <textarea
                      rows={3}
                      value={workExperience}
                      onChange={(e) => setWorkExperience(e.target.value)}
                      placeholder="Contoh: 2 Tahun sebagai Full-Stack Developer di PT Inovasi Digital. Mengembangkan REST API dan Frontend Dashboard."
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-900"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tuliskan nama perusahaan, peran, durasi kerja, dan pencapaian utama Anda.
                    </p>
                  </div>
                </div>

                {/* Section 3: Upload Documents */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                    <h3 className="text-sm font-bold text-slate-900">Unggah Berkas Pendukung</h3>
                  </div>

                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                    <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <span>Format yang didukung: <strong>PDF, JPG, JPEG, PNG</strong>. Ukuran maksimum: <strong>5 MB</strong> per berkas.</span>
                  </div>

                  {/* Upload CV */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Curriculum Vitae (CV) / Resume <span className="text-red-500">*</span>
                    </label>

                    {!cvFile ? (
                      <label className={`flex flex-col items-center justify-center border-2 border-dashed ${validationErrors.cvFile ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400'} rounded-2xl p-6 cursor-pointer transition-all`}>
                        <Upload size={24} className="text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700">Pilih berkas CV atau seret ke sini</span>
                        <span className="text-[11px] text-slate-400 mt-1">PDF, JPG, atau PNG (Maks. 5 MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleCvChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3.5 bg-blue-50/50 border border-blue-200 rounded-2xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{cvFile.name}</p>
                            <p className="text-[11px] text-slate-500">{formatFileSize(cvFile.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCvFile(null)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    {validationErrors.cvFile && (
                      <p className="text-[11px] text-red-500 mt-1">{validationErrors.cvFile}</p>
                    )}
                  </div>

                  {/* Upload Ijazah */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Ijazah / Surat Keterangan Lulus (SKL) <span className="text-red-500">*</span>
                    </label>

                    {!ijazahFile ? (
                      <label className={`flex flex-col items-center justify-center border-2 border-dashed ${validationErrors.ijazahFile ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400'} rounded-2xl p-6 cursor-pointer transition-all`}>
                        <Upload size={24} className="text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-700">Pilih berkas Ijazah atau seret ke sini</span>
                        <span className="text-[11px] text-slate-400 mt-1">PDF, JPG, atau PNG (Maks. 5 MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleIjazahChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <GraduationCap size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{ijazahFile.name}</p>
                            <p className="text-[11px] text-slate-500">{formatFileSize(ijazahFile.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIjazahFile(null)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    {validationErrors.ijazahFile && (
                      <p className="text-[11px] text-red-500 mt-1">{validationErrors.ijazahFile}</p>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <Link
                    to="/careers"
                    className="w-full sm:w-auto px-5 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl text-center transition-colors"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    disabled={applyMutation.isPending}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    {applyMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Mengirimkan Lamaran...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Lamaran Sekarang</span>
                        <CheckCircle2 size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
