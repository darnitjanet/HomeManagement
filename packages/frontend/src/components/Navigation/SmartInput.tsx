import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { smartInputApi } from '../../services/api';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
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

  // Speech recognition
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: voiceSupported,
    error: voiceError,
    startListening,
    stopListening,
  } = useSpeechRecognition();

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

  // Update input when speech transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Show voice errors
  useEffect(() => {
    if (voiceError) {
      setErrorMessage(voiceError);
      setShowResults(true);
    }
  }, [voiceError]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

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
        // AI couldn't understand the input
        setErrorMessage(data.message);
        setResults([]);
      } else {
        setResults(data.results);
      }
      setShowResults(true);

      // Clear input on any success
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
          className={`smart-input-field ${isListening ? 'listening' : ''}`}
          placeholder={isListening ? 'Listening...' : 'Add milk to shopping, schedule dentist Tuesday...'}
          value={isListening && interimTranscript ? interimTranscript : input}
          onChange={(e) => setInput(e.target.value)}
          disabled={processing || isListening}
        />
        {voiceSupported && (
          <button
            type="button"
            className={`smart-input-mic ${isListening ? 'listening' : ''}`}
            onClick={handleMicClick}
            disabled={processing}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
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
