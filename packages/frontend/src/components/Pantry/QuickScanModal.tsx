import { useState, useRef, useEffect } from 'react';
import { X, Barcode, Check, AlertCircle, Loader2 } from 'lucide-react';
import { pantryApi } from '../../services/api';

interface ScannedItem {
  barcode: string;
  name: string;
  status: 'success' | 'error' | 'duplicate';
  message?: string;
}

interface QuickScanModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export function QuickScanModal({ onClose, onComplete }: QuickScanModalProps) {
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount and after each scan
  useEffect(() => {
    inputRef.current?.focus();
  }, [scannedItems]);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = scanInput.trim();
    if (!barcode || scanning) return;

    setScanning(true);
    setScanInput('');

    try {
      // Look up the product
      const response = await pantryApi.lookupBarcode(barcode);

      if (response.data.success) {
        const product = response.data.data;

        // Auto-add to pantry with quantity 1
        await pantryApi.createItem({
          name: product.name,
          quantity: 1,
          unit: product.quantity || undefined,
          category: product.category || undefined,
        });

        setScannedItems(prev => [{
          barcode,
          name: product.name,
          status: 'success',
        }, ...prev]);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setScannedItems(prev => [{
          barcode,
          name: 'Unknown product',
          status: 'error',
          message: 'Product not found in database',
        }, ...prev]);
      } else {
        setScannedItems(prev => [{
          barcode,
          name: 'Error',
          status: 'error',
          message: 'Failed to lookup barcode',
        }, ...prev]);
      }
    } finally {
      setScanning(false);
      // Re-focus input for next scan
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleDone = () => {
    onComplete();
    onClose();
  };

  const successCount = scannedItems.filter(i => i.status === 'success').length;
  const errorCount = scannedItems.filter(i => i.status === 'error').length;

  return (
    <div className="quick-scan-overlay" onClick={onClose}>
      <div className="quick-scan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-scan-header">
          <h3><Barcode size={20} /> Quick Scan Mode</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="quick-scan-instructions">
          <p>Scan barcodes continuously - items are auto-added to your pantry!</p>
          <p className="hint">Just scan, no clicking needed between items.</p>
        </div>

        <form onSubmit={handleScanSubmit} className="quick-scan-form">
          <div className="scan-input-wrapper">
            <Barcode size={20} />
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder={scanning ? 'Looking up...' : 'Ready to scan...'}
              className="quick-scan-input"
              autoFocus
              disabled={scanning}
            />
            {scanning && <Loader2 size={20} className="spinner" />}
          </div>
        </form>

        {scannedItems.length > 0 && (
          <div className="scanned-items-list">
            <div className="scanned-summary">
              <span className="success-count">
                <Check size={16} /> {successCount} added
              </span>
              {errorCount > 0 && (
                <span className="error-count">
                  <AlertCircle size={16} /> {errorCount} failed
                </span>
              )}
            </div>

            <div className="scanned-items">
              {scannedItems.map((item, index) => (
                <div key={index} className={`scanned-item ${item.status}`}>
                  {item.status === 'success' ? (
                    <Check size={16} className="status-icon" />
                  ) : (
                    <AlertCircle size={16} className="status-icon" />
                  )}
                  <span className="item-name">{item.name}</span>
                  {item.message && <span className="item-message">{item.message}</span>}
                  <span className="item-barcode">{item.barcode}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="quick-scan-footer">
          <button className="done-btn" onClick={handleDone}>
            Done Scanning ({successCount} items added)
          </button>
        </div>
      </div>
    </div>
  );
}
