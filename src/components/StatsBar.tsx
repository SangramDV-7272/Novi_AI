import React from 'react';
import { BookOpen, Sparkles, Heart, Zap, Search, Filter, Sliders, Key } from 'lucide-react';
import type { JournalEntry, ReflectionCategory } from '../types';

interface StatsBarProps {
  entries: JournalEntry[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  onOpenAISettings?: () => void;
  isUsingPersonalKey?: boolean;
  maskedKey?: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  entries,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onOpenAISettings,
  isUsingPersonalKey,
  maskedKey,
}) => {
  const totalEntries = entries.length;
  const aiConversationsCount = entries.filter((e) => e.messages && e.messages.length > 0).length;

  const categories = ['All', ...Array.from(new Set(entries.map((e) => e.category)))];

  return (
    <div className="space-y-4 mb-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#D1CDBE] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#7C7A70] uppercase tracking-wider block mb-1 font-sans">
            Total Reflections
          </span>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#5A5A40]" />
            <span className="text-xl font-serif font-bold text-[#3D3C38]">{totalEntries}</span>
          </div>
        </div>

        <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#D1CDBE] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#7C7A70] uppercase tracking-wider block mb-1 font-sans">
            AI Dialogues
          </span>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5A5A40]" />
            <span className="text-xl font-serif font-bold text-[#3D3C38]">{aiConversationsCount}</span>
          </div>
        </div>

        <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#D1CDBE] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#7C7A70] uppercase tracking-wider block mb-1 font-sans">
            Firestore Sync
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5A5A40] animate-pulse"></span>
            <span className="text-sm font-semibold text-[#485942]">Isolated & Live</span>
          </div>
        </div>

        {/* 4th Card: Active Engine & AI Settings */}
        <div
          id="active-engine-card"
          className="bg-[#FAF9F5] p-4 rounded-xl border border-[#D1CDBE] hover:border-[#5A5A40] transition-colors shadow-2xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-[#7C7A70] uppercase tracking-wider block font-sans">
              Active Engine
            </span>
            {onOpenAISettings && (
              <button
                id="active-engine-settings-trigger-btn"
                type="button"
                onClick={onOpenAISettings}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5A5A40] hover:text-[#3D3C38] hover:underline cursor-pointer transition-colors"
                title="Open AI Engine & API Key Settings"
              >
                <Sliders className="w-3 h-3 text-[#5A5A40]" />
                <span className="font-semibold">Settings</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 my-0.5">
            <Zap className="w-4 h-4 text-[#875F23] shrink-0" />
            <span className="text-sm font-semibold text-[#3D3C38]">Gemini 3.8 Flash</span>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-[#EAE8DD] flex items-center justify-between gap-2 text-[11px]">
            {isUsingPersonalKey ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-[#7A5418]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="truncate max-w-[95px] sm:max-w-none">
                  BYOK Key {maskedKey ? `(${maskedKey.slice(-4)})` : 'Active'}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#7C7A70]">
                <Key className="w-3 h-3 text-[#7C7A70]" />
                <span>Shared App Key</span>
              </span>
            )}

            {onOpenAISettings && (
              <button
                type="button"
                onClick={onOpenAISettings}
                className="text-[10px] font-bold text-[#875F23] hover:text-[#5A5A40] uppercase tracking-wider cursor-pointer"
              >
                {isUsingPersonalKey ? 'Change' : 'Config'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Category Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7C7A70] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-entries-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reflections by title, summary, or thoughts..."
            className="w-full bg-[#FAF9F5] border border-[#D1CDBE] rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[#3D3C38] placeholder:text-[#9C988D] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-[#5A5A40] text-[#FAF9F5] border-[#5A5A40] shadow-2xs font-semibold'
                  : 'bg-[#FAF9F5] text-[#5E5D57] border-[#D1CDBE] hover:bg-[#EFEEE8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
