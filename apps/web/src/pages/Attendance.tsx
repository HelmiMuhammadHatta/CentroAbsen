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
import { Camera, MapPin, Clock, LogOut, CheckCircle2 } from 'lucide-react';
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

  // Auto start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraOn(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
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
    queryFn: () => attendanceService.getAttendances({ page: 1, pageSize: 10 })
  });

  const attendanceList = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.data?.data) ? data.data.data : []);
  
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

  const capturePhoto = (): string | null => {
    if (!videoRef.current || !canvasRef.current || !isCameraOn) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleAttendance = async (type: 'in' | 'out') => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation tidak didukung browser ini.", variant: "destructive" });
      return;
    }

    const photoBase64 = capturePhoto();
    if (!photoBase64) {
      toast({ title: "Kamera diperlukan", description: "Harap izinkan akses kamera untuk melanjutkan.", variant: "destructive" });
      return;
    }

    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoadingGeo(false);
        const data = {
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
          accuracyMeters: position.coords.accuracy.toString(),
          workMode: type === 'in' ? workMode : todayRecord?.workMode || workMode,
          photoBase64,
        };

        if (type === 'in') {
          clockInMutation.mutate(data);
        } else {
          clockOutMutation.mutate(data);
        }
      },
      (error) => {
        setLoadingGeo(false);
        toast({ title: "Gagal Mendapatkan Lokasi", description: error.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
                {isCameraOn ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <Camera className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-sm font-medium">Kamera tidak aktif</span>
                  </div>
                )}
                
                {/* Overlay status absensi hari ini */}
                {todayRecord?.clockIn && !todayRecord?.clockOut && (
                  <div className="absolute top-2 right-2 bg-success text-success-foreground text-xs px-2 py-1 rounded-full font-semibold flex items-center shadow-sm">
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
                  disabled={!!todayRecord?.clockIn || loadingGeo || clockInMutation.isPending || !isCameraOn}
                  onClick={() => handleAttendance('in')}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Clock In
                </Button>
                
                <Button 
                  size="lg" 
                  variant={todayRecord?.clockIn && !todayRecord?.clockOut ? "destructive" : "secondary"}
                  className="w-full"
                  disabled={!todayRecord?.clockIn || !!todayRecord?.clockOut || loadingGeo || clockOutMutation.isPending || !isCameraOn}
                  onClick={() => handleAttendance('out')}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Clock Out
                </Button>
              </div>
              
              {(loadingGeo || clockInMutation.isPending || clockOutMutation.isPending) && (
                <p className="text-center text-xs text-muted-foreground mt-4 animate-pulse">
                  Sedang memproses lokasi dan foto...
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
                    <CheckCircle2 className="w-4 h-4 text-success mr-2" />
                    <span className="font-medium">Clock In</span>
                  </div>
                  <span className="font-mono text-sm">{new Date(todayRecord.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm">
                    <LogOut className="w-4 h-4 text-destructive mr-2" />
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
              <CardTitle className="text-base">10 Aktivitas Terakhir</CardTitle>
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
                          {new Date(att.workDate || att.clockIn).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                            {att.workMode === 'Office' ? 'Kantor' : att.workMode === 'Home' ? 'Rumah' : 'Lokasi Lain'}
                          </Badge>
                          {att.status && (
                            <Badge variant={att.status === 'Late' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 font-normal">
                              {att.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-primary">
                          {new Date(att.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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
