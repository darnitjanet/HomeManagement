import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMotionDetectionOptions {
  enabled: boolean;
  sensitivity?: number;  // 1-100, default 30 (lower = more sensitive)
  debounceMs?: number;   // default 3000ms (3 seconds between detections)
  onMotionDetected: () => void;
}

interface UseMotionDetectionReturn {
  isSupported: boolean;
  isActive: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Hook for camera-based motion detection
 * Compares consecutive video frames to detect movement
 */
export function useMotionDetection({
  enabled,
  sensitivity = 30,
  debounceMs = 3000,
  onMotionDetected,
}: UseMotionDetectionOptions): UseMotionDetectionReturn {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const previousFrameRef = useRef<ImageData | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  const isSupported = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia;

  // Motion detection algorithm
  const detectMotion = useCallback((prev: ImageData, curr: ImageData): boolean => {
    let diffCount = 0;
    const totalPixels = prev.data.length / 4;
    const sampleRate = 10; // Check every 10th pixel for performance
    const sampledPixels = Math.floor(totalPixels / sampleRate);

    for (let i = 0; i < prev.data.length; i += 4 * sampleRate) {
      const rDiff = Math.abs(prev.data[i] - curr.data[i]);
      const gDiff = Math.abs(prev.data[i + 1] - curr.data[i + 1]);
      const bDiff = Math.abs(prev.data[i + 2] - curr.data[i + 2]);

      // If pixel changed significantly (sum of RGB diff > 100)
      if (rDiff + gDiff + bDiff > 100) {
        diffCount++;
      }
    }

    // Calculate percentage of changed pixels
    const diffPercent = (diffCount / sampledPixels) * 100;

    // Sensitivity: lower value = more sensitive
    // At sensitivity 30, trigger if 3% of pixels changed
    const threshold = sensitivity / 10;
    return diffPercent > threshold;
  }, [sensitivity]);

  // Frame capture and comparison loop
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !contextRef.current) {
      animationFrameRef.current = requestAnimationFrame(captureFrame);
      return;
    }

    const now = Date.now();

    // Only process at ~5 FPS (every 200ms)
    if (now - lastFrameTimeRef.current < 200) {
      animationFrameRef.current = requestAnimationFrame(captureFrame);
      return;
    }
    lastFrameTimeRef.current = now;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = contextRef.current;

    // Check if video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(captureFrame);
      return;
    }

    // Draw current frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);

    // Compare with previous frame
    if (previousFrameRef.current) {
      const motionDetected = detectMotion(previousFrameRef.current, currentFrame);

      if (motionDetected) {
        // Check debounce
        if (now - lastDetectionRef.current > debounceMs) {
          lastDetectionRef.current = now;
          onMotionDetected();
        }
      }
    }

    // Store current frame for next comparison
    previousFrameRef.current = currentFrame;

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(captureFrame);
  }, [detectMotion, debounceMs, onMotionDetected]);

  // Start camera and motion detection
  const startDetection = useCallback(async () => {
    if (!isSupported) {
      setError('Camera access is not supported in this browser.');
      return;
    }

    try {
      setError(null);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user',
          frameRate: { ideal: 10 }
        }
      });

      streamRef.current = stream;

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Create canvas for frame comparison
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 320;
      canvasRef.current.height = 240;
      contextRef.current = canvasRef.current.getContext('2d', { willReadFrequently: true });

      setIsActive(true);

      // Start capture loop
      animationFrameRef.current = requestAnimationFrame(captureFrame);
    } catch (err: any) {
      console.error('Failed to start motion detection:', err);

      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
      setIsActive(false);
    }
  }, [isSupported, captureFrame]);

  // Stop camera and motion detection
  const stopDetection = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear canvas refs
    canvasRef.current = null;
    contextRef.current = null;
    previousFrameRef.current = null;

    setIsActive(false);
  }, []);

  // Start/stop based on enabled prop
  useEffect(() => {
    if (enabled && !isActive && !error) {
      startDetection();
    } else if (!enabled && isActive) {
      stopDetection();
    }
  }, [enabled, isActive, error, startDetection, stopDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isSupported,
    isActive,
    error,
    videoRef,
  };
}
