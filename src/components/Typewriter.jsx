// src/components/Typewriter.jsx
import { useState, useEffect } from 'react';

export default function Typewriter({ 
  words = [],
  delay = 2000,
  typingSpeed = 100,
  deletingSpeed = 50,
  loop = true,
  className = ""
}) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    if (words.length === 0) return;
    
    const currentWord = words[currentWordIndex];
    let timeout;
    
    if (isDeleting) {
      timeout = setTimeout(() => {
        setCurrentText(prev => prev.slice(0, -1));
        if (currentText === '') {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
          setIsPaused(true);
          setTimeout(() => setIsPaused(false), delay);
        }
      }, deletingSpeed);
    } else {
      timeout = setTimeout(() => {
        setCurrentText(currentWord.slice(0, currentText.length + 1));
        if (currentText.length + 1 === currentWord.length) {
          if (!loop && currentWordIndex === words.length - 1) return;
          setIsPaused(true);
          setTimeout(() => {
            setIsDeleting(true);
            setIsPaused(false);
          }, delay);
        }
      }, typingSpeed);
    }
    
    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIndex, words, typingSpeed, deletingSpeed, delay, loop, isPaused]);

  if (words.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      {currentText}
      <span className="inline-block w-[2px] h-5 bg-primary-400 ml-0.5 animate-blink" />
    </span>
  );
}
