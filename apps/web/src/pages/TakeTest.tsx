import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { assessmentService } from '../services/apiService';
import { toast } from 'sonner';
import { 
  Clock, CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Camera, 
  ArrowRight, ShieldCheck, VideoOff, RefreshCw, Check, AlertTriangle,
  Flag, AlertOctagon, Send, ListOrdered
} from 'lucide-react';
import { format } from 'date-fns';

export const TakeTest = () => {
  const { testId, sessionId } = useParams<{ testId: string, sessionId: string }>();

  // Test state
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  // Security & 6-Digit OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  // Camera & Proctoring State
  const [cameraStepDone, setCameraStepDone] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);

  // Tab Switch / Focus Loss Integrity Tracking
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // --- Unified Modal System States ---
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showTabWarningModal, setShowTabWarningModal] = useState(false);
  const [showTimeWarningModal, setShowTimeWarningModal] = useState(false);
  const [timeWarningMinutes, setTimeWarningMinutes] = useState<number>(5);
  const [showTimeOutModal, setShowTimeOutModal] = useState(false);
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number>(10);
  const [showCameraErrorModal, setShowCameraErrorModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Warning thresholds trackers (only trigger once per session)
  const hasShown5MinWarning = useRef(false);
  const hasShown1MinWarning = useRef(false);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const proctoringTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Callback ref for preview video element (Screen 2)
  const setPreviewVideoRef = (node: HTMLVideoElement | null) => {
    previewVideoRef.current = node;
    if (node && cameraStream) {
      if (node.srcObject !== cameraStream) {
        node.srcObject = cameraStream;
      }
      node.play().catch(e => console.warn('Preview video play warning:', e));
    }
  };

  // Callback ref for floating live video element (Screen 3)
  const setFloatingVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && cameraStream) {
      if (node.srcObject !== cameraStream) {
        node.srcObject = cameraStream;
      }
      node.play().catch(e => console.warn('Floating video play warning:', e));
    }
  };

  // Fetch session data
  const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } = useQuery({
    queryKey: ['test-session', sessionId],
    queryFn: () => assessmentService.getSession(sessionId!),
    enabled: !!sessionId
  });

  // Sync initial tab switch count
  useEffect(() => {
    if (sessionData && sessionData.tabSwitchCount !== undefined) {
      setTabSwitchCount(sessionData.tabSwitchCount);
    }
  }, [sessionData]);

  const { data: testsData, isLoading: isTestsLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => assessmentService.getTests()
  });

  const { data: questionsData, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ['test-questions', testId],
    queryFn: () => assessmentService.getTestQuestions(testId!),
    enabled: !!testId && isAccessGranted && cameraStepDone
  });

  // Verify Access Code Mutation
  const verifyMutation = useMutation({
    mutationFn: (code: string) => assessmentService.verifyAccessCode(sessionId!, code),
    onSuccess: (res: any) => {
      if (res.success) {
        setIsAccessGranted(true);
        setAccessError(null);
        toast.success('Kode akses terverifikasi. Silakan periksa kamera.');
      } else {
        if (res.status === 'Locked') {
          setIsLocked(true);
          setLockMessage(res.message);
        } else {
          setAccessError(res.message || 'Kode akses tidak valid.');
        }
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal memverifikasi kode akses.';
      const status = err.response?.data?.status;
      if (status === 'Locked') {
        setIsLocked(true);
        setLockMessage(msg);
      } else {
        setAccessError(msg);
      }
    }
  });

  // Record Tab Switch Mutation
  const recordTabSwitchMutation = useMutation({
    mutationFn: (count: number) => assessmentService.recordTabSwitch(sessionId!, count)
  });

  // Submit Answer Mutation
  const submitAnswerMutation = useMutation({
    mutationFn: (data: { questionId: string, optionId: string }) => 
      assessmentService.submitAnswer(sessionId!, { questionId: data.questionId, selectedOptionId: data.optionId })
  });

  // Final Session Submit Mutation
  const submitSessionMutation = useMutation({
    mutationFn: () => assessmentService.submitSession(sessionId!),
    onSuccess: () => {
      setShowSubmitModal(false);
      setShowTimeOutModal(false);
      toast.success('Tes berhasil dikumpulkan.');
      cleanupCamera();
      refetchSession();
    },
    onError: (err: any) => {
      setShowSubmitModal(false);
      setShowTimeOutModal(false);
      toast.error(err.response?.data?.message || 'Gagal mengirimkan tes.');
      refetchSession();
    }
  });

  // Upload Snapshot Mutation
  const uploadSnapshotMutation = useMutation({
    mutationFn: (base64: string) => assessmentService.uploadSnapshot(sessionId!, base64)
  });

  // Camera Management
  const requestCameraAccess = async () => {
    setIsRequestingCamera(true);
    setCameraError(null);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      setCameraStream(stream);
      setIsRequestingCamera(false);
      setShowCameraErrorModal(false);

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(e => console.warn('Preview play warning:', e));
      }
    } catch (err: any) {
      console.error("Camera access denied", err);
      setIsRequestingCamera(false);
      const errMsg = "Izin kamera diperlukan untuk validitas asesmen. Silakan izinkan akses kamera di peramban Anda.";
      setCameraError(errMsg);
      if (cameraStepDone) {
        setShowCameraErrorModal(true);
      }
    }
  };

  // Auto-request camera on entering camera verification screen
  useEffect(() => {
    if (isAccessGranted && !cameraStepDone && !cameraStream && !cameraError && !isRequestingCamera) {
      requestCameraAccess();
    }
  }, [isAccessGranted, cameraStepDone]);

  // Synchronize stream with video elements
  useEffect(() => {
    if (cameraStream) {
      if (previewVideoRef.current && previewVideoRef.current.srcObject !== cameraStream) {
        previewVideoRef.current.srcObject = cameraStream;
        previewVideoRef.current.play().catch(e => console.warn('Preview play warning:', e));
      }
      if (videoRef.current && videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.play().catch(e => console.warn('Floating play warning:', e));
      }
    }
  }, [cameraStream, cameraStepDone, isAccessGranted]);

  // Periodic 30s snapshot
  useEffect(() => {
    if (cameraStepDone && cameraStream) {
      const interval = setInterval(() => {
        captureSnapshot();
      }, 30000);
      proctoringTimerRef.current = interval;

      return () => {
        if (proctoringTimerRef.current) clearInterval(proctoringTimerRef.current);
      };
    }
  }, [cameraStepDone, cameraStream]);

  // Tab switch & Window focus monitoring
  useEffect(() => {
    if (!cameraStepDone || !isAccessGranted || isSubmitting) return;

    let hasSwitched = false;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hasSwitched = true;
        captureSnapshot();
      } else if (document.visibilityState === 'visible' && hasSwitched) {
        hasSwitched = false;
        setTabSwitchCount(prev => {
          const nextCount = prev + 1;
          recordTabSwitchMutation.mutate(nextCount);
          return nextCount;
        });
        setShowTabWarningModal(true);
        setTimeout(() => captureSnapshot(), 600);
      }
    };

    const handleBlur = () => {
      hasSwitched = true;
      captureSnapshot();
    };

    const handleFocus = () => {
      if (hasSwitched) {
        hasSwitched = false;
        setTabSwitchCount(prev => {
          const nextCount = prev + 1;
          recordTabSwitchMutation.mutate(nextCount);
          return nextCount;
        });
        setShowTabWarningModal(true);
        setTimeout(() => captureSnapshot(), 600);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [cameraStepDone, isAccessGranted, isSubmitting, cameraStream]);

  // Beforeunload prevention
  useEffect(() => {
    if (!cameraStepDone || !isAccessGranted || isSubmitting) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cameraStepDone, isAccessGranted, isSubmitting]);

  const captureSnapshot = () => {
    if (!canvasRef.current || !cameraStream) return;

    const video = (cameraStepDone ? videoRef.current : previewVideoRef.current) || previewVideoRef.current || videoRef.current;
    if (!video) return;

    if (video.srcObject !== cameraStream) {
      video.srcObject = cameraStream;
      video.play().catch(() => {});
    }

    const width = video.videoWidth > 0 ? video.videoWidth : 640;
    const height = video.videoHeight > 0 ? video.videoHeight : 480;

    if (video.videoWidth === 0 || video.readyState < 2) {
      setTimeout(() => {
        captureSnapshot();
      }, 400);
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    
    const context = canvas.getContext('2d');
    if (context) {
      try {
        context.drawImage(video, 0, 0, width, height);
        const base64Image = canvas.toDataURL('image/jpeg', 0.75);
        if (base64Image && base64Image.length > 100) {
          uploadSnapshotMutation.mutate(base64Image);
        }
      } catch (err) {
        console.error('Error capturing snapshot:', err);
      }
    }
  };

  const startTestAfterCamera = () => {
    if (!cameraStream) {
      toast.error("Silakan aktifkan kamera terlebih dahulu.");
      return;
    }
    captureSnapshot();
    setCameraStepDone(true);
    setTimeout(() => {
      captureSnapshot();
    }, 2500);
  };

  const cleanupCamera = () => {
    if (proctoringTimerRef.current) clearInterval(proctoringTimerRef.current);
    if (autoSubmitTimerRef.current) clearInterval(autoSubmitTimerRef.current);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, []);

  // Initialize timer
  useEffect(() => {
    if (testsData && testId && isAccessGranted && cameraStepDone) {
      const test = testsData.find((t: any) => t.id === testId);
      if (test) {
        setDurationMinutes(test.durationMinutes);
        const savedStart = localStorage.getItem(`session_start_${sessionId}`);
        if (savedStart) {
          setStartedAt(savedStart);
        } else {
          const now = new Date().toISOString();
          localStorage.setItem(`session_start_${sessionId}`, now);
          setStartedAt(now);
        }
      }
    }
  }, [testsData, testId, isAccessGranted, cameraStepDone, sessionId]);

  // Countdown timer & Time warning triggers
  useEffect(() => {
    if (startedAt && durationMinutes > 0 && cameraStepDone) {
      const interval = setInterval(() => {
        const start = new Date(startedAt).getTime();
        const end = start + durationMinutes * 60000;
        const now = new Date().getTime();
        const remain = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(remain);

        // 5 Minutes remaining warning (300 seconds)
        if (remain <= 300 && remain > 295 && !hasShown5MinWarning.current) {
          hasShown5MinWarning.current = true;
          setTimeWarningMinutes(5);
          setShowTimeWarningModal(true);
        }

        // 1 Minute remaining warning (60 seconds)
        if (remain <= 60 && remain > 55 && !hasShown1MinWarning.current) {
          hasShown1MinWarning.current = true;
          setTimeWarningMinutes(1);
          setShowTimeWarningModal(true);
        }

        // Time completely out (0 seconds)
        if (remain === 0 && !isSubmitting) {
          clearInterval(interval);
          triggerTimeOutModal();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startedAt, durationMinutes, isSubmitting, cameraStepDone]);

  // Auto-submit modal countdown handler (10s auto-submit)
  const triggerTimeOutModal = () => {
    setShowTimeOutModal(true);
    let count = 10;
    setAutoSubmitCountdown(10);
    autoSubmitTimerRef.current = setInterval(() => {
      count -= 1;
      setAutoSubmitCountdown(count);
      if (count <= 0) {
        if (autoSubmitTimerRef.current) clearInterval(autoSubmitTimerRef.current);
        executeFinalSubmit();
      }
    }, 1000);
  };

  // 6-digit OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9a-zA-Z]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);
    if (accessError) setAccessError(null);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9a-zA-Z]/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setOtpDigits(newDigits);
    if (accessError) setAccessError(null);

    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const fullCode = otpDigits.join('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setAccessError(null);
    if (fullCode.length === 6) {
      verifyMutation.mutate(fullCode);
    } else {
      setAccessError('Masukkan 6 digit kode akses lengkap.');
    }
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    submitAnswerMutation.mutate({ questionId, optionId });
  };

  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const executeFinalSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    captureSnapshot();
    localStorage.removeItem(`session_start_${sessionId}`);
    submitSessionMutation.mutate();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper category badge info (subtle grey tag)
  const getCategoryBadge = (category: string | number | undefined) => {
    const catStr = String(category || '').toLowerCase();
    let label = 'Soal Asesmen';
    if (catStr === 'verbal' || catStr === '1') label = 'Verbal';
    else if (catStr === 'numeric' || catStr === 'numerik' || catStr === '2') label = 'Numerik';
    else if (catStr === 'logic' || catStr === 'logika' || catStr === '3') label = 'Logika & Penalaran';

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-normal text-slate-600 bg-slate-100 border border-slate-200">
        {label}
      </span>
    );
  };

  // Keyboard Esc Listener for active modals (except timeout modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSubmitModal) setShowSubmitModal(false);
        else if (showTabWarningModal) setShowTabWarningModal(false);
        else if (showTimeWarningModal) setShowTimeWarningModal(false);
        else if (showCameraErrorModal) setShowCameraErrorModal(false);
        else if (showExitModal) setShowExitModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSubmitModal, showTabWarningModal, showTimeWarningModal, showCameraErrorModal, showExitModal]);

  // 1. Loading State
  if (isSessionLoading || isTestsLoading) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.08)] p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[#64748B] font-medium">Memuat data asesmen...</p>
        </div>
      </div>
    );
  }

  // 2. Completed State
  const isCompleted = sessionData?.status === 'Completed' || sessionData?.status === 1 || sessionData?.completedAt;
  if (isCompleted) {
    const completedDate = sessionData.completedAt ? new Date(sessionData.completedAt) : new Date();
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="bg-white max-w-[480px] w-full rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.08)] relative overflow-hidden">
          
          {/* Top 4px Green Bar */}
          <div className="h-1.5 bg-[#059669] w-full"></div>

          <div className="p-6 sm:p-8 text-center">
            <div className="w-14 h-14 bg-[#ECFDF5] text-[#059669] rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle size={28} strokeWidth={1.5} />
            </div>
            
            <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A] mb-2">
              Tes Telah Selesai
            </h1>
            
            <p className="text-sm text-[#64748B] leading-relaxed mb-6">
              Seluruh jawaban dan rekaman pengawasan Anda telah tersimpan dengan aman di sistem. Sesi ini tidak dapat dikerjakan ulang untuk menjaga validitas evaluasi.
            </p>

            {/* Two-Column Summary Table */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 text-xs text-[#64748B] space-y-2.5 text-left mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status Sesi:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-emerald-200">
                  Selesai (Submitted)
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                <span className="text-slate-500">Waktu Selesai:</span>
                <span className="font-mono text-[#0F172A] font-medium">{format(completedDate, 'dd/MM/yyyy HH:mm')} WIB</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                <span className="text-slate-500">Sesi ID:</span>
                <span className="font-mono text-[#0F172A]">{sessionId?.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                <span className="text-slate-500">Sistem Pengawasan:</span>
                <span className="font-medium text-[#059669] flex items-center gap-1">
                  <ShieldCheck size={14} strokeWidth={1.5} /> Terverifikasi
                </span>
              </div>
            </div>

            <div className="pt-2 text-xs text-[#64748B] border-t border-slate-100 flex items-center justify-center gap-1.5">
              <span>CentroAbsen & Proctoring System</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Screen 1: Access Code Verification
  if (!isAccessGranted) {
    const testInfo = testsData?.find((t: any) => t.id === testId);
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="bg-white max-w-[440px] w-full rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.08)] relative overflow-hidden">
          
          {/* Top Blue Bar 4px */}
          <div className="h-1.5 bg-[#1D4ED8] w-full"></div>

          <div className="p-6 sm:p-8">
            {/* Header Ringkas */}
            <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A] mb-1">
                {testInfo?.name || 'Asesmen Online'}
              </h1>
              <p className="text-xs text-[#64748B]">
                18 soal · {testInfo?.durationMinutes || 30} menit · Proctoring kamera aktif
              </p>
            </div>

            {isLocked ? (
              <div className="bg-red-50 border-l-[3px] border-[#DC2626] border-y border-r border-red-200 text-red-700 p-4 rounded-r-lg text-center space-y-3">
                <AlertCircle size={22} className="mx-auto text-[#DC2626]" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-semibold text-red-800">Sesi Terkunci Sementara</p>
                  <p className="text-xs text-red-600 mt-1">
                    {lockMessage || 'Terlalu banyak percobaan kode yang salah. Sesi dikunci selama 15 menit.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsLocked(false);
                    setOtpDigits(['', '', '', '', '', '']);
                    setAccessError(null);
                  }}
                  className="text-xs font-medium text-red-700 hover:text-red-900 underline underline-offset-2 cursor-pointer"
                >
                  Coba masukkan ulang
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-[#0F172A] mb-3 text-center">
                    Masukkan 6 Digit Kode Akses
                  </label>
                  
                  {/* 6 OTP Inputs */}
                  <div className="flex items-center justify-center gap-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="text"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        autoFocus={idx === 0}
                        className={`w-11 h-13 text-center text-xl font-mono font-semibold text-[#0F172A] rounded-lg border transition-colors outline-none ${
                          accessError 
                            ? 'border-[#DC2626] focus:border-[#DC2626] bg-red-50/30' 
                            : 'border-[#CBD5E1] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 bg-white'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Error message inline */}
                  {accessError && (
                    <p className="text-xs text-[#DC2626] text-center mt-2.5 flex items-center justify-center gap-1">
                      <AlertCircle size={14} strokeWidth={1.5} />
                      <span>{accessError}</span>
                    </p>
                  )}

                  {/* Helper text */}
                  <p className="text-[12px] text-[#64748B] text-center mt-3.5 leading-relaxed">
                    Kode akses diberikan oleh Tim HR. Sistem akan mengaktifkan kamera untuk pengawasan otomatis.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={verifyMutation.isPending || fullCode.length !== 6}
                  className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                >
                  {verifyMutation.isPending ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <span>Mulai Verifikasi</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Screen 2: Mandatory Camera Verification
  if (isAccessGranted && !cameraStepDone) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex items-center justify-center p-4 sm:p-6 font-sans">
        <canvas ref={canvasRef} className="hidden" />
        <div className="bg-white max-w-[560px] w-full rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.08)] relative overflow-hidden">
          
          {/* Top Blue Bar 4px */}
          <div className="h-1.5 bg-[#1D4ED8] w-full"></div>

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A] mb-1">
                Verifikasi Kamera
              </h1>
              <p className="text-sm text-[#64748B]">
                Kamera wajib aktif sebelum soal dapat ditampilkan demi validitas hasil asesmen.
              </p>
            </div>

            <div className="space-y-5">
              {/* Live Video Preview (4:3) */}
              <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-lg overflow-hidden border border-[#E2E8F0] flex items-center justify-center">
                <video 
                  ref={setPreviewVideoRef} 
                  className={`w-full h-full object-cover -scale-x-100 ${cameraStream ? 'block' : 'hidden'}`}
                  autoPlay 
                  muted 
                  playsInline 
                />

                {cameraStream ? (
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
                    <span>Kamera aktif</span>
                  </div>
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <VideoOff size={36} className="mx-auto mb-2 text-slate-500" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-300">Kamera Belum Terhubung</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Klik tombol "Aktifkan Kamera" di bawah dan izinkan akses peramban Anda.
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message if Denied */}
              {cameraError && (
                <div className="bg-red-50 border-l-[3px] border-[#DC2626] border-y border-r border-red-200 text-[#DC2626] p-3 rounded-r text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 text-[#DC2626] mt-0.5" strokeWidth={1.5} />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Checklist Syarat */}
              <div className="space-y-2 text-sm text-[#0F172A]">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#059669] shrink-0" strokeWidth={2} />
                  <span className="text-slate-700">Posisikan wajah berada di tengah layar preview kamera.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#059669] shrink-0" strokeWidth={2} />
                  <span className="text-slate-700">Kerjakan secara mandiri tanpa bantuan pihak ketiga.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-[#059669] shrink-0" strokeWidth={2} />
                  <span className="text-slate-700">Foto berkala diambil otomatis setiap 30 detik untuk pengawasan.</span>
                </div>
              </div>

              {/* Peringatan Larangan Pindah Tab (Kuning 3px accent) */}
              <div className="bg-[#FFFBEB] border-l-[3px] border-[#D97706] border-y border-r border-amber-200 p-3.5 text-xs text-slate-800 rounded-r">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-0.5">
                  <AlertTriangle size={14} className="text-[#D97706] shrink-0" strokeWidth={1.5} />
                  <span>Larangan Pindah Tab / Jendela</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Dilarang meninggalkan jendela atau berpindah tab. Setiap perpindahan akan dicatat secara otomatis dalam laporan integritas.
                </p>
              </div>

              {/* Tombol Utama */}
              <div className="pt-2 space-y-2">
                {!cameraStream ? (
                  <button
                    type="button"
                    onClick={requestCameraAccess}
                    disabled={isRequestingCamera}
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isRequestingCamera ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Meminta Izin Kamera...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={16} strokeWidth={1.5} />
                        <span>Aktifkan Kamera</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startTestAfterCamera}
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Mulai Mengerjakan</span>
                    <ArrowRight size={16} strokeWidth={1.5} />
                  </button>
                )}

                {cameraStream && (
                  <button
                    type="button"
                    onClick={requestCameraAccess}
                    className="w-full py-1.5 text-xs text-[#64748B] hover:text-[#0F172A] transition-colors text-center cursor-pointer"
                  >
                    Ganti kamera
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Screen 3: Taking the Test
  if (isQuestionsLoading || !testsData) {
    return (
      <div className="min-h-screen bg-[#EEF2F7] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 max-w-sm w-full text-center space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[#64748B] font-medium">Menyiapkan butir soal asesmen...</p>
        </div>
      </div>
    );
  }

  const questions = questionsData || [];
  const currentQ = questions[currentQuestionIndex];
  const testInfo = testsData.find((t: any) => t.id === testId);
  const totalCount = questions.length;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const unansweredCount = Math.max(0, totalCount - answeredCount);
  const progressPercent = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;
  
  // Timer thresholds
  const isCriticalTime = timeLeft !== null && timeLeft < 60; // < 1 min: Red & Pulsing
  const isWarningTime = timeLeft !== null && timeLeft < 300 && timeLeft >= 60; // < 5 mins: Yellow

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col font-sans select-none relative pb-16">
      <canvas ref={canvasRef} className="hidden" />

      {/* ========================================================================= */}
      {/* UNIFIED MODAL SYSTEM                                                      */}
      {/* ========================================================================= */}

      {/* 1. MODAL: Konfirmasi Selesai & Kumpulkan */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[440px] w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#0F172A]">
            {/* Top 4px Bar: Blue */}
            <div className="h-1 bg-[#2563EB] absolute top-0 left-0 right-0"></div>

            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center mx-auto mb-3">
              <Send size={22} strokeWidth={1.5} />
            </div>

            <h2 className="text-lg font-semibold text-center text-[#0F172A] mb-1">
              Kumpulkan Jawaban Sekarang?
            </h2>
            <p className="text-xs text-[#64748B] text-center mb-4">
              Periksa kembali status pengerjaan soal Anda sebelum mengakhiri sesi asesmen.
            </p>

            {/* 4 Summary Chips */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 text-center">
                <span className="block text-[11px] text-slate-500 font-medium">Total Soal</span>
                <span className="text-sm font-bold text-slate-800">{totalCount}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                <span className="block text-[11px] text-emerald-600 font-medium">Sudah Dijawab</span>
                <span className="text-sm font-bold text-[#059669]">{answeredCount}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                <span className="block text-[11px] text-amber-600 font-medium">Ragu-ragu</span>
                <span className="text-sm font-bold text-[#D97706]">{flaggedCount}</span>
              </div>
              <div className={`rounded-lg p-2 text-center border ${unansweredCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-100 border-slate-200'}`}>
                <span className={`block text-[11px] font-medium ${unansweredCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Belum Dijawab</span>
                <span className={`text-sm font-bold ${unansweredCount > 0 ? 'text-[#DC2626]' : 'text-slate-800'}`}>{unansweredCount}</span>
              </div>
            </div>

            {/* Unanswered Warning Strip */}
            {unansweredCount > 0 && (
              <div className="bg-amber-50 border-l-[3px] border-[#D97706] p-2.5 rounded-r text-xs text-amber-900 mb-5 flex items-start gap-2">
                <AlertTriangle size={14} className="text-[#D97706] shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>Masih ada <strong>{unansweredCount} butir soal</strong> yang belum dijawab. Jawaban yang kosong akan dihitung sebagai salah.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Periksa Lagi
              </button>
              <button
                type="button"
                onClick={executeFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <span>Ya, Kumpulkan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL: Peringatan Pindah Tab (Kuning -> Merah pada count >= 3) */}
      {showTabWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[440px] w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#0F172A]">
            {/* Top 4px Bar: Yellow if < 3, Red if >= 3 */}
            <div className={`h-1 absolute top-0 left-0 right-0 ${tabSwitchCount >= 3 ? 'bg-[#DC2626]' : 'bg-[#D97706]'}`}></div>

            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 border ${
              tabSwitchCount >= 3 
                ? 'bg-rose-50 text-[#DC2626] border-rose-200' 
                : 'bg-amber-50 text-[#D97706] border-amber-200'
            }`}>
              {tabSwitchCount >= 3 ? <AlertOctagon size={24} strokeWidth={1.5} /> : <AlertTriangle size={24} strokeWidth={1.5} />}
            </div>

            <h2 className="text-lg font-semibold text-center text-[#0F172A] mb-1">
              Terdeteksi Berpindah Tab ({tabSwitchCount})
            </h2>
            <p className="text-xs text-[#64748B] text-center mb-4">
              Sistem mendeteksi bahwa Anda meninggalkan jendela atau tab ujian. Aktivitas ini dicatat secara otomatis dalam log integritas untuk evaluasi tim HR.
            </p>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 mb-5 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Pelanggaran Pindah Tab:</span>
                <span className={`font-semibold ${tabSwitchCount >= 3 ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>{tabSwitchCount} kali</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Kamera Pengawasan:</span>
                <span className="font-medium text-[#059669] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Kamera Aktif & Merekam
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTabWarningModal(false)}
              className={`w-full py-2.5 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-xs cursor-pointer ${
                tabSwitchCount >= 3 ? 'bg-[#DC2626] hover:bg-red-700' : 'bg-[#D97706] hover:bg-amber-700'
              }`}
            >
              Lanjutkan Tes
            </button>
          </div>
        </div>
      )}

      {/* 3. MODAL: Waktu Hampir Habis (Kuning - 5 Mins & 1 Min) */}
      {showTimeWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[440px] w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#0F172A]">
            {/* Top 4px Bar: Yellow */}
            <div className="h-1 bg-[#D97706] absolute top-0 left-0 right-0"></div>

            <div className="w-12 h-12 rounded-full bg-amber-50 text-[#D97706] border border-amber-200 flex items-center justify-center mx-auto mb-3">
              <Clock size={24} strokeWidth={1.5} />
            </div>

            <h2 className="text-lg font-semibold text-center text-[#0F172A] mb-1">
              Sisa Waktu {timeWarningMinutes} Menit
            </h2>
            <p className="text-xs text-[#64748B] text-center mb-5 leading-relaxed">
              Waktu pengerjaan tes Anda tersisa <strong>{timeWarningMinutes} menit</strong> lagi. Pastikan seluruh soal telah terjawab sebelum sistem mengumpulkan jawaban secara otomatis.
            </p>

            <button
              type="button"
              onClick={() => setShowTimeWarningModal(false)}
              className="w-full py-2.5 bg-[#D97706] hover:bg-amber-700 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Lanjutkan Mengerjakan
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL: Waktu Habis (Merah - Auto Submit 10s Countdown) */}
      {showTimeOutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[440px] w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#0F172A]">
            {/* Top 4px Bar: Red */}
            <div className="h-1 bg-[#DC2626] absolute top-0 left-0 right-0"></div>

            <div className="w-12 h-12 rounded-full bg-rose-50 text-[#DC2626] border border-rose-200 flex items-center justify-center mx-auto mb-3 animate-pulse">
              <AlertCircle size={24} strokeWidth={1.5} />
            </div>

            <h2 className="text-lg font-semibold text-center text-[#0F172A] mb-1">
              Waktu Pengerjaan Habis
            </h2>
            <p className="text-xs text-[#64748B] text-center mb-4 leading-relaxed">
              Batas waktu pengerjaan telah berakhir. Seluruh jawaban Anda sedang dikumpulkan secara otomatis ke server.
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-5 text-center">
              <span className="text-xs text-rose-800 font-medium">Mengumpulkan otomatis dalam</span>
              <div className="text-xl font-bold font-mono text-[#DC2626] mt-0.5">
                {autoSubmitCountdown} detik
              </div>
            </div>

            <button
              type="button"
              onClick={executeFinalSubmit}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#DC2626] hover:bg-red-700 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Mengirimkan Jawaban...</span>
                </>
              ) : (
                <span>Kumpulkan Sekarang</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL: Kamera Bermasalah (Merah) */}
      {showCameraErrorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[440px] w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#0F172A]">
            {/* Top 4px Bar: Red */}
            <div className="h-1 bg-[#DC2626] absolute top-0 left-0 right-0"></div>

            <div className="w-12 h-12 rounded-full bg-rose-50 text-[#DC2626] border border-rose-200 flex items-center justify-center mx-auto mb-3">
              <VideoOff size={24} strokeWidth={1.5} />
            </div>

            <h2 className="text-lg font-semibold text-center text-[#0F172A] mb-1">
              Kamera Tidak Terdeteksi
            </h2>
            <p className="text-xs text-[#64748B] text-center mb-5 leading-relaxed">
              Akses kamera diperlukan untuk sistem pengawasan proctoring. Pastikan webcam terpasang dan izin kamera telah diberikan pada peramban Anda.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={requestCameraAccess}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={() => setShowCameraErrorModal(false)}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                Tutup & Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Konfirmasi Keluar Halaman (Kuning) */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[440px] w-full p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#0F172A]">
            {/* Top 4px Bar: Yellow */}
            <div className="h-1 bg-[#D97706] absolute top-0 left-0 right-0"></div>

            <div className="w-12 h-12 rounded-full bg-amber-50 text-[#D97706] border border-amber-200 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} strokeWidth={1.5} />
            </div>

            <h2 className="text-lg font-semibold text-center text-[#0F172A] mb-1">
              Tinggalkan Halaman Ujian?
            </h2>
            <p className="text-xs text-[#64748B] text-center mb-5 leading-relaxed">
              Tes sedang berlangsung. Meninggalkan halaman dapat menyebabkan sesi terkunci atau tercatat sebagai pelanggaran integritas.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false);
                  window.history.back();
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Proctoring Camera (160px, bottom-right) */}
      <div className="fixed bottom-4 right-4 z-40 w-40 aspect-[4/3] rounded-lg overflow-hidden shadow-lg border border-slate-300 bg-slate-950">
        <video 
          ref={setFloatingVideoRef} 
          className="w-full h-full object-cover -scale-x-100" 
          autoPlay 
          muted 
          playsInline 
        />
        <div className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-medium text-white flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse"></span>
          <span>Proctoring aktif</span>
        </div>

        {tabSwitchCount > 0 && (
          <div className="absolute bottom-1.5 right-1.5 bg-[#DC2626]/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
            {tabSwitchCount}x Pindah Tab
          </div>
        )}
      </div>

      {/* Solid Blue Header Bar (Height 64px, #1D4ED8) */}
      <header className="bg-[#1D4ED8] text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-white truncate max-w-[200px] sm:max-w-md">
              {testInfo?.name || 'Asesmen Online'}
            </h1>
            <p className="text-xs text-blue-200 font-mono">
              Sesi: {sessionId?.slice(0, 8)}...
            </p>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Timer */}
            <div 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm sm:text-base font-semibold border transition-all ${
                isCriticalTime
                  ? 'bg-[#DC2626] text-white border-red-300/40 animate-pulse shadow-sm shadow-red-500/20'
                  : isWarningTime
                  ? 'bg-[#D97706] text-white border-amber-300/40'
                  : 'bg-[#1E40AF] text-white border-blue-400/30'
              }`}
              aria-live="polite"
            >
              <Clock size={16} strokeWidth={1.5} className="text-white shrink-0" />
              <span>{timeLeft !== null ? formatTime(timeLeft) : '--:--'}</span>
            </div>

            {/* Selesai & Kumpulkan (Putih Outline) */}
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="border border-white/80 text-white hover:bg-white/15 active:bg-white/20 text-xs sm:text-sm font-medium rounded-lg px-3.5 py-1.5 transition-colors cursor-pointer"
            >
              Selesai & Kumpulkan
            </button>
          </div>
        </div>

        {/* Thin Blue Progress Bar (Shows % Answered) */}
        <div className="w-full bg-[#1E40AF] h-1.5 overflow-hidden">
          <div 
            className="bg-[#60A5FA] h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Content Area (Two Columns) */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-6 items-start">
        
        {/* Left Column: Question Area */}
        <div className="flex-1 w-full flex flex-col">
          {currentQ ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] border-l-[3px] border-l-[#2563EB] p-6 sm:p-7 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
              
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <span className="text-sm font-medium text-[#64748B]">
                  Soal {currentQuestionIndex + 1} dari {questions.length}
                </span>
                <div>
                  {getCategoryBadge(currentQ.category)}
                </div>
              </div>

              {/* Question Text */}
              <div className="my-4">
                <h2 className="text-base sm:text-lg text-[#0F172A] font-semibold leading-relaxed">
                  {currentQ.questionText}
                </h2>
              </div>

              {/* Options List */}
              <div className="space-y-3 mt-6" role="radiogroup" aria-label={`Pilihan untuk soal ${currentQuestionIndex + 1}`}>
                {currentQ.options?.map((opt: any, optIdx: number) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  const optionLetters = ['A', 'B', 'C', 'D', 'E'];
                  const letter = optionLetters[optIdx] || (optIdx + 1);

                  return (
                    <label 
                      key={opt.id} 
                      className={`flex items-center p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[#2563EB] ${
                        isSelected 
                          ? 'border-2 border-[#2563EB] bg-[#EFF6FF] shadow-xs' 
                          : 'border-[#E2E8F0] hover:bg-[#F1F5F9] bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(currentQ.id, opt.id)}
                        className="sr-only"
                      />
                      
                      {/* Option Letter Circle */}
                      <div className={`w-7 h-7 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 mr-3.5 transition-colors ${
                        isSelected 
                          ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-xs' 
                          : 'border-slate-300 text-[#0F172A] bg-slate-100'
                      }`}>
                        {letter}
                      </div>

                      {/* Option Text */}
                      <span className={`text-sm leading-snug flex-1 ${isSelected ? 'text-[#1E3A8A] font-semibold' : 'text-[#0F172A]'}`}>
                        {opt.optionText}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
              Tidak ada butir soal yang ditemukan.
            </div>
          )}

          {/* Navigation Controls under Question */}
          <div className="flex items-center justify-between mt-5 gap-2">
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] text-xs sm:text-sm font-medium hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              <ChevronLeft size={16} strokeWidth={1.5} /> 
              <span>Sebelumnya</span>
            </button>
            
            {/* Tombol Tandai Ragu-ragu */}
            {currentQ && (
              <button
                type="button"
                onClick={() => toggleFlagQuestion(currentQ.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                  flaggedQuestions[currentQ.id]
                    ? 'border-[#D97706] bg-amber-50 text-[#D97706]'
                    : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-slate-50'
                }`}
              >
                <Flag size={14} className={flaggedQuestions[currentQ.id] ? 'text-[#D97706] fill-[#D97706]' : 'text-slate-400'} strokeWidth={1.5} />
                <span>{flaggedQuestions[currentQ.id] ? 'Ditandai Ragu' : 'Tandai Ragu-ragu'}</span>
              </button>
            )}

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#2563EB] text-white text-xs sm:text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs cursor-pointer"
              >
                <span>Selesai</span>
                <CheckCircle size={16} strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(p => Math.min(questions.length - 1, p + 1))}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#2563EB] text-white text-xs sm:text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight size={16} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Mobile Navigation Drawer Toggle */}
          <div className="block md:hidden mt-4">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="w-full py-2.5 px-4 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] text-xs font-semibold flex items-center justify-between shadow-xs cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ListOrdered size={16} className="text-[#2563EB]" />
                <span>Navigasi Soal ({answeredCount}/{totalCount} Terjawab)</span>
              </span>
              <span>{isMobileNavOpen ? 'Tutup ▲' : 'Buka ▼'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Question Grid Navigation (Desktop Sticky / Mobile Collapsible) */}
        <div className={`w-full md:w-80 shrink-0 ${isMobileNavOpen ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.08)] sticky top-20 overflow-hidden">
            
            {/* Header Biru Muda #DBEAFE */}
            <div className="bg-[#DBEAFE] text-[#1E3A8A] font-semibold px-4 py-3.5 border-b border-blue-200/80 flex items-center justify-between text-xs sm:text-sm">
              <h3 className="font-bold">Daftar Nomor Soal</h3>
              <span className="text-[11px] font-medium bg-blue-100 text-[#1D4ED8] px-2 py-0.5 rounded-full">
                {answeredCount}/{totalCount} Terjawab
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Question Grid Buttons (Filled per state) */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q: any, idx: number) => {
                  const isAnswered = !!answers[q.id];
                  const isFlagged = !!flaggedQuestions[q.id];
                  const isCurrent = idx === currentQuestionIndex;
                  
                  let btnStyle = "w-full aspect-square text-xs font-bold rounded-lg flex items-center justify-center transition-all cursor-pointer ";
                  
                  if (isCurrent) {
                    btnStyle += "ring-2 ring-[#1D4ED8] ring-offset-1 z-10 scale-105 shadow-xs ";
                  }
                  
                  if (isFlagged) {
                    btnStyle += "bg-[#D97706] text-white hover:bg-amber-700";
                  } else if (isAnswered) {
                    btnStyle += "bg-[#059669] text-white hover:bg-emerald-700";
                  } else {
                    btnStyle += "bg-[#E2E8F0] text-[#0F172A] hover:bg-slate-300";
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        setIsMobileNavOpen(false);
                      }}
                      className={btnStyle}
                      title={`Soal ${idx + 1}: ${isFlagged ? 'Ragu-ragu' : isAnswered ? 'Sudah dijawab' : 'Belum dijawab'}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              
              {/* Colored Legend */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-[#059669] shrink-0 shadow-xs"></span>
                  <span className="text-slate-600">Sudah dijawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-[#D97706] shrink-0 shadow-xs"></span>
                  <span className="text-slate-600">Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-[#E2E8F0] border border-slate-300 shrink-0"></span>
                  <span className="text-slate-600">Belum dijawab</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
