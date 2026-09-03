import React from 'react';
import { Smile, Zap, Sparkles, Heart, CloudRain, MinusCircle } from 'lucide-react';
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
  return (
    <div className="flex flex-wrap gap-2">
      {MOODS.map((item) => {
        const isSelected = selectedMood === item.id;
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            id={`mood-option-${item.id}`}
            type="button"
            onClick={() => onChange(item.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isSelected
                ? `${item.color} ring-2 ring-[#5A5A40]/20 font-semibold shadow-2xs`
                : 'bg-[#FAF9F5] border-[#D1CDBE]/70 text-[#5E5D57] hover:bg-[#EFEEE8]'
            }`}
          >
            <IconComponent className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
