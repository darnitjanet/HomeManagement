import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Loader2 } from 'lucide-react';
import './BarcodeScanner.css';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  title?: string;
  placeholder?: string;
}

export function BarcodeScanner({
  onScan,
  onClose,
  title = 'Scan Barcode',
  placeholder = 'Enter barcode number...'
}: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    setError('');
    setScanning(true);

    try {
      const scanner = new Html5Qrcode('barcode-reader-shared');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          onScan(decodedText);
        },
        () => {}
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
      } catch {}
    }
    setScanning(false);
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
    }
  };

  return (
    <div className="barcode-scanner-overlay" onClick={onClose}>
      <div className="barcode-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h3><Camera size={20} /> {title}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {error && <div className="scanner-error">{error}</div>}

        <div className="scanner-preview">
          <div id="barcode-reader-shared" style={{ width: '100%' }}></div>
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
              placeholder={placeholder}
              onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
            <button onClick={handleManualSubmit}>Search</button>
          </div>
        </div>
      </div>
    </div>
  );
}
