import { useState, useEffect, useCallback, useRef } from 'react';

interface UseBarcodeDetectorOptions {
  enabled: boolean;
  onBarcodeDetected: (barcode: string) => void;
  minLength?: number;      // Minimum barcode length (default 8)
  maxDelay?: number;       // Max ms between keystrokes for scanner input (default 50)
}

interface UseBarcodeDetectorReturn {
  lastBarcode: string | null;
  isDetecting: boolean;
}

/**
 * Hook to detect barcode scanner input globally
 * USB barcode scanners emulate keyboard input - they type very fast followed by Enter
 */
export function useBarcodeDetector({
  enabled,
  onBarcodeDetected,
  minLength = 8,
  maxDelay = 50,
}: UseBarcodeDetectorOptions): UseBarcodeDetectorReturn {
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    setIsDetecting(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in an input field (unless it's specifically a barcode input)
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' ||
                         target.tagName === 'TEXTAREA' ||
                         target.isContentEditable;

    // Allow barcode detection in barcode-specific inputs
    const isBarcodeInput = target.getAttribute('data-barcode-input') === 'true';

    if (isInputField && !isBarcodeInput) {
      return;
    }

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    // If Enter is pressed and we have a buffer, check if it's a barcode
    if (event.key === 'Enter') {
      const barcode = bufferRef.current.trim();

      if (barcode.length >= minLength) {
        // Looks like a barcode!
        console.log('[BarcodeDetector] Barcode detected:', barcode);
        setLastBarcode(barcode);
        onBarcodeDetected(barcode);
        event.preventDefault();
      }

      clearBuffer();
      return;
    }

    // Only accept printable characters
    if (event.key.length !== 1) {
      return;
    }

    // If too much time has passed, start fresh
    if (timeSinceLastKey > maxDelay && bufferRef.current.length > 0) {
      clearBuffer();
    }

    // Add to buffer
    bufferRef.current += event.key;
    setIsDetecting(true);

    // Clear buffer after a delay if no more input comes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      clearBuffer();
    }, maxDelay * 3);

  }, [minLength, maxDelay, onBarcodeDetected, clearBuffer]);

  useEffect(() => {
    if (!enabled) {
      clearBuffer();
      return;
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearBuffer();
    };
  }, [enabled, handleKeyDown, clearBuffer]);

  return {
    lastBarcode,
    isDetecting,
  };
}
