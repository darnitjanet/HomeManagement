import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Loader2 } from 'lucide-react';
import { pantryApi } from '../../services/api';

interface ProductInfo {
  name: string;
  brand: string | null;
  category: string | null;
  quantity: string | null;
  imageUrl: string | null;
}

interface BarcodeScannerProps {
  onProductFound: (product: ProductInfo) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onProductFound, onClose }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    setError('');
    setScanning(true);

    try {
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        async (decodedText) => {
          // Stop scanning after successful read
          await scanner.stop();
          setScanning(false);
          handleBarcodeScanned(decodedText);
        },
        () => {
          // Ignore scan failures (no code found yet)
        }
      );
    } catch (err: any) {
      setScanning(false);
      if (err.toString().includes('NotAllowedError')) {
        setError('Camera access denied. Please allow camera access or enter barcode manually.');
      } else {
        setError('Failed to start camera. Try entering barcode manually.');
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setScanning(false);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setLooking(true);
    setError('');

    try {
      const response = await pantryApi.lookupBarcode(barcode);
      if (response.data.success) {
        onProductFound(response.data.data);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError(`Product not found for barcode: ${barcode}. Try entering details manually.`);
      } else {
        setError('Failed to lookup product. Please try again.');
      }
    } finally {
      setLooking(false);
    }
  };

  const handleManualLookup = async () => {
    if (!manualBarcode.trim()) {
      setError('Please enter a barcode');
      return;
    }
    await handleBarcodeScanned(manualBarcode.trim());
  };

  return (
    <div className="barcode-scanner-overlay" onClick={onClose}>
      <div className="barcode-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h3><Camera size={20} /> Scan Barcode</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {error && <div className="scanner-error">{error}</div>}

        {looking ? (
          <div className="scanner-loading">
            <Loader2 size={32} className="spinner" />
            <p>Looking up product...</p>
          </div>
        ) : (
          <>
            <div className="scanner-preview" ref={containerRef}>
              <div id="barcode-reader" style={{ width: '100%' }}></div>
              {!scanning && (
                <div className="scanner-placeholder">
                  <Camera size={48} />
                  <p>Camera preview will appear here</p>
                </div>
              )}
            </div>

            <div className="scanner-controls">
              {!scanning ? (
                <button className="scan-btn primary" onClick={startScanning}>
                  <Camera size={18} /> Start Camera
                </button>
              ) : (
                <button className="scan-btn" onClick={stopScanning}>
                  Stop Camera
                </button>
              )}
            </div>

            <div className="manual-entry">
              <p>Or enter barcode manually:</p>
              <div className="manual-input-row">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Enter barcode number..."
                  onKeyPress={(e) => e.key === 'Enter' && handleManualLookup()}
                />
                <button onClick={handleManualLookup}>Lookup</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
