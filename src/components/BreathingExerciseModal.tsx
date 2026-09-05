import React, { useState, useEffect } from 'react';
import { X, Wind, Play, Pause, RotateCcw } from 'lucide-react';

interface BreathingExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPattern?: string;
}

export const BreathingExerciseModal: React.FC<BreathingExerciseModalProps> = ({
  isOpen,
  onClose,
  initialPattern = 'box',
}) => {
  const [pattern, setPattern] = useState<'box' | 'calm'>(initialPattern === 'calm' ? 'calm' : 'box');
  const [isActive, setIsActive] = useState(true);
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);

  // Pattern configs
  const config = pattern === 'box'
    ? { name: 'Box Breathing (4-4-4-4)', inhale: 4, hold1: 4, exhale: 4, hold2: 4 }
    : { name: '4-7-8 Deep Relaxation', inhale: 4, hold1: 7, exhale: 8, hold2: 0 };

  useEffect(() => {
    if (!isOpen || !isActive) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Switch to next phase
        if (pattern === 'box') {
          if (phase === 'Inhale') {
            setPhase('Hold');
            return config.hold1;
          } else if (phase === 'Hold') {
            setPhase('Exhale');
            return config.exhale;
          } else if (phase === 'Exhale') {
            setPhase('Rest');
            return config.hold2;
          } else {
            setPhase('Inhale');
            setCycleCount((c) => c + 1);
            return config.inhale;
          }
        } else {
          // 4-7-8 pattern
          if (phase === 'Inhale') {
            setPhase('Hold');
            return config.hold1;
          } else if (phase === 'Hold') {
            setPhase('Exhale');
            return config.exhale;
          } else {
            setPhase('Inhale');
            setCycleCount((c) => c + 1);
            return config.inhale;
          }
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isActive, phase, pattern, config]);

  if (!isOpen) return null;

  // Scale calculation for visual circle
  let circleScale = 'scale-100';
  if (phase === 'Inhale') circleScale = 'scale-125';
  else if (phase === 'Hold') circleScale = 'scale-125';
  else if (phase === 'Exhale') circleScale = 'scale-90';
  else if (phase === 'Rest') circleScale = 'scale-90';

  return (
    <div
      id="breathing-exercise-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
    >
      <div className="bg-[#FAF9F5] border border-[#D1CDBE] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-xl text-center relative animate-in fade-in zoom-in-95 duration-200">
        <button
          id="close-breathing-modal-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#EFEEE8] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE8DD] text-[#5A5A40] text-xs font-semibold mb-3">
          <Wind className="w-3.5 h-3.5" />
          <span>Mindful Somatic Grounding</span>
        </div>

        <h3 className="text-xl font-serif font-bold text-[#3D3C38] mb-1">
          {config.name}
        </h3>
        <p className="text-xs text-[#7C7A70] mb-6 max-w-xs mx-auto">
          Follow the expanding circle. Inhale through your nose, hold gently, and exhale smoothly through your mouth.
        </p>

        {/* Pattern Selector */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            id="pattern-box-btn"
            type="button"
            onClick={() => {
              setPattern('box');
              setPhase('Inhale');
              setSecondsLeft(4);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
              pattern === 'box'
                ? 'bg-[#5A5A40] text-[#FAF9F5]'
                : 'bg-[#EFEEE8] text-[#5E5D57] hover:bg-[#EAE8DD]'
            }`}
          >
            Box (4-4-4-4)
          </button>
          <button
            id="pattern-calm-btn"
            type="button"
            onClick={() => {
              setPattern('calm');
              setPhase('Inhale');
              setSecondsLeft(4);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
              pattern === 'calm'
                ? 'bg-[#5A5A40] text-[#FAF9F5]'
                : 'bg-[#EFEEE8] text-[#5E5D57] hover:bg-[#EAE8DD]'
            }`}
          >
            4-7-8 Relaxing
          </button>
        </div>

        {/* Animated Breathing Circle */}
        <div className="relative w-52 h-52 mx-auto flex items-center justify-center my-4">
          <div
            className={`absolute inset-0 rounded-full bg-[#EAE8DD]/60 border border-[#D1CDBE] transition-transform duration-1000 ease-in-out ${circleScale}`}
          />
          <div
            className={`absolute w-36 h-36 rounded-full bg-[#CAD5C6]/40 transition-transform duration-1000 ease-in-out ${circleScale}`}
          />
          <div className="relative z-10 text-center">
            <span className="text-2xl font-serif font-bold text-[#3D3C38] block tracking-wide">
              {phase}
            </span>
            <span className="text-3xl font-mono font-extrabold text-[#5A5A40] block my-1">
              {secondsLeft}s
            </span>
            <span className="text-[11px] text-[#7C7A70] uppercase tracking-wider font-semibold">
              Cycle {cycleCount + 1}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-[#D1CDBE]/60">
          <button
            id="toggle-breathing-active-btn"
            type="button"
            onClick={() => setIsActive(!isActive)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A5A40] text-[#FAF9F5] hover:bg-[#484833] text-xs font-medium transition-colors cursor-pointer"
          >
            {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isActive ? 'Pause' : 'Resume'}</span>
          </button>
          <button
            id="reset-breathing-btn"
            type="button"
            onClick={() => {
              setPhase('Inhale');
              setSecondsLeft(pattern === 'box' ? 4 : 4);
              setCycleCount(0);
              setIsActive(true);
            }}
            className="p-2 rounded-xl bg-[#EFEEE8] text-[#5E5D57] hover:text-[#3D3C38] hover:bg-[#EAE8DD] transition-colors cursor-pointer"
            title="Restart cycle"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
