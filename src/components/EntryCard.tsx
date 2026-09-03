import React from 'react';
import {
  Calendar,
  MessageSquare,
  Sparkles,
  Trash2,
  ChevronRight,
  Heart,
  Zap,
  Smile,
  CloudRain,
  MinusCircle,
  Eye,
} from 'lucide-react';
import type { JournalEntry, MoodType } from '../types';

interface EntryCardProps {
  entry: JournalEntry;
  onSelect: (entry: JournalEntry) => void;
  onOpenChat: (entry: JournalEntry) => void;
  onDelete: (entryId: string) => void;
}

const MOOD_MAP: Record<
  MoodType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  peaceful: { label: 'Peaceful', icon: Heart, color: 'text-[#485942] bg-[#EAEFE8] border border-[#CAD5C6]' },
  motivated: { label: 'Motivated', icon: Zap, color: 'text-[#875F23] bg-[#FAF3E5] border border-[#E8D8B6]' },
  thoughtful: { label: 'Thoughtful', icon: Sparkles, color: 'text-[#5A5A40] bg-[#EAE8DD] border border-[#D1CDBE]' },
  grateful: { label: 'Grateful', icon: Smile, color: 'text-[#8A4A4A] bg-[#F9EFEF] border border-[#E8CFCF]' },
  anxious: { label: 'Anxious', icon: CloudRain, color: 'text-[#4F6877] bg-[#EAF1F5] border border-[#CADCE6]' },
  neutral: { label: 'Balanced', icon: MinusCircle, color: 'text-[#5E5D57] bg-[#EFEEE8] border border-[#D8D5CB]' },
};

export const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  onSelect,
  onOpenChat,
  onDelete,
}) => {
  const moodConfig = MOOD_MAP[entry.mood] || MOOD_MAP.thoughtful;
  const MoodIcon = moodConfig.icon;
  const chatTurnsCount = entry.messages ? entry.messages.length : 0;

  const formattedDate = new Date(entry.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-[#FAF9F5] rounded-2xl border border-[#D1CDBE] hover:border-[#5A5A40]/60 hover:shadow-xs transition-all p-5 flex flex-col justify-between group">
      <div>
        {/* Category, Mood & Date Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold text-[#5A5A40] uppercase tracking-wider bg-[#EFEEE8] border border-[#D1CDBE]/70 px-2.5 py-0.5 rounded-md font-sans">
            {entry.category}
          </span>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${moodConfig.color}`}
            >
              <MoodIcon className="w-3 h-3" />
              <span>{moodConfig.label}</span>
            </span>

            <span className="text-[11px] text-[#7C7A70] flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          onClick={() => onSelect(entry)}
          className="text-lg font-serif font-bold text-[#3D3C38] group-hover:text-[#5A5A40] cursor-pointer mb-2 line-clamp-1 leading-snug"
        >
          {entry.title || 'Untitled Reflection'}
        </h3>

        {/* Excerpt / Summary */}
        {entry.summary ? (
          <p className="text-xs text-[#3D3C38] line-clamp-2 leading-relaxed mb-3 italic">
            &ldquo;{entry.summary}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-[#7C7A70] line-clamp-2 leading-relaxed mb-3">
            {entry.initialText || 'No initial text.'}
          </p>
        )}

        {/* Key Insights Chips */}
        {entry.keyInsights && entry.keyInsights.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {entry.keyInsights.slice(0, 2).map((insight, idx) => (
              <span
                key={idx}
                className="text-[10px] text-[#5E5D57] bg-[#EFEEE8] border border-[#D1CDBE]/70 px-2 py-0.5 rounded-full truncate max-w-[200px]"
              >
                &bull; {insight}
              </span>
            ))}
            {entry.keyInsights.length > 2 && (
              <span className="text-[10px] text-[#9C988D] self-center">
                +{entry.keyInsights.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-3 border-t border-[#D1CDBE]/60 flex items-center justify-between mt-2">
        <button
          onClick={() => onOpenChat(entry)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3D3C38] hover:text-[#2C2B27] bg-[#EFEEE8] hover:bg-[#E5E2D9] border border-[#D1CDBE]/70 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#5A5A40]" />
          <span>{chatTurnsCount > 0 ? `${chatTurnsCount} AI turns` : 'Reflect with AI'}</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onSelect(entry)}
            title="View Details"
            className="p-1.5 text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#EFEEE8] rounded-md transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this reflection?')) {
                onDelete(entry.id);
              }
            }}
            title="Delete Entry"
            className="p-1.5 text-[#7C7A70] hover:text-[#9C3838] hover:bg-[#F8EFEF] rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
