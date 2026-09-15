// Camera utilities for Biometric Entrance Photo & Security Audit
import { generateSHA256Hash } from './security';

export function detectDeviceType(): 'Notebook' | 'Tablet' | 'Dispositivo Móvel' | 'Desktop' {
  if (typeof navigator === 'undefined') return 'Notebook';
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Tablet check
  const isTablet =
    /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua) ||
    ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 1 && window.innerWidth <= 1180 && window.innerWidth >= 600);
  
  if (isTablet) return 'Tablet';

  // Mobile smartphone check
  const isMobile = /(iphone|ipod|mobile|blackberry|iemobile|opera mini)/i.test(ua);
  if (isMobile) return 'Dispositivo Móvel';

  // Screen/User-Agent typical of laptop
  return 'Notebook';
}

export function playCameraShutterSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Two-tone mechanical camera shutter click simulation
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.04);
    gain1.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.05);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(600, audioCtx.currentTime + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.11);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(audioCtx.currentTime + 0.04);
    osc2.stop(audioCtx.currentTime + 0.12);
  } catch {
    // Audio might be muted or blocked by browser policy
  }
}

/**
 * Spoken voice alert using Web Speech API to clearly announce that a photo is being taken.
 */
export function announcePhotoCaptureVoice(message?: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // cancel previous queued speeches
    const textToSpeak = message || 'Atenção. Foto de validação biométrica sendo capturada. Olhe para a câmera e mantenha o rosto nítido.';
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Gracefully handle browsers blocking audio/speech
  }
}

/**
 * Downloads a data URL as an image file on the client's device.
 */
export function downloadPhotoFile(dataUrl: string, fileName: string): void {
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('Error triggering photo download:', err);
  }
}

export interface PhotoMetadata {
  userName: string;
  userRoleTitle: string;
  registrationNumber: string;
  timestamp: string;
  deviceType: string;
  hashProof: string;
}

export interface BiometricValidationResult {
  isValid: boolean;
  faceDetected: boolean;
  isSharp: boolean;
  sharpnessScore: number; // 0 - 100
  brightnessScore: number; // 0 - 100
  contrastScore: number; // 0 - 100
  faceAreaPercentage: number;
  eyesDetected: boolean;
  noseDetected: boolean;
  mouthDetected: boolean;
  isHandOrFingers: boolean;
  isSpoofDetected: boolean;
  livenessScore: number; // 0 - 100
  message: string;
  failureReason?:
    | 'NO_FACE'
    | 'HAND_DETECTED'
    | 'SCREEN_OR_PAPER_SPOOF'
    | 'EYES_MISSING'
    | 'NOSE_MISSING'
    | 'MOUTH_MISSING'
    | 'BLURRY'
    | 'TOO_DARK'
    | 'TOO_BRIGHT'
    | 'CAMERA_BLOCKED'
    | 'FACE_NOT_CENTERED';
}

/**
 * Analyzes video or canvas frame for face presence, framing, lighting and image sharpness (Laplacian variance).
 * Ensures that no photo is accepted without a clear, sharp, well-lit human face.
 */
export async function analyzeFrameBiometrics(
  source: HTMLVideoElement | HTMLCanvasElement
): Promise<BiometricValidationResult> {
  const width = source instanceof HTMLVideoElement ? source.videoWidth || 640 : source.width;
  const height = source instanceof HTMLVideoElement ? source.videoHeight || 480 : source.height;

  if (width === 0 || height === 0) {
    return {
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
      message: 'Câmera não iniciada ou sem sinal de vídeo.',
      failureReason: 'CAMERA_BLOCKED',
    };
  }

  // Downsample to 320x240 for high performance real-time computer vision analysis
  const sampleW = 320;
  const sampleH = 240;
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = sampleW;
  sampleCanvas.height = sampleH;
  const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return {
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
      message: 'Erro interno ao processar buffer de imagem.',
    };
  }

  ctx.drawImage(source, 0, 0, sampleW, sampleH);
  const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;

  // 1. Check native browser FaceDetector API if supported (Chromium Shape Detection API)
  let nativeFaceDetected = false;
  let nativeLandmarks: Array<{ type: string; locations?: Array<{ x: number; y: number }> }> = [];

  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const detectorClass = (window as unknown as {
        FaceDetector: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
          detect: (src: ImageBitmapSource) => Promise<Array<{
            boundingBox: { x: number; y: number; width: number; height: number };
            landmarks?: Array<{ type: string; locations?: Array<{ x: number; y: number }> }>;
          }>>;
        };
      }).FaceDetector;
      const detector = new detectorClass({ fastMode: false, maxDetectedFaces: 2 });
      const faces = await detector.detect(sampleCanvas);
      if (faces && faces.length > 0) {
        nativeFaceDetected = true;
        if (faces[0].landmarks) {
          nativeLandmarks = faces[0].landmarks;
        }
      }
    } catch {
      // Fallback to computer vision algorithm below
    }
  }

  // 2. Grayscale, Luminance & Histogram Analysis
  const gray = new Float32Array(sampleW * sampleH);
  const isSkin = new Uint8Array(sampleW * sampleH);
  let totalLum = 0;
  let skinPixelCount = 0;
  let centerRegionSkinCount = 0;
  let centerTotalPixels = 0;

  // Track skin bounding box
  let minSkinX = sampleW;
  let maxSkinX = 0;
  let minSkinY = sampleH;
  let maxSkinY = 0;

  // Central biometric zone bounding (where user face is supposed to be)
  const cXMin = Math.floor(sampleW * 0.20);
  const cXMax = Math.floor(sampleW * 0.80);
  const cYMin = Math.floor(sampleH * 0.12);
  const cYMax = Math.floor(sampleH * 0.88);

  for (let y = 0; y < sampleH; y++) {
    for (let x = 0; x < sampleW; x++) {
      const idx = (y * sampleW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Luminance Y
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[y * sampleW + x] = lum;
      totalLum += lum;

      // Human skin chromaticity filter
      const isSkinTone =
        r > 45 &&
        g > 35 &&
        b > 20 &&
        r > g &&
        r > b &&
        r - g >= 10 &&
        Math.abs(r - g) > 8 &&
        r + g + b > 110;

      if (isSkinTone) {
        isSkin[y * sampleW + x] = 1;
        skinPixelCount++;
        if (x >= cXMin && x <= cXMax && y >= cYMin && y <= cYMax) {
          centerRegionSkinCount++;
          if (x < minSkinX) minSkinX = x;
          if (x > maxSkinX) maxSkinX = x;
          if (y < minSkinY) minSkinY = y;
          if (y > maxSkinY) maxSkinY = y;
        }
      }

      if (x >= cXMin && x <= cXMax && y >= cYMin && y <= cYMax) {
        centerTotalPixels++;
      }
    }
  }

  const avgBrightness = totalLum / (sampleW * sampleH);
  const brightnessScore = Math.min(100, Math.max(0, Math.round((avgBrightness / 255) * 100)));

  // 3. Sharpness / Focus Analysis via Laplacian Variance
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let edgePointsCount = 0;

  for (let y = cYMin + 1; y < cYMax - 1; y++) {
    for (let x = cXMin + 1; x < cXMax - 1; x++) {
      const idx = y * sampleW + x;
      const center = gray[idx];
      const l =
        4 * center -
        gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - sampleW] -
        gray[idx + sampleW];

      laplacianSum += l;
      laplacianSqSum += l * l;
      edgePointsCount++;
    }
  }

  const laplacianMean = laplacianSum / Math.max(1, edgePointsCount);
  const laplacianVariance = laplacianSqSum / Math.max(1, edgePointsCount) - laplacianMean * laplacianMean;
  const sharpnessScore = Math.min(100, Math.max(0, Math.round((laplacianVariance / 85) * 100)));

  // 4. HAND & FINGER DISCRIMINATION (Anti-Hand Detector)
  // A hand with spread fingers exhibits alternating vertical finger columns with deep background gaps.
  // A human face exhibits a continuous convex oval with only 1 wide skin segment per horizontal row.
  let isHandOrFingers = false;
  const skinBoxW = maxSkinX > minSkinX ? maxSkinX - minSkinX : 0;
  const skinBoxH = maxSkinY > minSkinY ? maxSkinY - minSkinY : 0;

  if (skinBoxW >= 25 && skinBoxH >= 30) {
    let fingerSpikeRows = 0;
    // Sample across the upper 60% of the skin cluster where fingers typically protrude
    const testRows = [
      Math.floor(minSkinY + skinBoxH * 0.20),
      Math.floor(minSkinY + skinBoxH * 0.35),
      Math.floor(minSkinY + skinBoxH * 0.50),
      Math.floor(minSkinY + skinBoxH * 0.65),
    ];

    for (const rowY of testRows) {
      if (rowY >= 0 && rowY < sampleH) {
        let segments = 0;
        let inSkinSegment = false;
        let segmentWidth = 0;
        let gapWidth = 0;

        for (let x = minSkinX; x <= maxSkinX; x++) {
          const skinVal = isSkin[rowY * sampleW + x];
          if (skinVal === 1) {
            if (!inSkinSegment) {
              if (gapWidth >= 4 || segments === 0) {
                segments++;
              }
              inSkinSegment = true;
              segmentWidth = 1;
              gapWidth = 0;
            } else {
              segmentWidth++;
            }
          } else {
            if (inSkinSegment) {
              inSkinSegment = false;
              gapWidth = 1;
            } else {
              gapWidth++;
            }
          }
        }

        // If a row has 3 or more distinct skin segments (fingers separated by space), count it
        if (segments >= 3) {
          fingerSpikeRows++;
        }
      }
    }

    // If 2 or more rows show 3+ finger-like segments, this is unequivocally a hand, not a human face!
    if (fingerSpikeRows >= 2) {
      isHandOrFingers = true;
    }
  }

  // 5. FACIAL LANDMARK & TOPOLOGY VERIFICATION (Eyes, Nose, Mouth)
  // Check native landmarks first
  const hasNativeEyes = nativeLandmarks.filter((l) => l.type === 'eye').length >= 2;
  const hasNativeNose = nativeLandmarks.some((l) => l.type === 'nose');
  const hasNativeMouth = nativeLandmarks.some((l) => l.type === 'mouth');

  // Computer Vision Facial Topology Analysis inside candidate face box:
  // Face box coordinates (use detected skin cluster or center region)
  const faceXMin = Math.max(cXMin, minSkinX > 0 && minSkinX < maxSkinX ? minSkinX : cXMin);
  const faceXMax = Math.min(cXMax, maxSkinX > minSkinX ? maxSkinX : cXMax);
  const faceYMin = Math.max(cYMin, minSkinY > 0 && minSkinY < maxSkinY ? minSkinY : cYMin);
  const faceYMax = Math.min(cYMax, maxSkinY > minSkinY ? maxSkinY : cYMax);
  const faceW = Math.max(30, faceXMax - faceXMin);
  const faceH = Math.max(40, faceYMax - faceYMin);

  // A. Eyes Band (y: 26% to 45% of face height)
  // Evaluates bilateral eye sockets (darker) separated by brighter nose root in the middle
  const eyeBandY1 = Math.floor(faceYMin + faceH * 0.24);
  const eyeBandY2 = Math.floor(faceYMin + faceH * 0.46);
  const leftEyeX1 = Math.floor(faceXMin + faceW * 0.15);
  const leftEyeX2 = Math.floor(faceXMin + faceW * 0.42);
  const bridgeX1 = Math.floor(faceXMin + faceW * 0.44);
  const bridgeX2 = Math.floor(faceXMin + faceW * 0.56);
  const rightEyeX1 = Math.floor(faceXMin + faceW * 0.58);
  const rightEyeX2 = Math.floor(faceXMin + faceW * 0.85);

  let leftEyeLum = 0, leftEyeCount = 0;
  let bridgeLum = 0, bridgeCount = 0;
  let rightEyeLum = 0, rightEyeCount = 0;

  for (let y = eyeBandY1; y <= eyeBandY2 && y < sampleH; y++) {
    for (let x = leftEyeX1; x <= leftEyeX2 && x < sampleW; x++) {
      leftEyeLum += gray[y * sampleW + x];
      leftEyeCount++;
    }
    for (let x = bridgeX1; x <= bridgeX2 && x < sampleW; x++) {
      bridgeLum += gray[y * sampleW + x];
      bridgeCount++;
    }
    for (let x = rightEyeX1; x <= rightEyeX2 && x < sampleW; x++) {
      rightEyeLum += gray[y * sampleW + x];
      rightEyeCount++;
    }
  }

  const avgLeftEye = leftEyeCount > 0 ? leftEyeLum / leftEyeCount : 128;
  const avgBridge = bridgeCount > 0 ? bridgeLum / bridgeCount : 128;
  const avgRightEye = rightEyeCount > 0 ? rightEyeLum / rightEyeCount : 128;

  // Bilateral eye socket depression: Nose bridge is brighter than eye cavities, and eyes have contrast
  const bilateralDip =
    avgBridge > avgLeftEye + 3 &&
    avgBridge > avgRightEye + 3 &&
    Math.abs(avgLeftEye - avgRightEye) < 32;

  // Eye-region micro-contrast (irises / eyelids / brows)
  let eyeZoneLumSqSum = 0;
  let eyeZoneCount = 0;
  for (let y = eyeBandY1; y <= eyeBandY2 && y < sampleH; y++) {
    for (let x = leftEyeX1; x <= rightEyeX2 && x < sampleW; x++) {
      const g = gray[y * sampleW + x];
      eyeZoneLumSqSum += g * g;
      eyeZoneCount++;
    }
  }
  const eyeZoneMean = (avgLeftEye + avgBridge + avgRightEye) / 3;
  const eyeZoneVariance = eyeZoneLumSqSum / Math.max(1, eyeZoneCount) - eyeZoneMean * eyeZoneMean;
  const eyeContrast = Math.min(100, Math.max(0, Math.round((Math.sqrt(Math.max(0, eyeZoneVariance)) / 45) * 100)));

  const eyesDetected =
    hasNativeEyes || (bilateralDip && eyeContrast >= 18) || (eyeContrast >= 28 && !isHandOrFingers);

  // B. Nose Protrusion (y: 45% to 66% of face height)
  // Checks central gradient and luminance peak of nose tip and lateral wing shadows
  const noseY1 = Math.floor(faceYMin + faceH * 0.45);
  const noseY2 = Math.floor(faceYMin + faceH * 0.66);
  let noseGradSum = 0;
  let nosePoints = 0;

  for (let y = noseY1; y <= noseY2 && y < sampleH; y++) {
    for (let x = bridgeX1 - 3; x <= bridgeX2 + 3 && x < sampleW; x++) {
      if (x > 0 && x < sampleW - 1) {
        const dx = Math.abs(gray[y * sampleW + x + 1] - gray[y * sampleW + x - 1]);
        noseGradSum += dx;
        nosePoints++;
      }
    }
  }
  const avgNoseGrad = nosePoints > 0 ? noseGradSum / nosePoints : 0;
  const noseDetected = hasNativeNose || (avgNoseGrad >= 7 && !isHandOrFingers);

  // C. Mouth Valley (y: 68% to 88% of face height)
  // Horizontal fissure between upper and lower lip
  const mouthY1 = Math.floor(faceYMin + faceH * 0.68);
  const mouthY2 = Math.floor(faceYMin + faceH * 0.88);
  let mouthGradSum = 0;
  let mouthPoints = 0;

  for (let y = mouthY1; y <= mouthY2 && y < sampleH - 1; y++) {
    for (let x = leftEyeX1 + 4; x <= rightEyeX2 - 4 && x < sampleW; x++) {
      const dy = Math.abs(gray[(y + 1) * sampleW + x] - gray[(y - 1) * sampleW + x]);
      mouthGradSum += dy;
      mouthPoints++;
    }
  }
  const avgMouthGrad = mouthPoints > 0 ? mouthGradSum / mouthPoints : 0;
  const mouthDetected = hasNativeMouth || (avgMouthGrad >= 8 && !isHandOrFingers);

  // 6. ANTI-SPOOFING (Phone Screen or Paper Print Detection)
  // A phone or tablet presented in front of the camera exhibits sharp straight bezels (high linear contrast borders)
  // or specular screen reflection glare (clipped 255,255,255 hotspots without skin texture).
  let isSpoofDetected = false;
  let screenGlarePixels = 0;
  let straightBezelLines = 0;

  // Check for flat specular screen reflection
  for (let y = cYMin; y <= cYMax; y++) {
    for (let x = cXMin; x <= cXMax; x++) {
      const idx = (y * sampleW + x) * 4;
      if (data[idx] > 250 && data[idx + 1] > 250 && data[idx + 2] > 250) {
        screenGlarePixels++;
      }
    }
  }
  // Large unnatural specular hotspot typical of phone glass reflection
  if (screenGlarePixels > (cXMax - cXMin) * (cYMax - cYMin) * 0.08) {
    isSpoofDetected = true;
  }

  // Check for rectangular inner phone borders / sheet edges
  let horizontalEdgeScore = 0;
  let verticalEdgeScore = 0;
  for (let y = Math.floor(sampleH * 0.15); y <= Math.floor(sampleH * 0.85); y += 6) {
    let rowHGrads = 0;
    for (let x = Math.floor(sampleW * 0.15); x <= Math.floor(sampleW * 0.85); x++) {
      const idx = y * sampleW + x;
      if (Math.abs(gray[idx + 1] - gray[idx - 1]) > 42) rowHGrads++;
    }
    if (rowHGrads > (sampleW * 0.35)) straightBezelLines++;
  }
  if (straightBezelLines >= 3 && !nativeFaceDetected) {
    isSpoofDetected = true;
  }

  const contrastScore = eyeContrast;
  const centerSkinRatio = centerRegionSkinCount / Math.max(1, centerTotalPixels);
  const faceAreaPercentage = Math.round(centerSkinRatio * 100);

  // Face Detected Decision:
  // Must NOT be a hand, must have skin cluster of face proportion OR native face detector,
  // AND must have at least partial facial topology
  const faceDetected =
    !isHandOrFingers &&
    (nativeFaceDetected || (centerSkinRatio >= 0.14 && (eyesDetected || noseDetected || mouthDetected)));

  // Sharpness Decision:
  const isSharp = sharpnessScore >= 35 && laplacianVariance >= 18;
  const isWellLit = avgBrightness >= 32 && avgBrightness <= 238;

  // Anti-fraud / Spoof / Hand Priority Decision Tree:
  if (!isWellLit) {
    return {
      isValid: false,
      faceDetected,
      isSharp,
      sharpnessScore,
      brightnessScore,
      contrastScore,
      faceAreaPercentage,
      eyesDetected,
      noseDetected,
      mouthDetected,
      isHandOrFingers,
      isSpoofDetected,
      livenessScore: 10,
      message: avgBrightness < 32
        ? 'Ambiente muito escuro ou câmera coberta. Ilumine seu rosto.'
        : 'Ambiente com excesso de reflexo ou claridade. Evite luz direta.',
      failureReason: avgBrightness < 32 ? 'TOO_DARK' : 'TOO_BRIGHT',
    };
  }

  // 1. REJECT HAND / FINGERS IMMEDIATELY
  if (isHandOrFingers) {
    return {
      isValid: false,
      faceDetected: false,
      isSharp,
      sharpnessScore,
      brightnessScore,
      contrastScore,
      faceAreaPercentage,
      eyesDetected: false,
      noseDetected: false,
      mouthDetected: false,
      isHandOrFingers: true,
      isSpoofDetected: false,
      livenessScore: 0,
      message: 'Mão ou dedos detectados! O acesso biométrico exige a face humana completa.',
      failureReason: 'HAND_DETECTED',
    };
  }

  // 2. REJECT PHONE SCREEN OR PAPER SPOOF
  if (isSpoofDetected) {
    return {
      isValid: false,
      faceDetected: false,
      isSharp,
      sharpnessScore,
      brightnessScore,
      contrastScore,
      faceAreaPercentage,
      eyesDetected,
      noseDetected,
      mouthDetected,
      isHandOrFingers: false,
      isSpoofDetected: true,
      livenessScore: 5,
      message: 'Foto de tela de celular ou papel detectada! Proibido uso de reproduções fotográficas.',
      failureReason: 'SCREEN_OR_PAPER_SPOOF',
    };
  }

  // 3. NO FACE IDENTIFIED
  if (!faceDetected) {
    return {
      isValid: false,
      faceDetected: false,
      isSharp,
      sharpnessScore,
      brightnessScore,
      contrastScore,
      faceAreaPercentage,
      eyesDetected: false,
      noseDetected: false,
      mouthDetected: false,
      isHandOrFingers: false,
      isSpoofDetected: false,
      livenessScore: 10,
      message: 'Nenhum rosto identificado. Posicione seu rosto em frente à lente da câmera.',
      failureReason: 'NO_FACE',
    };
  }

  // 4. MANDATORY FACIAL FEATURES CHECK: EYES, NOSE, MOUTH MUST BE VISIBLE
  if (!eyesDetected) {
    return {
      isValid: false,
      faceDetected: true,
      isSharp,
      sharpnessScore,
      brightnessScore,
      contrastScore,
      faceAreaPercentage,
      eyesDetected: false,
      noseDetected,
      mouthDetected,
      isHandOrFingers: false,
      isSpoofDetected: false,
      livenessScore: 30,
      message: 'Olhos não identificados ou cobertos. Mantenha os olhos visíveis e abertos para identificação.',
      failureReason: 'EYES_MISSING',
    };
  }

  if (!noseDetected) {
    return {
      isValid: false,
      faceDetected: true,
      isSharp,
      sharpnessScore,
      brightnessScore,
      contrastScore,
      faceAreaPercentage,
      eyesDetected,
      noseDetected: false,
      mouthDetected,
      isHandOrFingers: false,
      isSpoofDetected: false,
      livenessScore: 40,
      message: 'Nariz não identificado ou encoberto. O nariz deve estar totalmente visível.',
      failureReason: 'NOSE_MISSING',
    };
  }

  if (!mouthDetected) {
    return {
      isValid: false,
      faceDetected: true,
      isSharp,
      sharpnessScore,
      brightnessScore,
      contrastScore,
      faceAreaPercentage,
      eyesDetected,
      noseDetected,
      mouthDetected: false,
      isHandOrFingers: false,
      isSpoofDetected: false,
      livenessScore: 40,
      message: 'Boca não identificada ou encoberta. Remova máscaras ou objetos da boca.',
      failureReason: 'MOUTH_MISSING',
    };
  }

  // 5. SHARPNESS
  if (!isSharp) {
    return {
      isValid: false,
      faceDetected: true,
      isSharp: false,
      sharpnessScore,
      brightnessScore,
      contrastScore,
      faceAreaPercentage,
      eyesDetected,
      noseDetected,
      mouthDetected,
      isHandOrFingers: false,
      isSpoofDetected: false,
      livenessScore: 60,
      message: `Rosto fora de foco ou borrado (${sharpnessScore}% nitidez). Mantenha a cabeça firme em frente à lente.`,
      failureReason: 'BLURRY',
    };
  }

  // ALL MANDATORY CRITERIA SATISFIED: REAL FACE, EYES, NOSE, MOUTH ALL CONFIRMED!
  return {
    isValid: true,
    faceDetected: true,
    isSharp: true,
    sharpnessScore,
    brightnessScore,
    contrastScore,
    faceAreaPercentage,
    eyesDetected: true,
    noseDetected: true,
    mouthDetected: true,
    isHandOrFingers: false,
    isSpoofDetected: false,
    livenessScore: 95,
    message: `Rosto autêntico e nítido (Olhos, nariz e boca confirmados • Nitidez: ${sharpnessScore}%).`,
  };
}

/**
 * Sends captured photo to backend AI validation endpoint (/api/verify-biometrics)
 * with fast short-circuiting, payload compression, and strict sub-second timeout.
 */
export async function verifyCapturedPhotoWithServer(
  photoDataUrl: string,
  userName: string,
  localValidation?: BiometricValidationResult
): Promise<BiometricValidationResult> {
  // If local computer vision already caught a hand, spoof, blur, or missing face, return instantly (0ms lag)!
  if (localValidation && !localValidation.isValid) {
    return localValidation;
  }

  try {
    // Compress base64 to small thumbnail if over 60KB to guarantee instant upload
    let payloadUrl = photoDataUrl;
    if (typeof document !== 'undefined' && photoDataUrl.length > 60000) {
      try {
        const img = new Image();
        img.src = photoDataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        if (img.width > 0 && img.height > 0) {
          const c = document.createElement('canvas');
          c.width = 240;
          c.height = 180;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 240, 180);
            payloadUrl = c.toDataURL('image/jpeg', 0.6);
          }
        }
      } catch {
        // use original
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 950);

    const res = await fetch('/api/verify-biometrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoDataUrl: payloadUrl, userName }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isValid: Boolean(data.isValid),
        faceDetected: Boolean(data.isHumanFace),
        isSharp: Number(data.sharpnessQuality || 80) >= 35,
        sharpnessScore: Number(data.sharpnessQuality || (localValidation?.sharpnessScore ?? 85)),
        brightnessScore: localValidation?.brightnessScore ?? 75,
        contrastScore: localValidation?.contrastScore ?? 80,
        faceAreaPercentage: localValidation?.faceAreaPercentage ?? 60,
        eyesDetected: Boolean(data.eyesVisible),
        noseDetected: Boolean(data.noseVisible),
        mouthDetected: Boolean(data.mouthVisible),
        isHandOrFingers: Boolean(data.isHandOrObject),
        isSpoofDetected: Boolean(data.isSpoofOrPresentation),
        livenessScore: data.isValid ? 98 : 10,
        message: data.detailedMessage || (data.isValid ? 'Rosto biométrico validado com sucesso por IA.' : 'Falha na validação biométrica.'),
        failureReason: data.isValid
          ? undefined
          : (data.failureReason as BiometricValidationResult['failureReason']) || 'NO_FACE',
      };
    }
  } catch {
    // On timeout or abort, fall back immediately to local validation without holding the user
  }

  // Graceful instantaneous fallback to local computer vision result
  if (localValidation) {
    return localValidation;
  }

  return {
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
    message: 'Não foi possível verificar a biometria.',
    failureReason: 'NO_FACE',
  };
}

/**
 * Captures frame from HTMLVideoElement and draws forensic security watermark overlay.
 */
export function captureAndWatermarkFrame(
  video: HTMLVideoElement,
  metadata: PhotoMetadata,
  validation?: BiometricValidationResult
): string {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  // Draw camera video frame
  ctx.drawImage(video, 0, 0, width, height);

  // Draw semi-transparent header bar
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(0, 0, width, 48);

  // Draw header text
  ctx.fillStyle = '#38bdf8'; // sky-400
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('HOSPITAL SAMARITANO • REGISTRO BIOMÉTRICO FACIAL', 16, 20);

  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = '11px monospace';
  const sharpInfo = validation?.isSharp ? `NITIDEZ: ${validation.sharpnessScore}% • ` : '';
  ctx.fillText(`DISPOSITIVO: ${metadata.deviceType.toUpperCase()} | ${sharpInfo}ART. 154-A CP`, 16, 38);

  // Draw timestamp on top right
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(metadata.timestamp, width - 16, 28);
  ctx.textAlign = 'left';

  // Draw semi-transparent footer bar
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(0, height - 52, width, 52);

  // Draw footer text: Operator details
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`OPERADOR: ${metadata.userName} (${metadata.userRoleTitle})`, 16, height - 32);

  ctx.fillStyle = '#38bdf8'; // sky-400
  ctx.font = '10px monospace';
  ctx.fillText(`${metadata.registrationNumber} • SHA-256 PROOF: ${metadata.hashProof.slice(0, 24)}...`, 16, height - 14);

  // Add small status pill on bottom right
  const isVerified = validation?.isValid ?? true;
  ctx.fillStyle = isVerified ? '#10b981' : '#f43f5e';
  ctx.beginPath();
  ctx.arc(width - 150, height - 26, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isVerified ? '#a7f3d0' : '#fecdd3';
  ctx.font = 'bold 10px monospace';
  let statusText = 'ROSTO & BIOMETRIA OK';
  if (!isVerified) {
    if (validation?.failureReason === 'HAND_DETECTED') statusText = 'MÃO DETECTADA (REJEITADO)';
    else if (validation?.failureReason === 'SCREEN_OR_PAPER_SPOOF') statusText = 'SPOOF TELA/PAPEL (REJEITADO)';
    else if (validation?.failureReason === 'EYES_MISSING') statusText = 'OLHOS COBERTOS (REJEITADO)';
    else if (validation?.failureReason === 'MOUTH_MISSING') statusText = 'BOCA COBERTA (REJEITADO)';
    else statusText = 'FOTO INVÁLIDA (REJEITADO)';
  }
  ctx.fillText(statusText, width - 140, height - 23);

  return canvas.toDataURL('image/jpeg', 0.90);
}

/**
 * Generates an SVG/Canvas fallback snapshot when the camera is not physically available
 * or user denied camera permission, ensuring the security audit record still exists.
 */
export function generateSimulatedEntranceSnapshot(metadata: PhotoMetadata, reason: 'DENIED' | 'UNAVAILABLE'): string {
  const width = 640;
  const height = 480;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#1e293b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Grid pattern
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw biometric face silhouette outline
  ctx.strokeStyle = reason === 'DENIED' ? '#f43f5e' : '#f59e0b';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);

  // Head oval
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2 - 20, 65, 85, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Shoulders
  ctx.beginPath();
  ctx.arc(width / 2, height / 2 + 130, 110, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Center text
  ctx.textAlign = 'center';
  ctx.fillStyle = reason === 'DENIED' ? '#f43f5e' : '#f59e0b';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    reason === 'DENIED' ? '⚠️ PERMISSÃO DA CÂMERA NEGADA' : '📷 CÂMERA NÃO DETECTADA / INDISPONÍVEL',
    width / 2,
    height / 2 - 15
  );

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px monospace';
  ctx.fillText('Registro de entrada gerado por IP e credencial institucional', width / 2, height / 2 + 10);
  ctx.fillText(`Dispositivo: ${metadata.deviceType}`, width / 2, height / 2 + 30);
  ctx.textAlign = 'left';

  // Header & Footer
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(0, 0, width, 48);
  ctx.fillRect(0, height - 50, width, 50);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('HOSPITAL SAMARITANO • REGISTRO DE ENTRADA (AUDITORIA)', 16, 20);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(metadata.timestamp, width - 16, 28);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`OPERADOR: ${metadata.userName} (${metadata.userRoleTitle})`, 16, height - 30);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText(`HASH: ${metadata.hashProof.slice(0, 32)}...`, 16, height - 12);

  return canvas.toDataURL('image/jpeg', 0.85);
}

