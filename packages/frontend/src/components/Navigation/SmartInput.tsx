import { useState, useRef, useEffect } from 'react';
import { smartInputApi } from '../../services/api';
import { useCalendarStore } from '../../stores/useCalendarStore';
import './SmartInput.css';

interface ActionResult {
  action: {
    type: string;
    name?: string;
    text?: string;
    listType?: string;
  };
  success: boolean;
  message: string;
}

interface SmartInputResponse {
  results: ActionResult[];
  authRequired: boolean;
  unrecognized: string | null;
  message?: string;
}

export function SmartInput() {
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ActionResult[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isAuthenticated } = useCalendarStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close results dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-hide results after 5 seconds
  useEffect(() => {
    if (showResults && results) {
      const timer = setTimeout(() => setShowResults(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showResults, results]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || processing) return;

    setProcessing(true);
    setResults(null);
    setErrorMessage(null);

    try {
      const response = await smartInputApi.process(input.trim());
      const data = response.data.data as SmartInputResponse;

      if (data.message && data.results.length === 0) {
        setErrorMessage(data.message);
        setResults([]);
      } else {
        setResults(data.results);
      }
      setShowResults(true);

      if (data.results.some((r: ActionResult) => r.success)) {
        setInput('');
      }
    } catch (error: any) {
      console.error('Smart input error:', error);
      const message = error.response?.data?.message || error.response?.data?.error || 'Failed to process. Please try again.';
      setErrorMessage(message);
      setResults([]);
      setShowResults(true);
    } finally {
      setProcessing(false);
    }
  };

  const getActionIcon = (action: ActionResult['action']) => {
    if (action.type === 'shopping') {
      return action.listType === 'grocery' ? '🛒' : '📦';
    }
    if (action.type === 'calendar') {
      return '📅';
    }
    if (action.type === 'todo') {
      return '✅';
    }
    return '✓';
  };

  return (
    <div className="smart-input-container" ref={containerRef}>
      <form className="smart-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="smart-input-field"
          placeholder="Add milk to shopping, schedule dentist Tuesday..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={processing}
        />
        <button
          type="submit"
          className="smart-input-submit"
          disabled={processing || !input.trim()}
          title="Process input"
        >
          {processing ? (
            <span className="spinner"></span>
          ) : (
            '→'
          )}
        </button>
      </form>

      {showResults && (
        <div className="smart-input-results">
          {errorMessage && (
            <div className="result-item error">
              <span className="result-icon">!</span>
              <span className="result-message">{errorMessage}</span>
            </div>
          )}
          {results && results.map((result, i) => (
            <div
              key={i}
              className={`result-item ${result.success ? 'success' : 'error'}`}
            >
              <span className="result-type-icon">{getActionIcon(result.action)}</span>
              <span className="result-icon">
                {result.success ? '✓' : '✗'}
              </span>
              <span className="result-message">{result.message}</span>
            </div>
          ))}
          {!isAuthenticated && results && results.some(r => !r.success && r.action.type === 'calendar') && (
            <div className="result-item warning">
              <span className="result-type-icon">🔑</span>
              <span className="result-icon">!</span>
              <span className="result-message">
                Login with Google to add calendar events
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
