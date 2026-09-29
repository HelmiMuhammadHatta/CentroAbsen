import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assessmentService } from '../services/apiService';
import { ArrowLeft, CheckCircle, Clock, BarChart3, Award, Camera, Eye, X, ShieldCheck } from 'lucide-react';

export const TestResult = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  const { data: resultData, isLoading, isError } = useQuery({
    queryKey: ['test-result', sessionId],
    queryFn: () => assessmentService.getTestResult(sessionId!),
    enabled: !!sessionId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-slate-500 font-medium">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
        Memuat hasil asesmen...
      </div>
    );
  }
  
  if (isError || !resultData) {
    return (
      <div className="p-8 max-w-3xl mx-auto mt-10 bg-white rounded-2xl shadow-sm border border-red-200 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Hasil Asesmen Tidak Ditemukan</h2>
        <p className="text-slate-600 mb-6 text-sm">Hasil test tidak dapat dimuat atau sesi belum selesai dikerjakan.</p>
        <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 rounded-xl text-white font-medium text-sm transition-colors">
          Kembali
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const isLogic = resultData.testType === 0; // 0 = Logic, 1 = Personality

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      {/* Lightbox Modal for Proctoring Snapshots */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedSnapshot(null)}>
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <Camera size={18} className="text-blue-400" />
                <span>Foto Rekaman Proctoring Pengawasan</span>
              </div>
              <button 
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/40">
              <img 
                src={`http://localhost:5000${selectedSnapshot}`} 
                alt="Proctoring Fullscreen" 
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white px-8 py-6 border-b border-slate-200">
        <div className="flex items-center gap-4 max-w-5xl mx-auto w-full">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Laporan Hasil Asesmen</h1>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
              <span>Rekrutmen</span>
              <span className="text-slate-300">/</span>
              <span>Asesmen</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-bold">Hasil Sesi</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto w-full flex-1 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-md border border-blue-200">
                  {isLogic ? 'Tes Logika & IQ' : 'Tes Kepribadian DISC'}
                </span>
                {resultData.tabSwitchCount === 0 || resultData.tabSwitchCount === undefined ? (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-md border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck size={13} /> Integritas 100% (0x Pindah Tab)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 font-bold text-xs rounded-md border border-amber-300 flex items-center gap-1">
                    ⚠️ {resultData.tabSwitchCount}x Pindah Tab Terdeteksi
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">
                {isLogic ? 'Evaluasi Kemampuan Logika' : 'Profil Kepribadian Kerja'}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 font-medium mt-2">
                <span className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-500"/> Selesai Dikerjakan</span>
                <span className="flex items-center gap-1.5"><Clock size={16} className="text-blue-500"/> Durasi Pengerjaan: {formatTime(resultData.durationSeconds)}</span>
                {resultData.tabSwitchCount > 0 && (
                  <span className="text-amber-700 font-semibold">
                    (Catatan Pelanggaran: {resultData.tabSwitchCount} kali berpindah tab/jendela)
                  </span>
                )}
              </div>
            </div>
            
            {isLogic && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 px-8 py-5 rounded-2xl text-center min-w-[160px] shadow-sm">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Total Skor</p>
                <div className="text-4xl font-black text-blue-600 tracking-tight">{resultData.scorePercentage.toFixed(0)}<span className="text-2xl text-blue-400">%</span></div>
              </div>
            )}
            
            {!isLogic && (
              <div className="bg-indigo-50 border border-indigo-100 px-8 py-5 rounded-2xl text-center min-w-[160px]">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Tipe Dominan</p>
                <div className="text-2xl font-black text-indigo-800 flex items-center justify-center gap-2">
                  <Award size={24} className="text-indigo-600" /> {resultData.dominantTrait}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            {isLogic ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-center items-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="72" cy="72" r="60" className="text-slate-200 stroke-current" strokeWidth="12" fill="transparent" />
                      <circle 
                        cx="72" 
                        cy="72" 
                        r="60" 
                        className="text-blue-600 stroke-current" 
                        strokeWidth="12" 
                        fill="transparent" 
                        strokeDasharray="376.99" 
                        strokeDashoffset={376.99 - (376.99 * resultData.scorePercentage) / 100} 
                        strokeLinecap="round" 
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-slate-800">
                        {resultData.correctAnswers}
                      </span>
                      <span className="text-xs text-slate-500 font-bold">
                        dari {resultData.totalQuestions} Soal
                      </span>
                    </div>
                  </div>
                  <h3 className="mt-4 font-bold text-slate-800 text-sm">Akurasi Jawaban Benar</h3>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Ringkasan Poin</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-xl">
                      <p className="text-xs font-medium text-emerald-700">Benar</p>
                      <p className="font-black text-2xl">{resultData.correctAnswers}</p>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-100 text-red-900 rounded-xl">
                      <p className="text-xs font-medium text-red-700">Salah / Kosong</p>
                      <p className="font-black text-2xl">{resultData.totalQuestions - resultData.correctAnswers}</p>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2 pt-2">Breakdown Skor per Kategori</h3>
                  <div className="space-y-3 pt-1">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">1. Verbal (Sinonim / Analogi)</span>
                        <span className="font-bold text-blue-700">{resultData.verbalScorePercentage?.toFixed(0) || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${resultData.verbalScorePercentage || 0}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">2. Numerik (Deret / Aritmatika)</span>
                        <span className="font-bold text-indigo-700">{resultData.numericScorePercentage?.toFixed(0) || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${resultData.numericScorePercentage || 0}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-700">3. Logika & Penalaran Silogisme</span>
                        <span className="font-bold text-purple-700">{resultData.logicScorePercentage?.toFixed(0) || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${resultData.logicScorePercentage || 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-slate-800 text-lg mb-6 flex items-center gap-2">
                  <BarChart3 size={20} className="text-slate-500" /> Distribusi Profil DISC
                </h3>
                
                <div className="space-y-6 max-w-2xl mx-auto">
                  {[
                    { label: 'Dominance (D)', score: resultData.scoreD, color: 'bg-red-500', bg: 'bg-red-100', text: 'text-red-700', desc: 'Tegas, Berorientasi Hasil, Memimpin' },
                    { label: 'Influence (I)', score: resultData.scoreI, color: 'bg-yellow-400', bg: 'bg-yellow-100', text: 'text-yellow-700', desc: 'Komunikatif, Antusias, Optimis' },
                    { label: 'Steadiness (S)', score: resultData.scoreS, color: 'bg-green-500', bg: 'bg-green-100', text: 'text-green-700', desc: 'Tenang, Kooperatif, Sabar & Setia' },
                    { label: 'Conscientiousness (C)', score: resultData.scoreC, color: 'bg-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', desc: 'Analitis, Akurat, Terstruktur & Teliti' }
                  ].map((trait, idx) => {
                    const total = resultData.totalQuestions || 1;
                    const percent = (trait.score / total) * 100;
                    const isDominant = resultData.dominantTrait === trait.label.split(' ')[0][0];
                    
                    return (
                      <div key={idx} className={`p-4 rounded-xl border ${isDominant ? 'border-slate-300 shadow-sm bg-slate-50' : 'border-transparent'}`}>
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <span className="font-bold text-slate-800">{trait.label}</span>
                            {isDominant && <span className="ml-2 px-2 py-0.5 bg-slate-800 text-white text-[10px] font-bold uppercase rounded">Dominant</span>}
                            <p className="text-xs text-slate-500 mt-0.5">{trait.desc}</p>
                          </div>
                          <span className={`font-bold text-lg ${trait.text}`}>{trait.score} <span className="text-xs text-slate-400 font-medium">pts</span></span>
                        </div>
                        <div className={`w-full h-3 rounded-full overflow-hidden ${trait.bg}`}>
                          <div className={`h-full ${trait.color} transition-all duration-1000 ease-out`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Proctoring Gallery */}
          {resultData.proctoringSnapshots && resultData.proctoringSnapshots.length > 0 && (
            <div className="p-6 sm:p-8 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Camera size={18} className="text-blue-600" /> 
                  Rekaman Snapshot Proctoring ({resultData.proctoringSnapshots.length} Foto)
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Diambil secara otomatis berkala selama pengerjaan test
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {resultData.proctoringSnapshots.map((snap: string, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedSnapshot(snap)}
                    className="aspect-[4/3] bg-slate-200 rounded-xl overflow-hidden border border-slate-300 shadow-xs relative group cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  >
                    <img 
                      src={`http://localhost:5000${snap}`} 
                      alt={`Snapshot ${idx+1}`} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold">
                        <Eye size={14} /> Lihat
                      </div>
                    </div>
                    <div className="absolute bottom-1.5 left-2 bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white px-2 py-0.5 rounded">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

