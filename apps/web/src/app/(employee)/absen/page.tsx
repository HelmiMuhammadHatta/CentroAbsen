'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from '@/hooks/use-location';
import { Camera, MapPin, RefreshCcw, Send, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

type Step = 'PREPARE' | 'CAMERA' | 'PREVIEW' | 'SUBMITTING' | 'SUCCESS' | 'ERROR';

export default function AbsenPage() {
  const [step, setStep] = useState<Step>('PREPARE');
  const [workMode, setWorkMode] = useState<'Office' | 'Home' | 'Anywhere'>('Office');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const location = useLocation(step !== 'PREPARE');

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep('CAMERA');
    } catch (err) {
      setErrorMessage('Izin kamera ditolak atau kamera tidak tersedia.');
      setStep('ERROR');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopCamera(); // Cleanup on unmount
  }, []);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Draw to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to Blob (kompresi awal di klien)
    canvas.toBlob((blob) => {
      if (blob) {
        setPhotoBlob(blob);
        setPhotoUrl(URL.createObjectURL(blob));
        stopCamera();
        setStep('PREVIEW');
      }
    }, 'image/jpeg', 0.8);
  };

  const submitAttendance = async () => {
    if (!photoBlob || !location.latitude || !location.longitude) {
      setErrorMessage('Data lokasi atau foto belum siap');
      setStep('ERROR');
      return;
    }

    setStep('SUBMITTING');
    const formData = new FormData();
    formData.append('photo', photoBlob, 'attendance.jpg');
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());
    formData.append('accuracyMeters', (location.accuracy || 0).toString());
    formData.append('workMode', workMode);
    formData.append('clientCapturedAt', new Date().toISOString());
    formData.append('type', 'CheckIn'); // Sederhananya hardcode dulu, di riil ambil dari state server

    try {
      // Idempotency key dihasilkan per sesi absen ini
      const idempotencyKey = crypto.randomUUID(); 
      await api.post('/attendance/check-in', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Idempotency-Key': idempotencyKey
        }
      });
      setStep('SUCCESS');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Koneksi bermasalah');
      setStep('ERROR');
    }
  };

  // Renders omitted for brevity to maintain focus on logic
  // The actual render would include full UI for the 6 steps outlined in the prompt
  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-white p-4">
      {/* PREPARE STATE */}
      {step === 'PREPARE' && (
        <div className="flex flex-col flex-1 justify-center items-center text-center space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Persiapan Absen</h1>
          <div className="w-full">
            <label className="block text-sm font-medium mb-2 text-left">Kerja dari:</label>
            <select 
              value={workMode} 
              onChange={e => setWorkMode(e.target.value as any)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="Office">Kantor</option>
              <option value="Home">Rumah</option>
              <option value="Anywhere">Lokasi Lain</option>
            </select>
          </div>
          <Button onClick={startCamera} className="w-full" size="lg">Mulai Kamera</Button>
        </div>
      )}

      {/* CAMERA STATE */}
      <div className={cn("relative flex-1 bg-black rounded-xl overflow-hidden flex flex-col", step !== 'CAMERA' && 'hidden')}>
        <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute top-4 left-4 right-4 bg-black/50 p-2 rounded text-white text-xs flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {location.loading ? 'Mencari lokasi...' : location.error ? 'Lokasi Error' : `Akurasi: ${Math.round(location.accuracy || 0)}m`}
          </div>
        </div>
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button onClick={takePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-gray-300" />
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* PREVIEW STATE */}
      {step === 'PREVIEW' && photoUrl && (
        <div className="flex flex-col flex-1">
          <img src={photoUrl} className="flex-1 object-cover rounded-xl mb-4 max-h-[60vh]" alt="Preview" />
          <div className="space-y-3">
             <div className="p-3 bg-blue-50 text-blue-900 rounded-lg text-sm flex items-start">
                <MapPin className="w-5 h-5 mr-2 shrink-0" />
                <div>
                  <p className="font-semibold">Lokasi siap</p>
                  <p>Akurasi: {Math.round(location.accuracy || 0)}m | Mode: {workMode}</p>
                </div>
             </div>
             <div className="flex space-x-3">
                <Button variant="outline" onClick={startCamera} className="flex-1"><RefreshCcw className="w-4 h-4 mr-2"/> Ulangi</Button>
                <Button onClick={submitAttendance} className="flex-1"><Send className="w-4 h-4 mr-2"/> Kirim</Button>
             </div>
          </div>
        </div>
      )}

      {/* SUBMITTING STATE */}
      {step === 'SUBMITTING' && (
        <div className="flex flex-col flex-1 justify-center items-center text-center">
           <div className="animate-spin w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full mb-4"></div>
           <p className="font-medium text-gray-700">Mengirim data absensi...</p>
        </div>
      )}

      {/* ERROR STATE */}
      {step === 'ERROR' && (
        <div className="flex flex-col flex-1 justify-center items-center text-center space-y-4">
           <AlertTriangle className="w-16 h-16 text-red-500" />
           <p className="text-red-700 font-medium">{errorMessage}</p>
           {photoBlob ? (
             <Button onClick={submitAttendance} className="w-full">Coba Kirim Lagi</Button>
           ) : (
             <Button onClick={() => setStep('PREPARE')} className="w-full" variant="outline">Kembali ke Awal</Button>
           )}
        </div>
      )}

      {/* SUCCESS STATE */}
      {step === 'SUCCESS' && (
        <div className="flex flex-col flex-1 justify-center items-center text-center space-y-4">
           <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
             ✓
           </div>
           <h2 className="text-xl font-bold text-gray-900">Absensi Berhasil!</h2>
           <p className="text-gray-500 text-sm">Data Anda telah terekam pada sistem.</p>
           <Button onClick={() => window.location.href = '/'} className="w-full mt-8">Kembali ke Beranda</Button>
        </div>
      )}
    </div>
  );
}
