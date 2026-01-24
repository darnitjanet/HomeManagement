import { useEffect, useRef, useState, useCallback } from 'react';
import Keyboard from 'simple-keyboard';
import 'simple-keyboard/build/css/index.css';
import './VirtualKeyboard.css';

interface VirtualKeyboardProps {
  onClose?: () => void;
}

export function VirtualKeyboard({ onClose }: VirtualKeyboardProps) {
  const keyboardRef = useRef<Keyboard | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeInput, setActiveInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [layoutName, setLayoutName] = useState('default');
  const [showButton, setShowButton] = useState(true);

  const handleKeyPress = useCallback((button: string) => {
    if (!activeInput) return;

    if (button === '{bksp}') {
      const start = activeInput.selectionStart || 0;
      const end = activeInput.selectionEnd || 0;
      if (start === end && start > 0) {
        activeInput.value = activeInput.value.slice(0, start - 1) + activeInput.value.slice(end);
        activeInput.setSelectionRange(start - 1, start - 1);
      } else {
        activeInput.value = activeInput.value.slice(0, start) + activeInput.value.slice(end);
        activeInput.setSelectionRange(start, start);
      }
    } else if (button === '{enter}') {
      if (activeInput.tagName === 'TEXTAREA') {
        const start = activeInput.selectionStart || 0;
        activeInput.value = activeInput.value.slice(0, start) + '\n' + activeInput.value.slice(start);
        activeInput.setSelectionRange(start + 1, start + 1);
      } else {
        // Submit form or blur for regular inputs
        activeInput.blur();
        setIsVisible(false);
      }
    } else if (button === '{space}') {
      const start = activeInput.selectionStart || 0;
      activeInput.value = activeInput.value.slice(0, start) + ' ' + activeInput.value.slice(start);
      activeInput.setSelectionRange(start + 1, start + 1);
    } else if (button === '{shift}' || button === '{lock}') {
      setLayoutName(layoutName === 'default' ? 'shift' : 'default');
    } else if (button === '{tab}') {
      const start = activeInput.selectionStart || 0;
      activeInput.value = activeInput.value.slice(0, start) + '\t' + activeInput.value.slice(start);
      activeInput.setSelectionRange(start + 1, start + 1);
    } else if (!button.startsWith('{')) {
      const start = activeInput.selectionStart || 0;
      activeInput.value = activeInput.value.slice(0, start) + button + activeInput.value.slice(start);
      activeInput.setSelectionRange(start + 1, start + 1);
      // Reset to lowercase after typing with shift
      if (layoutName === 'shift') {
        setLayoutName('default');
      }
    }

    // Trigger input event for React to pick up changes
    const event = new Event('input', { bubbles: true });
    activeInput.dispatchEvent(event);
  }, [activeInput, layoutName]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
        // Skip if it's a file input or other non-text input
        if (inputEl.tagName === 'INPUT') {
          const inputType = (inputEl as HTMLInputElement).type;
          if (['file', 'checkbox', 'radio', 'submit', 'button', 'hidden'].includes(inputType)) {
            return;
          }
        }
        setActiveInput(inputEl);
        setIsVisible(true);
        setShowButton(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't hide if clicking on keyboard or input
      if (containerRef.current?.contains(target)) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      // Check if clicking on a button or interactive element
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
        setIsVisible(false);
        setActiveInput(null);
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (containerRef.current && isVisible) {
      keyboardRef.current = new Keyboard(containerRef.current.querySelector('.keyboard-container') as HTMLElement, {
        onChange: () => {},
        onKeyPress: handleKeyPress,
        layoutName: layoutName,
        layout: {
          default: [
            '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
            'q w e r t y u i o p [ ] \\',
            'a s d f g h j k l ; \' {enter}',
            '{shift} z x c v b n m , . / {shift}',
            '{space}'
          ],
          shift: [
            '~ ! @ # $ % ^ & * ( ) _ + {bksp}',
            'Q W E R T Y U I O P { } |',
            'A S D F G H J K L : " {enter}',
            '{shift} Z X C V B N M < > ? {shift}',
            '{space}'
          ]
        },
        display: {
          '{bksp}': '⌫',
          '{enter}': '↵',
          '{shift}': '⇧',
          '{space}': ' ',
          '{tab}': '⇥'
        }
      });
    }

    return () => {
      keyboardRef.current?.destroy();
    };
  }, [isVisible, handleKeyPress, layoutName]);

  const handleShowKeyboard = useCallback(() => {
    // Find the currently focused input or the first input on the page
    const focused = document.activeElement as HTMLElement;
    if (focused?.tagName === 'INPUT' || focused?.tagName === 'TEXTAREA') {
      setActiveInput(focused as HTMLInputElement | HTMLTextAreaElement);
    } else {
      // Find the first visible text input
      const firstInput = document.querySelector('input[type="text"], input[type="search"], input:not([type]), textarea') as HTMLInputElement | HTMLTextAreaElement;
      if (firstInput) {
        firstInput.focus();
        setActiveInput(firstInput);
      }
    }
    setIsVisible(true);
    setShowButton(false);
  }, []);

  return (
    <>
      {/* Floating keyboard button */}
      {showButton && !isVisible && (
        <button
          className="keyboard-toggle-btn"
          onClick={handleShowKeyboard}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleShowKeyboard();
          }}
          aria-label="Show keyboard"
        >
          ⌨
        </button>
      )}

      {/* Virtual keyboard overlay */}
      {isVisible && (
        <div className="virtual-keyboard-overlay" ref={containerRef}>
          <div className="virtual-keyboard-wrapper">
            <button
              className="keyboard-close-btn"
              onClick={() => {
                setIsVisible(false);
                setActiveInput(null);
                setShowButton(true);
                onClose?.();
              }}
            >
              ✕
            </button>
            <div className="keyboard-container"></div>
          </div>
        </div>
      )}
    </>
  );
}
