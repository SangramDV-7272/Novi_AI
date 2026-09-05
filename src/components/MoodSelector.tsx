import React, { useState, useRef, useEffect } from 'react';
import { Smile, Zap, Sparkles, Heart, CloudRain, MinusCircle, ChevronDown, Check } from 'lucide-react';
import type { MoodType } from '../types';

interface MoodSelectorProps {
  selectedMood: MoodType;
  onChange: (mood: MoodType) => void;
}

const MOODS: { id: MoodType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'peaceful', label: 'Peaceful', icon: Heart, color: 'text-[#485942] bg-[#EAEFE8] border-[#CAD5C6]' },
  { id: 'motivated', label: 'Motivated', icon: Zap, color: 'text-[#875F23] bg-[#FAF3E5] border-[#E8D8B6]' },
  { id: 'thoughtful', label: 'Thoughtful', icon: Sparkles, color: 'text-[#5A5A40] bg-[#EAE8DD] border-[#D1CDBE]' },
  { id: 'grateful', label: 'Grateful', icon: Smile, color: 'text-[#8A4A4A] bg-[#F9EFEF] border-[#E8CFCF]' },
  { id: 'anxious', label: 'Anxious / Restless', icon: CloudRain, color: 'text-[#4F6877] bg-[#EAF1F5] border-[#CADCE6]' },
  { id: 'neutral', label: 'Balanced', icon: MinusCircle, color: 'text-[#5E5D57] bg-[#EFEEE8] border-[#D8D5CB]' },
];

export const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMood, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMoodObj = MOODS.find((m) => m.id === selectedMood) || MOODS[0];
  const CurrentIcon = currentMoodObj.icon;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (moodId: MoodType) => {
    onChange(moodId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Dropdown Trigger Button */}
      <button
        id="mood-dropdown-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-[42px] bg-[#FAF9F5] hover:bg-[#F5F4EE] border border-[#D1CDBE] rounded-xl px-3.5 py-2 text-sm text-[#3D3C38] flex items-center justify-between transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] cursor-pointer shadow-2xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-xs shrink-0 ${currentMoodObj.color}`}>
            <CurrentIcon className="w-3.5 h-3.5" />
          </span>
          <span className="font-medium text-[#3D3C38] text-xs sm:text-sm truncate">
            {currentMoodObj.label}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#7C7A70] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#3D3C38]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Options */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select mood"
          className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[#FAF9F5] border border-[#D1CDBE] rounded-xl shadow-lg py-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        >
          {MOODS.map((item) => {
            const isSelected = selectedMood === item.id;
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                id={`mood-option-${item.id}`}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer text-xs sm:text-sm ${
                  isSelected
                    ? 'bg-[#EFEEE8] text-[#3D3C38] font-semibold'
                    : 'text-[#5E5D57] hover:bg-[#F5F4EE] hover:text-[#3D3C38]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-xs shrink-0 ${item.color}`}>
                    <ItemIcon className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#5A5A40] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
