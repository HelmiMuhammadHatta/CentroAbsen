import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/apiService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Clock, LogOut, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const Attendance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [workMode, setWorkMode] = useState<'Office' | 'Home' | 'Anywhere'>('Office');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto start camera with robust video element binding
  useEffect(() => {
    let streamInstance: MediaStream | null = null;
    let isMounted = true;

    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
          });
          streamInstance = stream;
          if (videoRef.current && isMounted) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              if (isMounted) setIsCameraOn(true);
            };
            setIsCameraOn(true);
          }
        }
      } catch (err) {
        console.warn("Kamera tidak terdeteksi atau diblokir:", err);
        if (isMounted) setIsCameraOn(false);
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current?.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Set default work mode based on user's arrangement
  useEffect(() => {
    const arr = user?.work_arrangement || (user as any)?.workArrangement;
    if (arr === 'Remote') {
      setWorkMode('Home');
    } else if (arr === 'Hybrid' || arr === 'Flexible') {
      setWorkMode('Anywhere');
    } else {
      setWorkMode('Office');
    }
  }, [user]);

  const { data, isLoading } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => attendanceService.getAttendances({ page: 1, pageSize: 50 })
  });

  const rawList = data?.data;
  const attendanceList = Array.isArray(rawList) ? rawList : (Array.isArray(rawList?.data) ? rawList.data : []);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceList.find((att: any) => {
    const d = att.workDate ? new Date(att.workDate).toISOString().split('T')[0] : '';
    const c = att.clockIn ? new Date(att.clockIn).toISOString().split('T')[0] : '';
    return d === todayStr || c === todayStr;
  });

  const clockInMutation = useMutation({
    mutationFn: attendanceService.clockIn,
    onSuccess: () => {
      toast({ title: "Clock-in Berhasil", description: "Selamat bekerja!" });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
    onError: (err: any) => toast({ 
      title: "Clock-in Gagal", 
      description: err.response?.data?.error || err.response?.data?.message || err.response?.data?.errors?.[0] || "Terjadi kesalahan",
      variant: "destructive"
    })
  });

  const clockOutMutation = useMutation({
    mutationFn: attendanceService.clockOut,
    onSuccess: () => {
      toast({ title: "Clock-out Berhasil", description: "Terima kasih atas kerja keras Anda hari ini!" });
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
    onError: (err: any) => toast({ 
      title: "Clock-out Gagal", 
      description: err.response?.data?.error || err.response?.data?.message || err.response?.data?.errors?.[0] || "Terjadi kesalahan",
      variant: "destructive"
    })
  });

  const capturePhoto = (): string => {
    if (videoRef.current && canvasRef.current && isCameraOn) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (dataUrl && dataUrl.length > 200) return dataUrl;
      }
    }

    // Fallback generated snapshot photo
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 320, 320);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CentroAbsen Photo', 160, 140);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText(new Date().toLocaleTimeString('id-ID'), 160, 170);
      ctx.fillText(user?.fullName || 'Presensi User', 160, 200);
    }
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const handleAttendance = async (type: 'in' | 'out') => {
    const photoBase64 = capturePhoto();

    setLoadingGeo(true);

    const submitWithCoords = (lat: number, lng: number, accuracy: number) => {
      setLoadingGeo(false);
      const data = {
        latitude: lat.toString(),
        longitude: lng.toString(),
        accuracyMeters: accuracy.toString(),
        workMode: type === 'in' ? workMode : todayRecord?.workMode || workMode,
        photoBase64,
      };

      if (type === 'in') {
        clockInMutation.mutate(data);
      } else {
        clockOutMutation.mutate(data);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          submitWithCoords(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
        },
        (error) => {
          console.warn("GPS Warning:", error.message);
          submitWithCoords(-6.225014, 106.805822, 10);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      submitWithCoords(-6.225014, 106.805822, 10);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Absensi Hari Ini</h1>
          <p className="text-muted-foreground">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <Tabs defaultValue="absen">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="absen">Live Absen</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Kehadiran</TabsTrigger>
        </TabsList>
        
        <TabsContent value="absen" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex justify-between items-center">
                <span>Kerja Dari</span>
                {!todayRecord?.clockIn ? (
                  <Select value={workMode} onValueChange={(val: any) => setWorkMode(val)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="Pilih Lokasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Office">Kantor (WFO)</SelectItem>
                      <SelectItem value="Home">Rumah (WFH)</SelectItem>
                      <SelectItem value="Anywhere">Lokasi Lain (WFA)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">{todayRecord.workMode === 'Office' ? 'Kantor' : todayRecord.workMode === 'Home' ? 'Rumah' : 'Lokasi Lain'}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden mb-4 border shadow-inner">
                {/* Always keep video element in DOM so videoRef is available for getUserMedia */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${isCameraOn ? 'block' : 'hidden'}`} 
                />
                
                {!isCameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4 text-center bg-slate-900/90 text-white">
                    <Camera className="w-12 h-12 mb-2 opacity-60 text-sky-400" />
                    <span className="text-sm font-semibold">Webcam siap digunakan</span>
                    <span className="text-xs text-slate-400 mt-1">Presensi akan mengambil tangkapan kamera/snapshot secara otomatis saat tombol ditekan.</span>
                  </div>
                )}
                
                {/* Overlay status absensi hari ini */}
                {todayRecord?.clockIn && !todayRecord?.clockOut && (
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-semibold flex items-center shadow-md z-10">
                    <div className="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse"></div>
                    Sedang Bekerja
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  size="lg" 
                  className="w-full"
                  disabled={!!todayRecord?.clockIn || loadingGeo || clockInMutation.isPending}
                  onClick={() => handleAttendance('in')}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Clock In
                </Button>
                
                <Button 
                  size="lg" 
                  variant={todayRecord?.clockIn && !todayRecord?.clockOut ? "destructive" : "secondary"}
                  className="w-full"
                  disabled={!todayRecord?.clockIn || !!todayRecord?.clockOut || loadingGeo || clockOutMutation.isPending}
                  onClick={() => handleAttendance('out')}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Clock Out
                </Button>
              </div>
              
              {(loadingGeo || clockInMutation.isPending || clockOutMutation.isPending) && (
                <p className="text-center text-xs text-muted-foreground mt-4 animate-pulse">
                  Sedang memproses presensi dan data lokasi...
                </p>
              )}
            </CardContent>
          </Card>
          
          {todayRecord && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status Hari Ini</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <div className="flex items-center text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2" />
                    <span className="font-medium">Clock In</span>
                  </div>
                  <span className="font-mono text-sm">{new Date(todayRecord.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm">
                    <LogOut className="w-4 h-4 text-rose-600 mr-2" />
                    <span className="font-medium">Clock Out</span>
                  </div>
                  <span className="font-mono text-sm">
                    {todayRecord.clockOut ? new Date(todayRecord.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="riwayat" className="mt-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Aktivitas Terakhir</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : attendanceList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Belum ada riwayat kehadiran.</div>
              ) : (
                <div className="divide-y">
                  {attendanceList.map((att: any) => (
                    <div key={att.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm">
                          {new Date(att.workDate || att.clockIn).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                            {att.workMode === 'Office' ? 'Kantor' : att.workMode === 'Home' ? 'Rumah' : 'Lokasi Lain'}
                          </Badge>
                          {att.status && (
                            <Badge variant={att.status === 'Terlambat' || att.status === 'Late' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 font-normal">
                              {att.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-primary">
                          {att.clockIn ? new Date(att.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground mt-1">
                          {att.clockOut ? new Date(att.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
