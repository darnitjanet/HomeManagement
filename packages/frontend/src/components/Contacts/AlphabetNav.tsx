import { useMemo } from 'react';
import './AlphabetNav.css';

interface AlphabetNavProps {
  contacts: Array<{ displayName: string; id: number }>;
  onLetterClick: (letter: string) => void;
}

export function AlphabetNav({ contacts, onLetterClick }: AlphabetNavProps) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Find which letters have contacts
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    contacts.forEach((contact) => {
      const firstLetter = contact.displayName.charAt(0).toUpperCase();
      if (alphabet.includes(firstLetter)) {
        letters.add(firstLetter);
      }
    });
    return letters;
  }, [contacts]);

  return (
    <div className="alphabet-nav">
      {alphabet.map((letter) => (
        <button
          key={letter}
          className={`alphabet-letter ${availableLetters.has(letter) ? 'active' : 'inactive'}`}
          onClick={() => onLetterClick(letter)}
          disabled={!availableLetters.has(letter)}
          title={availableLetters.has(letter) ? `Jump to ${letter}` : `No contacts starting with ${letter}`}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
