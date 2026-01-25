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

  // Helper to set input value in a way React recognizes
  const setNativeValue = useCallback((element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
      'value'
    )?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    }
    // Trigger input event for React
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  }, []);

  const handleKeyPress = useCallback((button: string) => {
    if (!activeInput) return;

    // Focus the input to ensure we can get/set cursor position
    activeInput.focus();

    const start = activeInput.selectionStart ?? activeInput.value.length;
    const end = activeInput.selectionEnd ?? activeInput.value.length;
    const currentValue = activeInput.value;
    let newValue = currentValue;
    let newCursorPos = start;

    if (button === '{bksp}') {
      if (start === end && start > 0) {
        newValue = currentValue.slice(0, start - 1) + currentValue.slice(end);
        newCursorPos = start - 1;
      } else if (start !== end) {
        newValue = currentValue.slice(0, start) + currentValue.slice(end);
        newCursorPos = start;
      }
    } else if (button === '{enter}') {
      if (activeInput.tagName === 'TEXTAREA') {
        newValue = currentValue.slice(0, start) + '\n' + currentValue.slice(end);
        newCursorPos = start + 1;
      } else {
        // Submit form or blur for regular inputs
        activeInput.blur();
        setIsVisible(false);
        return;
      }
    } else if (button === '{space}') {
      newValue = currentValue.slice(0, start) + ' ' + currentValue.slice(end);
      newCursorPos = start + 1;
    } else if (button === '{shift}' || button === '{lock}') {
      setLayoutName(layoutName === 'default' ? 'shift' : 'default');
      return;
    } else if (button === '{tab}') {
      newValue = currentValue.slice(0, start) + '\t' + currentValue.slice(end);
      newCursorPos = start + 1;
    } else if (!button.startsWith('{')) {
      newValue = currentValue.slice(0, start) + button + currentValue.slice(end);
      newCursorPos = start + 1;
      // Reset to lowercase after typing with shift
      if (layoutName === 'shift') {
        setLayoutName('default');
      }
    }

    // Set value using native setter for React compatibility
    setNativeValue(activeInput, newValue);

    // Set cursor position after React has processed the change
    requestAnimationFrame(() => {
      activeInput.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [activeInput, layoutName, setNativeValue]);

  useEffect(() => {
    const isTextInput = (el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement => {
      if (el.tagName === 'TEXTAREA') return true;
      if (el.tagName === 'INPUT') {
        const inputType = (el as HTMLInputElement).type || 'text';
        return !['file', 'checkbox', 'radio', 'submit', 'button', 'hidden', 'range'].includes(inputType);
      }
      return false;
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (isTextInput(target)) {
        setActiveInput(target);
        setIsVisible(true);
      }
    };

    // Also handle touch/click on inputs for better touchscreen support
    const handleTouchOrClick = (e: Event) => {
      const target = e.target as HTMLElement;
      // Find closest input (in case clicking on a wrapper)
      const inputEl = target.closest('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
      if (inputEl && isTextInput(inputEl)) {
        setActiveInput(inputEl);
        setIsVisible(true);
        inputEl.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't hide if clicking on keyboard or input
      if (containerRef.current?.contains(target)) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (target.closest('input, textarea')) return;
      // Check if clicking on a button or interactive element - hide keyboard
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
        setIsVisible(false);
        setActiveInput(null);
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('touchend', handleTouchOrClick);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('touchend', handleTouchOrClick);
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
      const inputType = (focused as HTMLInputElement).type;
      // Only use if it's a text-like input
      if (!['file', 'checkbox', 'radio', 'submit', 'button', 'hidden', 'range'].includes(inputType)) {
        setActiveInput(focused as HTMLInputElement | HTMLTextAreaElement);
        setIsVisible(true);
        return;
      }
    }
    // Find the first visible text-like input
    const allInputs = document.querySelectorAll('input, textarea');
    for (const input of allInputs) {
      const el = input as HTMLInputElement;
      const inputType = el.type || 'text';
      if (!['file', 'checkbox', 'radio', 'submit', 'button', 'hidden', 'range'].includes(inputType)) {
        // Check if visible
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          el.focus();
          setActiveInput(el);
          setIsVisible(true);
          return;
        }
      }
    }
    // No input found, still show keyboard (user can tap an input after)
    setIsVisible(true);
  }, []);

  return (
    <>
      {/* Floating keyboard button - always visible when keyboard is hidden */}
      {!isVisible && (
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
