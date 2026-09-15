import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Laptop,
  Tablet,
  Smartphone,
  Eye,
  FileWarning,
  Lock,
  Download,
  Volume2,
  VolumeX,
  ScanFace,
  ShieldAlert,
  Fingerprint,
  Smile,
  ShieldOff
} from 'lucide-react';
import { User, AccessPhotoRecord } from '../types';
import {
  detectDeviceType,
  playCameraShutterSound,
  announcePhotoCaptureVoice,
  downloadPhotoFile,
  analyzeFrameBiometrics,
  BiometricValidationResult,
  captureAndWatermarkFrame,
  generateSimulatedEntranceSnapshot,
  verifyCapturedPhotoWithServer
} from '../utils/camera';
import { generateSHA256Hash } from '../utils/security';

interface EntranceCameraModalProps {
  user: User;
  onConfirm: (photoRecord: AccessPhotoRecord) => void;
  onCancel: () => void;
}

export const EntranceCameraModal: React.FC<EntranceCameraModalProps> = ({
  user,
  onConfirm,
  onCancel,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(1);
  const [flashActive, setFlashActive] = useState(false);
  const [deviceType] = useState<'Notebook' | 'Tablet' | 'Dispositivo Móvel' | 'Desktop'>(() => detectDeviceType());
  const [photoRecord, setPhotoRecord] = useState<AccessPhotoRecord | null>(null);

  // Biometric sharpness & face detection state
  const [liveValidation, setLiveValidation] = useState<BiometricValidationResult | null>(null);
  const [capturedValidation, setCapturedValidation] = useState<BiometricValidationResult | null>(null);
  const [isVerifyingBiometrics, setIsVerifyingBiometrics] = useState<boolean>(false);

  // Auto-download state
  const [isAutoDownloaded, setIsAutoDownloaded] = useState<boolean>(false);
  const [downloadedFileName, setDownloadedFileName] = useState<string | null>(null);
  const [autoEntranceCountdown, setAutoEntranceCountdown] = useState<number | null>(null);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const liveCheckIntervalRef = useRef<number | null>(null);
  const autoEntranceIntervalRef = useRef<number | null>(null);

  // Initialize camera stream and voice announcement
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        setCameraError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Navegador não possui suporte para acesso à câmera.');
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }

        // Voice announcement: explicitly tells the user that the photo is being taken
        if (voiceAlertsEnabled) {
          setTimeout(() => {
            announcePhotoCaptureVoice(
              `Atenção operador ${user.name.split(' ')[0]}. Foto de validação biométrica de acesso hospitalar em andamento. Olhe diretamente para a câmera e mantenha o rosto nítido.`
            );
          }, 350);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao inicializar câmera.';
        console.warn('Camera access denied or unavailable:', errorMsg);
        setCameraError(
          'Permissão de câmera não concedida ou dispositivo sem câmera conectada. O acesso hospitalar exige identificação do operador.'
        );
        setCountdown(null);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (liveCheckIntervalRef.current) {
        clearInterval(liveCheckIntervalRef.current);
      }
    };
  }, [user.name, voiceAlertsEnabled]);

  // Sync stream to video element when ready
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Live real-time biometric analysis of the video stream
  useEffect(() => {
    if (!stream || capturedPhotoUrl || cameraError) {
      if (liveCheckIntervalRef.current) {
        clearInterval(liveCheckIntervalRef.current);
      }
      return;
    }

    liveCheckIntervalRef.current = window.setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const result = await analyzeFrameBiometrics(videoRef.current);
          setLiveValidation(result);
        } catch {
          // Keep previous result
        }
      }
    }, 280);

    return () => {
      if (liveCheckIntervalRef.current) {
        clearInterval(liveCheckIntervalRef.current);
      }
    };
  }, [stream, capturedPhotoUrl, cameraError]);

  // Handle countdown for automatic capture
  useEffect(() => {
    if (countdown === null || capturedPhotoUrl || cameraError) return;

    if (countdown > 0) {
      countdownIntervalRef.current = window.setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      takeSnapshot();
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearTimeout(countdownIntervalRef.current);
      }
    };
  }, [countdown, capturedPhotoUrl, cameraError]);

  // Automatic entrance countdown effect once valid photo is captured and downloaded
  useEffect(() => {
    if (autoEntranceCountdown === null) return;

    if (autoEntranceCountdown > 0) {
      autoEntranceIntervalRef.current = window.setTimeout(() => {
        setAutoEntranceCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (autoEntranceCountdown === 0) {
      if (photoRecord && capturedValidation?.isValid) {
        onConfirm(photoRecord);
      }
    }

    return () => {
      if (autoEntranceIntervalRef.current) {
        clearTimeout(autoEntranceIntervalRef.current);
      }
    };
  }, [autoEntranceCountdown, photoRecord, capturedValidation, onConfirm]);

  const takeSnapshot = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    const now = new Date();
    const formattedTimestamp = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const hashPayload = `${user.id}_${now.getTime()}_${user.registrationNumber}_${deviceType}`;
    const hashProof = generateSHA256Hash(hashPayload);

    // Play camera shutter sound
    playCameraShutterSound();

    // Trigger visual flash
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 220);

    let photoDataUrl = '';
    let validation: BiometricValidationResult = {
      isValid: false,
      faceDetected: false,
      isSharp: false,
      sharpnessScore: 0,
      brightnessScore: 0,
      contrastScore: 0,
      faceAreaPercentage: 0,
      eyesDetected: false,
      noseDetected: false,
      mouthDetected: false,
      isHandOrFingers: false,
      isSpoofDetected: false,
      livenessScore: 0,
      message: 'Câmera inacessível.',
    };

    if (videoRef.current && stream && !cameraError) {
      // 1. First-pass real-time local CV analysis (checks hands, sharp focus, face frame)
      const localResult = await analyzeFrameBiometrics(videoRef.current);
      validation = localResult;

      photoDataUrl = captureAndWatermarkFrame(
        videoRef.current,
        {
          userName: user.name,
          userRoleTitle: user.roleTitle,
          registrationNumber: user.registrationNumber,
          timestamp: formattedTimestamp,
          deviceType,
          hashProof,
        },
        validation
      );

      // 2. High-precision server-side AI audit (fast sub-second multimodal biometrics)
      // Only invoke if local validation is valid; if local CV already caught an issue, reject instantly!
      if (localResult.isValid) {
        setIsVerifyingBiometrics(true);
        try {
          const serverResult = await verifyCapturedPhotoWithServer(photoDataUrl, user.name, localResult);
          validation = serverResult;

          // Re-generate final watermarked snapshot with authoritative validation status
          if (videoRef.current) {
            photoDataUrl = captureAndWatermarkFrame(
              videoRef.current,
              {
                userName: user.name,
                userRoleTitle: user.roleTitle,
                registrationNumber: user.registrationNumber,
                timestamp: formattedTimestamp,
                deviceType,
                hashProof,
              },
              validation
            );
          }
        } catch (err) {
          console.warn('Backend biometrics verification error:', err);
        } finally {
          setIsVerifyingBiometrics(false);
        }
      }

      setCapturedValidation(validation);
    } else {
      setCapturedValidation({
        isValid: false,
        faceDetected: false,
        isSharp: false,
        sharpnessScore: 0,
        brightnessScore: 0,
        contrastScore: 0,
        faceAreaPercentage: 0,
        eyesDetected: false,
        noseDetected: false,
        mouthDetected: false,
        isHandOrFingers: false,
        isSpoofDetected: false,
        livenessScore: 0,
        message: 'Câmera não conectada ou permissão negada.',
        failureReason: 'CAMERA_BLOCKED',
      });
    }

    // Fallback if camera completely failed
    if (!photoDataUrl) {
      photoDataUrl = generateSimulatedEntranceSnapshot(
        {
          userName: user.name,
          userRoleTitle: user.roleTitle,
          registrationNumber: user.registrationNumber,
          timestamp: formattedTimestamp,
          deviceType,
          hashProof,
        },
        cameraError ? 'DENIED' : 'UNAVAILABLE'
      );
    }

    const record: AccessPhotoRecord = {
      id: `photo_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: formattedTimestamp,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userRoleTitle: user.roleTitle,
      registrationNumber: user.registrationNumber,
      photoDataUrl,
      deviceType,
      status: stream && !cameraError && validation.isValid ? 'CAPTURED_SUCCESS' : 'PERMISSION_DENIED',
      hashProof,
      ipAddress: '10.240.12.84 (Subnet Segura)',
      userAgent: navigator.userAgent,
      sharpnessScore: validation.sharpnessScore,
      faceDetected: validation.faceDetected,
      isSharp: validation.isSharp,
      eyesVisible: validation.eyesDetected,
      noseVisible: validation.noseDetected,
      mouthVisible: validation.mouthDetected,
      isSpoofOrPresentation: validation.isSpoofDetected,
      isHandOrObject: validation.isHandOrFingers,
      livenessConfirmed: validation.isValid,
      biometricValidationMessage: validation.message,
    };

    setCapturedPhotoUrl(photoDataUrl);
    setPhotoRecord(record);
    setIsCapturing(false);

    // AUTOMATIC DOWNLOAD: Download IMMEDIATELY ONLY when face is valid and verified!
    // If a hand, spoof or invalid face was captured, NO auto-download is performed!
    if (validation.isValid && photoDataUrl) {
      const sanitizedName = user.name.replace(/\s+/g, '_').toLowerCase();
      const sanitizedReg = user.registrationNumber.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const fileName = `foto_acesso_${sanitizedName}_${sanitizedReg}_${dateStr}_${timeStr}.jpg`;

      downloadPhotoFile(photoDataUrl, fileName);
      setIsAutoDownloaded(true);
      setDownloadedFileName(fileName);
      // Auto-enter in 1 second once captured and downloaded (ultra-fast, strictly < 3s)
      setAutoEntranceCountdown(1);
    } else {
      setIsAutoDownloaded(false);
      setDownloadedFileName(null);
      setAutoEntranceCountdown(null);
    }

    // Voice feedback on result with exact cause
    if (voiceAlertsEnabled) {
      if (validation.isValid) {
        announcePhotoCaptureVoice('Foto validada e baixada com sucesso no seu dispositivo. Rosto humano autêntico identificado.');
      } else {
        if (validation.failureReason === 'HAND_DETECTED') {
          announcePhotoCaptureVoice('Foto não aceita. Foi detectada uma mão em vez de um rosto. O sistema exige a face humana completa.');
        } else if (validation.failureReason === 'SCREEN_OR_PAPER_SPOOF') {
          announcePhotoCaptureVoice('Foto recusada. Foto de tela ou papel detectada. Reproduções não são aceitas.');
        } else if (validation.failureReason === 'EYES_MISSING') {
          announcePhotoCaptureVoice('Foto recusada. Olhos não visíveis. Mantenha os olhos abertos e descobertos.');
        } else if (validation.failureReason === 'NOSE_MISSING') {
          announcePhotoCaptureVoice('Foto recusada. Nariz não visível ou encoberto.');
        } else if (validation.failureReason === 'MOUTH_MISSING') {
          announcePhotoCaptureVoice('Foto recusada. Boca encoberta. Remova máscaras ou objetos da boca.');
        } else if (validation.failureReason === 'BLURRY') {
          announcePhotoCaptureVoice('Foto recusada por desfoque. Mantenha a cabeça firme.');
        } else {
          announcePhotoCaptureVoice('Foto não aceita. É obrigatório um rosto humano nítido para entrar.');
        }
      }
    }

    // Turn off camera tracks once snapshot is completed
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleRetake = async () => {
    if (autoEntranceIntervalRef.current) {
      clearTimeout(autoEntranceIntervalRef.current);
    }
    setAutoEntranceCountdown(null);
    setIsAutoDownloaded(false);
    setDownloadedFileName(null);
    setCapturedPhotoUrl(null);
    setPhotoRecord(null);
    setCapturedValidation(null);
    setCountdown(1);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
      if (voiceAlertsEnabled) {
        announcePhotoCaptureVoice('Nova tentativa de captura. Mantenha o rosto nítido em frente à câmera.');
      }
    } catch {
      setCameraError('Não foi possível reiniciar a câmera.');
    }
  };

  const handleDownloadCurrentPhoto = () => {
    if (!capturedPhotoUrl) return;
    const sanitizedReg = user.registrationNumber.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = downloadedFileName || `acesso_hospitalar_${sanitizedReg}_${new Date().toISOString().slice(0, 10)}.jpg`;
    downloadPhotoFile(capturedPhotoUrl, fileName);
  };

  const handleConfirmEntrance = () => {
    if (autoEntranceIntervalRef.current) {
      clearTimeout(autoEntranceIntervalRef.current);
    }

    // STRICT VALIDATION CHECK: Must not allow entry without a sharp, detected face!
    if (!capturedValidation?.isValid) {
      alert(
        'ACESSO RECUSADO: A foto capturada não possui um rosto nítido ou identificado. Por exigência de segurança clínica e conformidade com o Art. 154-A do Código Penal, clique em "Tirar Outra Foto" e posicione seu rosto com nitidez em frente à câmera.'
      );
      return;
    }

    if (photoRecord) {
      // Ensure photo is downloaded as backup if not already done
      if (!isAutoDownloaded && photoRecord.photoDataUrl) {
        const sanitizedReg = user.registrationNumber.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `registro_entrada_${sanitizedReg}_${Date.now()}.jpg`;
        downloadPhotoFile(photoRecord.photoDataUrl, fileName);
        setIsAutoDownloaded(true);
      }

      onConfirm(photoRecord);
    }
  };

  return (
    <div
      id="modal-entrance-camera"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 p-3 sm:p-5 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Screen flash effect upon photo capture */}
      {flashActive && (
        <div className="fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-200" />
      )}

      <div className="relative w-full max-w-2xl rounded-3xl border border-sky-500/40 bg-slate-900/98 p-5 sm:p-7 shadow-2xl shadow-sky-950/50 text-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-inner">
              <Camera size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-sky-300 uppercase tracking-wider">
                  <ScanFace size={12} />
                  Validação Facial Obrigatória
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  {deviceType === 'Tablet' ? (
                    <Tablet size={13} className="text-teal-400" />
                  ) : deviceType === 'Dispositivo Móvel' ? (
                    <Smartphone size={13} className="text-teal-400" />
                  ) : (
                    <Laptop size={13} className="text-teal-400" />
                  )}
                  {deviceType}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black font-display tracking-tight text-white mt-0.5">
                Fotografia Biométrica com Rosto Nítido
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-right">
            <button
              type="button"
              onClick={() => setVoiceAlertsEnabled(!voiceAlertsEnabled)}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs transition"
              title={voiceAlertsEnabled ? 'Aviso por voz ativado' : 'Aviso por voz mudo'}
            >
              {voiceAlertsEnabled ? <Volume2 size={16} className="text-sky-400" /> : <VolumeX size={16} />}
            </button>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-200 block">{user.name}</span>
              <span className="text-[11px] font-mono text-sky-400">{user.registrationNumber}</span>
            </div>
          </div>
        </div>

        {/* Audible / Visual Spoken Alert Banner */}
        <div className="mt-3.5 rounded-2xl bg-sky-950/70 border border-sky-500/40 p-3.5 flex items-center justify-between text-xs text-sky-200 shadow-inner">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <div>
              <span className="font-bold text-white block">
                AVISO SONORO & VISUAL: A foto será tirada agora!
              </span>
              <span className="text-[11px] text-sky-300/90">
                Olhe diretamente para a câmera. <strong className="text-white">A foto só será aceita se houver um rosto nítido</strong> (sem borrão ou oclusão).
              </span>
            </div>
          </div>
        </div>

        {/* Viewfinder / Video or Captured Photo Section */}
        <div className="my-4 relative rounded-2xl overflow-hidden border-2 border-slate-800 bg-black aspect-video flex items-center justify-center shadow-2xl">
          
          {/* Biometric Verification In Progress Overlay */}
          {isVerifyingBiometrics && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 p-4 text-center">
              <div className="relative">
                <ScanFace size={52} className="text-sky-400 animate-pulse" />
                <div className="absolute -inset-2 border-2 border-sky-400/50 rounded-full animate-ping" />
              </div>
              <div className="text-sm font-bold text-white tracking-wide">
                Auditando Biometria Facial & Vivacidade
              </div>
              <div className="text-[11px] text-sky-300 font-mono max-w-sm">
                Inspecionando presença de olhos, nariz e boca • Verificando ausência de mãos e fotos de telas/papel...
              </div>
            </div>
          )}

          {/* If already captured photo */}
          {capturedPhotoUrl ? (
            <div className="relative w-full h-full">
              <img
                src={capturedPhotoUrl}
                alt="Foto capturada na entrada"
                className="w-full h-full object-cover"
              />

              {/* Status Badge Over Image */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                {capturedValidation?.isValid ? (
                  <div className="bg-emerald-600/95 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-emerald-400/40">
                    <CheckCircle2 size={15} />
                    ROSTO HUMANO VÁLIDO &bull; {capturedValidation.sharpnessScore}% NITIDEZ
                  </div>
                ) : (
                  <div className="bg-rose-600/95 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-rose-400/40 animate-pulse">
                    <XCircle size={15} />
                    {capturedValidation?.failureReason === 'HAND_DETECTED'
                      ? 'FOTO RECUSADA • MÃO DETECTADA'
                      : capturedValidation?.failureReason === 'SCREEN_OR_PAPER_SPOOF'
                      ? 'FOTO RECUSADA • TELA OU PAPEL'
                      : capturedValidation?.failureReason === 'EYES_MISSING'
                      ? 'FOTO RECUSADA • OLHOS COBERTOS'
                      : capturedValidation?.failureReason === 'MOUTH_MISSING'
                      ? 'FOTO RECUSADA • BOCA COBERTA'
                      : capturedValidation?.failureReason === 'NOSE_MISSING'
                      ? 'FOTO RECUSADA • NARIZ COBERTO'
                      : 'FOTO RECUSADA • SEM ROSTO NÍTIDO'}
                  </div>
                )}

                <div className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-full border border-slate-700">
                  {deviceType}
                </div>
              </div>

              {/* Quick Retake Button */}
              <button
                type="button"
                onClick={handleRetake}
                className="absolute bottom-3 right-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-100 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition backdrop-blur-xs shadow-lg active:scale-95"
              >
                <RotateCcw size={14} className="text-sky-400" />
                Tirar Outra Foto
              </button>

              {/* Download photo directly from preview */}
              {capturedValidation?.isValid && (
                <button
                  type="button"
                  onClick={handleDownloadCurrentPhoto}
                  className="absolute bottom-3 left-3 bg-sky-950/90 hover:bg-sky-900 border border-sky-500/50 text-sky-200 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition backdrop-blur-xs shadow-lg active:scale-95"
                  title="Baixar arquivo da foto agora"
                >
                  <Download size={14} className="text-sky-400" />
                  Baixar Foto (.jpg)
                </button>
              )}
            </div>
          ) : cameraError ? (
            /* Error / Permission Blocked View */
            <div className="p-6 text-center space-y-3 max-w-md">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle size={24} />
              </div>
              <div className="text-sm font-bold text-rose-300">Câmera Não Detectada / Bloqueada</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {cameraError}
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold px-4 py-2 transition"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Stream Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Biometric Framing Graphic with Dynamic Color based on Face/Sharpness */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`relative w-44 h-56 sm:w-56 sm:h-72 border-2 rounded-full transition-colors duration-200 flex flex-col items-center justify-center ${
                    liveValidation?.isHandOrFingers || liveValidation?.isSpoofDetected
                      ? 'border-rose-500 shadow-lg shadow-rose-500/30'
                      : liveValidation?.isValid
                      ? 'border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'border-dashed border-sky-400/80'
                  }`}
                >
                  {/* Corner Crosshairs */}
                  <div
                    className={`absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 ${
                      liveValidation?.isValid ? 'border-emerald-400' : 'border-sky-400'
                    }`}
                  />
                  <div
                    className={`absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 ${
                      liveValidation?.isValid ? 'border-emerald-400' : 'border-sky-400'
                    }`}
                  />
                  <div
                    className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 ${
                      liveValidation?.isValid ? 'border-emerald-400' : 'border-sky-400'
                    }`}
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 ${
                      liveValidation?.isValid ? 'border-emerald-400' : 'border-sky-400'
                    }`}
                  />
                  
                  <div
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full text-center shadow-md ${
                      liveValidation?.isHandOrFingers
                        ? 'bg-rose-600 text-white animate-pulse'
                        : liveValidation?.isSpoofDetected
                        ? 'bg-rose-600 text-white animate-pulse'
                        : liveValidation?.isValid
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-950/85 text-sky-300 border border-sky-400/30'
                    }`}
                  >
                    {liveValidation?.isHandOrFingers
                      ? 'MÃO DETECTADA — REMOVA A MÃO'
                      : liveValidation?.isSpoofDetected
                      ? 'REPRODUÇÃO DE TELA/PAPEL DETECTADA'
                      : liveValidation?.isValid
                      ? 'ROSTO NÍTIDO DETECTADO'
                      : 'ALINHE SEU ROSTO AQUI'}
                  </div>

                  {liveValidation?.isSharp && !liveValidation.isHandOrFingers && (
                    <span className="text-[9px] font-mono text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded mt-1">
                      Nitidez: {liveValidation.sharpnessScore}%
                    </span>
                  )}
                </div>
              </div>

              {/* Live Overlay: Status & Live Analysis */}
              <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-xs text-sky-300 border border-sky-500/30 text-[11px] font-mono px-3 py-1 rounded-full flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <span>CÂMERA ATIVA &bull; {deviceType.toUpperCase()}</span>
              </div>

              {/* Real-time Warning for Hand or Spoofing */}
              {liveValidation?.isHandOrFingers && (
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-rose-600/95 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-xl border border-rose-300 flex items-center gap-1.5 animate-bounce z-10">
                  <ShieldAlert size={14} />
                  MÃO DETECTADA! O SISTEMA EXIGE O ROSTO HUMANO
                </div>
              )}

              {liveValidation?.isSpoofDetected && (
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-rose-600/95 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-xl border border-rose-300 flex items-center gap-1.5 animate-bounce z-10">
                  <ShieldOff size={14} />
                  PROIBIDO: FOTO DE CELULAR OU PAPEL DETECTADA
                </div>
              )}

              {/* Real-time Quality Warning Pill if not compliant */}
              {liveValidation && !liveValidation.isValid && !liveValidation.isHandOrFingers && !liveValidation.isSpoofDetected && (
                <div className="absolute top-3 right-3 bg-amber-950/90 backdrop-blur-xs border border-amber-500/40 text-amber-200 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-md max-w-[220px] truncate">
                  {liveValidation.message}
                </div>
              )}

              {/* Automatic Countdown Badge */}
              {countdown !== null && countdown > 0 && (
                <div className="absolute center bg-sky-600/90 text-white font-mono font-black text-3xl h-16 w-16 rounded-full flex items-center justify-center shadow-2xl border-2 border-white animate-bounce">
                  {countdown}
                </div>
              )}

              {/* Manual Snapshot Button */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center">
                <button
                  type="button"
                  onClick={takeSnapshot}
                  disabled={isCapturing || isVerifyingBiometrics}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white px-6 py-2.5 text-xs font-bold shadow-lg shadow-sky-500/40 transition active:scale-95 disabled:opacity-50"
                >
                  <Camera size={16} />
                  <span>{isVerifyingBiometrics ? 'Verificando...' : 'Tirar Foto Agora'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Facial Landmarks & Anti-Spoofing Audit Checklist */}
        {(() => {
          const activeVal = capturedValidation || liveValidation;
          return (
            <div className="mb-3 rounded-2xl bg-slate-950/90 border border-slate-800 p-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-[11px]">
                  <ScanFace size={14} className="text-sky-400" />
                  <span>Inspeção Biométrica de Segurança (Marcos Faciais & Vivacidade)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {capturedValidation ? 'AUDITORIA DA FOTO' : 'AO VIVO'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {/* 1. Eyes */}
                <div
                  className={`p-2 rounded-xl border flex items-center gap-2 transition ${
                    activeVal?.eyesDetected
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <Eye size={14} className={activeVal?.eyesDetected ? 'text-emerald-400' : 'text-slate-500'} />
                  <div>
                    <div className="text-[10px] font-semibold">Olhos</div>
                    <div className="text-[9px] font-mono">
                      {activeVal?.eyesDetected ? '✓ Visíveis' : '✗ Não visíveis'}
                    </div>
                  </div>
                </div>

                {/* 2. Nose */}
                <div
                  className={`p-2 rounded-xl border flex items-center gap-2 transition ${
                    activeVal?.noseDetected
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <ScanFace size={14} className={activeVal?.noseDetected ? 'text-emerald-400' : 'text-slate-500'} />
                  <div>
                    <div className="text-[10px] font-semibold">Nariz</div>
                    <div className="text-[9px] font-mono">
                      {activeVal?.noseDetected ? '✓ Visível' : '✗ Ocluso/Ausente'}
                    </div>
                  </div>
                </div>

                {/* 3. Mouth */}
                <div
                  className={`p-2 rounded-xl border flex items-center gap-2 transition ${
                    activeVal?.mouthDetected
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <Smile size={14} className={activeVal?.mouthDetected ? 'text-emerald-400' : 'text-slate-500'} />
                  <div>
                    <div className="text-[10px] font-semibold">Boca</div>
                    <div className="text-[9px] font-mono">
                      {activeVal?.mouthDetected ? '✓ Visível' : '✗ Oclusa/Ausente'}
                    </div>
                  </div>
                </div>

                {/* 4. Anti-Hand Rejection */}
                <div
                  className={`p-2 rounded-xl border flex items-center gap-2 transition ${
                    activeVal?.isHandOrFingers
                      ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                      : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  <Fingerprint size={14} className={activeVal?.isHandOrFingers ? 'text-rose-400' : 'text-emerald-400'} />
                  <div>
                    <div className="text-[10px] font-semibold">Sem Mão</div>
                    <div className="text-[9px] font-mono">
                      {activeVal?.isHandOrFingers ? '✗ Mão detectada' : '✓ Aprovado'}
                    </div>
                  </div>
                </div>

                {/* 5. Anti-Spoofing Screen/Paper */}
                <div
                  className={`col-span-2 sm:col-span-1 p-2 rounded-xl border flex items-center gap-2 transition ${
                    activeVal?.isSpoofDetected
                      ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                      : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  <ShieldCheck size={14} className={activeVal?.isSpoofDetected ? 'text-rose-400' : 'text-emerald-400'} />
                  <div>
                    <div className="text-[10px] font-semibold">Sem Tela/Papel</div>
                    <div className="text-[9px] font-mono">
                      {activeVal?.isSpoofDetected ? '✗ Spoof detectado' : '✓ Vivacidade OK'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Validation Result Feedback Banner (When captured) */}
        {capturedValidation && (
          <div
            className={`rounded-2xl p-3.5 sm:p-4 text-xs space-y-2 border ${
              capturedValidation.isValid
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {capturedValidation.isValid ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-bold block text-white text-xs sm:text-sm">
                  {capturedValidation.isValid
                    ? 'Foto Validada: Rosto Humano Nítido Identificado com Sucesso'
                    : capturedValidation.failureReason === 'HAND_DETECTED'
                    ? 'Acesso Bloqueado: Mão ou Dedos Detectados'
                    : capturedValidation.failureReason === 'SCREEN_OR_PAPER_SPOOF'
                    ? 'Acesso Bloqueado: Reprodução em Tela ou Papel Detectada'
                    : capturedValidation.failureReason === 'EYES_MISSING'
                    ? 'Acesso Bloqueado: Olhos Não Identificados'
                    : capturedValidation.failureReason === 'NOSE_MISSING'
                    ? 'Acesso Bloqueado: Nariz Não Identificado'
                    : capturedValidation.failureReason === 'MOUTH_MISSING'
                    ? 'Acesso Bloqueado: Boca Não Identificada'
                    : 'Atenção: Foto Recusada — Rosto Fora do Padrão'}
                </span>
                <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                  {capturedValidation.message}
                </p>
                {!capturedValidation.isValid && (
                  <p className="text-[11px] font-semibold text-rose-300 mt-1">
                    ⚠️ O sistema <strong>NUNCA aceita mãos, fotos de celular, papel ou rostos oclusos</strong>. Olhos, boca e nariz devem estar nitidamente à mostra. Clique em <strong>"Tirar Outra Foto"</strong> para nova tentativa.
                  </p>
                )}
              </div>
            </div>

            {/* Auto-downloaded confirmation indicator */}
            {capturedValidation.isValid && isAutoDownloaded && (
              <div className="mt-2 pt-2 border-t border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-emerald-900/40 rounded-xl p-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <Download size={13} className="animate-bounce" />
                  </div>
                  <div className="text-[11px]">
                    <span className="font-bold text-white block">
                      Foto Baixada Automaticamente!
                    </span>
                    <span className="font-mono text-[10px] text-emerald-300 truncate max-w-[280px] sm:max-w-md block">
                      {downloadedFileName}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCurrentPhoto}
                  className="text-[10px] text-emerald-200 hover:text-white underline font-semibold shrink-0"
                >
                  Baixar Novamente
                </button>
              </div>
            )}

            {/* Auto entrance countdown */}
            {capturedValidation.isValid && autoEntranceCountdown !== null && (
              <div className="mt-2 flex items-center justify-between bg-sky-950/70 border border-sky-500/40 rounded-xl p-2 px-3 text-sky-200">
                <span className="text-[11px] font-medium flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                  Entrando automaticamente no sistema em <strong className="text-white text-xs font-mono">{autoEntranceCountdown}s</strong>...
                </span>
                <button
                  type="button"
                  onClick={() => setAutoEntranceCountdown(null)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono"
                >
                  Pausar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Legal & Compliance Notice + Download Status */}
        <div className="mt-3 rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5 text-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="h-4 w-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Download size={11} />
              </div>
              <span className="text-[11px] font-medium text-slate-200">
                <strong>Download Automático Ativo:</strong> A foto é salva imediatamente na pasta Downloads do dispositivo ao ser capturada com nitidez.
              </span>
            </div>
            {isAutoDownloaded && (
              <span className="shrink-0 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                ARQUIVO SALVO
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 text-slate-400 text-[11px] leading-relaxed">
            <FileWarning size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Art. 154-A do Código Penal:</strong> A captura fotográfica com validação biométrica garante a comprovação de autoria do acesso a prontuários médicos sigilosos. Acesso indevido ou burla é crime punível por lei.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2.5 text-xs font-semibold transition"
          >
            <XCircle size={16} />
            <span>Cancelar / Sair</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!capturedPhotoUrl && !cameraError && (
              <button
                type="button"
                onClick={takeSnapshot}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 px-4 py-2.5 text-xs font-bold transition"
              >
                <Camera size={15} />
                <span>Capturar Foto</span>
              </button>
            )}

            <button
              type="button"
              id="btn-confirm-entrance-photo"
              onClick={handleConfirmEntrance}
              disabled={!capturedPhotoUrl || !capturedValidation?.isValid}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold shadow-lg transition transform active:scale-95 ${
                capturedPhotoUrl && capturedValidation?.isValid
                  ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
              title={
                !capturedPhotoUrl
                  ? 'Capture a foto primeiro'
                  : !capturedValidation?.isValid
                  ? 'Não é permitido entrar sem um rosto nítido'
                  : 'Confirmar e entrar no sistema'
              }
            >
              <span>Confirmar & Entrar no Sistema</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
