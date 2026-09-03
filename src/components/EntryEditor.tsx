import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  MessageSquare,
  Wand2,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Clock,
  Tag,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { MoodSelector } from './MoodSelector';
import type { JournalEntry, ReflectionCategory, MoodType, GeminiSummaryResponse } from '../types';

interface EntryEditorProps {
  initialEntry?: JournalEntry | null;
  userId: string;
  onSave: (entry: JournalEntry) => Promise<void>;
  onOpenConversation: (entry: JournalEntry) => void;
  onCancel?: () => void;
}

const CATEGORIES: ReflectionCategory[] = [
  'Daily Reflection',
  'Gratitude & Joy',
  'Mindfulness & Peace',
  'Career & Ambition',
  'Creative Spark',
  'Problem Solving',
];

export const EntryEditor: React.FC<EntryEditorProps> = ({
  initialEntry,
  userId,
  onSave,
  onOpenConversation,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialEntry?.title || '');
  const [category, setCategory] = useState<ReflectionCategory>(
    initialEntry?.category || 'Daily Reflection'
  );
  const [mood, setMood] = useState<MoodType>(initialEntry?.mood || 'thoughtful');
  const [text, setText] = useState(initialEntry?.initialText || '');
  const [summary, setSummary] = useState(initialEntry?.summary || '');
  const [keyInsights, setKeyInsights] = useState<string[]>(initialEntry?.keyInsights || []);

  const [isSaving, setIsSaving] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (initialEntry) {
      setTitle(initialEntry.title || '');
      setCategory(initialEntry.category || 'Daily Reflection');
      setMood(initialEntry.mood || 'thoughtful');
      setText(initialEntry.initialText || '');
      setSummary(initialEntry.summary || '');
      setKeyInsights(initialEntry.keyInsights || []);
    }
  }, [initialEntry]);

  // Fetch contextual prompts
  const handleFetchPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const res = await fetch('/api/gemini/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, currentMood: mood }),
      });
      const data = await res.json();
      if (Array.isArray(data.prompts)) {
        setAiPrompts(data.prompts);
      }
    } catch (err) {
      console.error('Error fetching prompts:', err);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const handleApplyPrompt = (promptStr: string) => {
    setText((prev) => (prev ? `${prev}\n\n${promptStr}` : promptStr));
  };

  const handleSynthesize = async () => {
    if (!text.trim()) {
      setNotification({
        type: 'error',
        message: 'Please write some reflection thoughts before synthesizing.',
      });
      return;
    }

    setIsSynthesizing(true);
    setNotification(null);

    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          category,
          messages: initialEntry?.messages || [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to summarize entry.');
      }

      const data: GeminiSummaryResponse = await response.json();
      if (!title || title === 'Untitled Reflection') {
        setTitle(data.title);
      }
      setSummary(data.summary);
      setKeyInsights(data.keyInsights || []);
      if (data.detectedMood) {
        setMood(data.detectedMood);
      }

      setNotification({
        type: 'success',
        message: 'Gemini synthesized summary and key insights successfully!',
      });
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setNotification({
        type: 'error',
        message: err?.message || 'Could not synthesize entry.',
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSave = async () => {
    if (!text.trim() && !title.trim()) {
      setNotification({
        type: 'error',
        message: 'Please provide a title or write your thoughts before saving.',
      });
      return;
    }

    setIsSaving(true);
    setNotification(null);

    const entryToSave: JournalEntry = {
      id: initialEntry?.id || 'entry-' + Date.now(),
      userId,
      title: title.trim() || 'Reflection ' + new Date().toLocaleDateString(),
      category,
      mood,
      initialText: text,
      summary: summary || undefined,
      keyInsights: keyInsights.length > 0 ? keyInsights : undefined,
      messages: initialEntry?.messages || [],
      createdAt: initialEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSave(entryToSave);
      setNotification({
        type: 'success',
        message: 'Entry successfully saved to Cloud Firestore.',
      });
    } catch (err: any) {
      console.error('Save error:', err);
      setNotification({
        type: 'error',
        message: err?.message || 'Failed to save entry to Firestore. Please retry.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartConversation = () => {
    const entryToChat: JournalEntry = {
      id: initialEntry?.id || 'entry-' + Date.now(),
      userId,
      title: title.trim() || 'Reflection ' + new Date().toLocaleDateString(),
      category,
      mood,
      initialText: text,
      summary: summary || undefined,
      keyInsights: keyInsights.length > 0 ? keyInsights : undefined,
      messages: initialEntry?.messages || [],
      createdAt: initialEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onOpenConversation(entryToChat);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-[#FAF9F5] rounded-2xl border border-[#D1CDBE] shadow-sm p-6 sm:p-8">
      {/* Header Notification Banner */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 ${
            notification.type === 'success'
              ? 'bg-[#EAEFE8] border border-[#CAD5C6] text-[#334D2E]'
              : 'bg-[#F8EFEF] border border-[#E2B6B6] text-[#7A3333]'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-[#485942] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#9C3838] shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p>{notification.message}</p>
          </div>
        </div>
      )}

      {/* Category selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-[#7C7A70] uppercase tracking-wider mb-2 font-sans">
          Reflection Focus
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              id={`category-btn-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                category === cat
                  ? 'bg-[#5A5A40] text-[#FAF9F5] border-[#5A5A40] shadow-2xs font-semibold'
                  : 'bg-[#EFEEE8] text-[#5E5D57] border-[#D1CDBE]/70 hover:bg-[#E5E2D9]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Title & Mood row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label
            htmlFor="entry-title-input"
            className="block text-xs font-semibold text-[#7C7A70] uppercase tracking-wider mb-2 font-sans"
          >
            Title / Topic
          </label>
          <input
            id="entry-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Navigating creative resistance, Morning thoughts..."
            className="w-full bg-[#FAF9F5] border border-[#D1CDBE] rounded-xl px-4 py-2.5 text-sm text-[#3D3C38] placeholder:text-[#9C988D] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#7C7A70] uppercase tracking-wider mb-2 font-sans">
            Current Mood
          </label>
          <MoodSelector selectedMood={mood} onChange={setMood} />
        </div>
      </div>

      {/* AI Inspiration bar */}
      <div className="mb-4 flex items-center justify-between">
        <label
          htmlFor="entry-textarea"
          className="text-xs font-semibold text-[#7C7A70] uppercase tracking-wider font-sans"
        >
          Your Journal Reflection
        </label>
        <button
          id="inspire-prompts-btn"
          type="button"
          onClick={handleFetchPrompts}
          disabled={isLoadingPrompts}
          className="inline-flex items-center gap-1.5 text-xs text-[#5A5A40] hover:text-[#3D3C38] font-medium cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
          <span>{isLoadingPrompts ? 'Generating Prompts...' : 'Inspire Me with Gemini'}</span>
        </button>
      </div>

      {/* Suggested Prompts List */}
      {aiPrompts.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl bg-[#EAE8DD]/80 border border-[#D1CDBE]">
          <p className="text-[11px] font-semibold text-[#5A5A40] uppercase tracking-wider mb-2 font-sans">
            Click to add a prompt:
          </p>
          <div className="space-y-1.5">
            {aiPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPrompt(p)}
                className="w-full text-left p-2.5 rounded-lg bg-[#FAF9F5] hover:bg-white text-xs text-[#3D3C38] border border-[#D1CDBE]/70 transition-colors cursor-pointer"
              >
                &bull; {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Journal Input */}
      <div className="relative mb-6">
        <textarea
          id="entry-textarea"
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pour your raw thoughts, questions, or reflections here. There are no right or wrong words..."
          className="w-full bg-[#FAF9F5] border border-[#D1CDBE] rounded-xl p-4 text-sm text-[#3D3C38] leading-relaxed placeholder:text-[#9C988D] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] resize-y font-normal"
        />
        <div className="flex justify-between items-center text-[11px] text-[#7C7A70] mt-1 px-1">
          <span>Encrypted & stored in isolated Firestore</span>
          <span>{wordCount} words &bull; {text.length} characters</span>
        </div>
      </div>

      {/* AI Summary / Insights Display if available */}
      {(summary || keyInsights.length > 0) && (
        <div className="mb-6 p-4 rounded-xl bg-[#EFEEE8]/80 border border-[#D1CDBE]">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-4 h-4 text-[#5A5A40]" />
            <h4 className="text-xs font-serif font-bold text-[#3D3C38] uppercase tracking-wider">
              Gemini Synthesized Insights
            </h4>
          </div>
          {summary && (
            <p className="text-xs text-[#3D3C38] leading-relaxed mb-3 italic">
              &ldquo;{summary}&rdquo;
            </p>
          )}
          {keyInsights.length > 0 && (
            <ul className="space-y-1">
              {keyInsights.map((insight, i) => (
                <li key={i} className="text-xs text-[#5E5D57] flex items-start gap-1.5">
                  <span className="text-[#5A5A40] font-bold">&check;</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#D1CDBE]/60">
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-[#D1CDBE] text-[#5E5D57] hover:bg-[#EFEEE8] text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            id="synthesize-gemini-btn"
            type="button"
            onClick={handleSynthesize}
            disabled={isSynthesizing || !text.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAE8DD] hover:bg-[#E0DDD0] text-[#3D3C38] border border-[#D1CDBE] text-xs sm:text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSynthesizing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#5A5A40]" />
            ) : (
              <Wand2 className="w-4 h-4 text-[#5A5A40]" />
            )}
            <span>{isSynthesizing ? 'Synthesizing...' : 'Synthesize Insights'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="start-ai-dialogue-btn"
            type="button"
            onClick={handleStartConversation}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EFEEE8] hover:bg-[#E5E2D9] text-[#3D3C38] border border-[#D1CDBE]/60 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-[#5A5A40]" />
            <span>Reflect with Gemini</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#9C988D]" />
          </button>

          <button
            id="save-journal-entry-btn"
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-[#FAF9F5] text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving to Firestore...' : 'Save Reflection'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
