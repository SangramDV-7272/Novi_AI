import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Save,
  MessageSquare,
  Wand2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  MapPin,
  Paperclip,
  Mic,
  X,
  FileText,
  Film,
  Image as ImageIcon,
  Eye,
  Edit3,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MoodSelector } from './MoodSelector';
import { LocationPickerModal } from './LocationPickerModal';
import { VoiceDictationModal } from './VoiceDictationModal';
import { MediaViewerModal } from './MediaViewerModal';
import { uploadAttachmentFile, deleteAttachmentFile } from '../lib/firebase';
import type {
  JournalEntry,
  ReflectionCategory,
  MoodType,
  GeminiSummaryResponse,
  LocationTag,
  MediaAttachment,
} from '../types';

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

  // Feature 1: Location Tagging
  const [location, setLocation] = useState<LocationTag | null>(initialEntry?.location || null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Feature 2: Multimedia Attachments & Markdown
  const [attachments, setAttachments] = useState<MediaAttachment[]>(
    initialEntry?.attachments || []
  );
  const [bodyFormat, setBodyFormat] = useState<'plain' | 'markdown'>(
    initialEntry?.bodyFormat || 'plain'
  );
  const [markdownView, setMarkdownView] = useState<'edit' | 'preview' | 'split'>('edit');
  const [uploadProgresses, setUploadProgresses] = useState<{ [key: string]: number }>({});
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<MediaAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Feature 3: Voice Dictation
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // General State
  const [isSaving, setIsSaving] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialEntry) {
      setTitle(initialEntry.title || '');
      setCategory(initialEntry.category || 'Daily Reflection');
      setMood(initialEntry.mood || 'thoughtful');
      setText(initialEntry.initialText || '');
      setSummary(initialEntry.summary || '');
      setKeyInsights(initialEntry.keyInsights || []);
      setLocation(initialEntry.location || null);
      setAttachments(initialEntry.attachments || []);
      setBodyFormat(initialEntry.bodyFormat || 'plain');
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

  // Handle Multi-file Uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFiles(true);
    setNotification(null);

    const fileList = Array.from(files);

    try {
      for (const file of fileList) {
        // Validation: Limit to 25MB per file
        if (file.size > 25 * 1024 * 1024) {
          setNotification({
            type: 'error',
            message: `File "${file.name}" exceeds the 25MB limit.`,
          });
          continue;
        }

        const tempKey = `${file.name}_${file.size}_${Date.now()}`;
        setUploadProgresses((prev) => ({ ...prev, [tempKey]: 5 }));

        try {
          const uploaded = await uploadAttachmentFile(userId, file, (pct) => {
            setUploadProgresses((prev) => ({ ...prev, [tempKey]: pct }));
          });

          setAttachments((prev) => [...prev, uploaded]);
        } catch (uploadErr: any) {
          console.error('File upload error:', uploadErr);
          setNotification({
            type: 'error',
            message: `Could not upload "${file.name}": ${uploadErr.message || 'Unknown error'}`,
          });
        } finally {
          setUploadProgresses((prev) => {
            const next = { ...prev };
            delete next[tempKey];
            return next;
          });
        }
      }
    } finally {
      setIsUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Removing Attachment (also deletes from storage to prevent orphaned files)
  const handleRemoveAttachment = async (attachmentToRemove: MediaAttachment) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentToRemove.id));
    try {
      await deleteAttachmentFile(attachmentToRemove);
    } catch (err) {
      console.warn('Error deleting attachment from storage:', err);
    }
  };

  // Synthesize with Gemini
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

  // Save Reflection
  const handleSave = async () => {
    if (!text.trim() && !title.trim() && attachments.length === 0) {
      setNotification({
        type: 'error',
        message: 'Please provide a title, write thoughts, or attach media before saving.',
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
      bodyFormat,
      location: location || null,
      attachments,
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
        message: 'Reflection successfully saved to Cloud Firestore.',
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
      bodyFormat,
      location: location || null,
      attachments,
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

      {/* Title, Mood & Location row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Title */}
        <div className="md:col-span-1">
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
            placeholder="e.g. Morning thoughts, Quiet moments..."
            className="w-full bg-[#FAF9F5] border border-[#D1CDBE] rounded-xl px-4 py-2.5 text-sm text-[#3D3C38] placeholder:text-[#9C988D] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40]"
          />
        </div>

        {/* Mood Selector */}
        <div className="md:col-span-1">
          <label className="block text-xs font-semibold text-[#7C7A70] uppercase tracking-wider mb-2 font-sans">
            Current Mood
          </label>
          <MoodSelector selectedMood={mood} onChange={setMood} />
        </div>

        {/* Feature 1: Location Tagging Control */}
        <div className="md:col-span-1 flex flex-col justify-between">
          <label className="block text-xs font-semibold text-[#7C7A70] uppercase tracking-wider mb-2 font-sans">
            Reflection Location
          </label>
          {location ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EFECE3] border border-[#D1CDBE] text-xs text-[#3D3C38]">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <MapPin className="w-4 h-4 text-emerald-800 shrink-0" />
                <div className="truncate">
                  <p className="font-medium truncate">{location.placeName || 'Tagged Location'}</p>
                  <p className="text-[11px] text-[#7C7A70] truncate">{location.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="p-1 text-[#7C7A70] hover:text-[#3D3C38] rounded hover:bg-[#E5E2D9] transition-colors"
                  title="Change Location"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  id="remove-location-btn"
                  type="button"
                  onClick={() => setLocation(null)}
                  className="p-1 text-[#9C3838] hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                  title="Remove Location"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              id="add-location-btn"
              type="button"
              onClick={() => setShowLocationPicker(true)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#EFEEE8] hover:bg-[#E5E2D9] border border-dashed border-[#D1CDBE] text-xs font-medium text-[#5E5D57] hover:text-[#3D3C38] transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-800" />
              <span>📍 Add Location</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Location Static Thumbnail if set */}
      {location && (
        <div className="mb-6 p-3 rounded-xl bg-[#EFECE3]/70 border border-[#D1CDBE] flex flex-col sm:flex-row items-center gap-4">
          {/* Static map or coordinates badge */}
          <div className="w-full sm:w-48 h-24 rounded-lg bg-stone-200 border border-stone-300 overflow-hidden shrink-0 relative flex items-center justify-center">
            {location.staticMapUrl ? (
              <img
                src={location.staticMapUrl}
                alt="Location thumbnail"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <iframe
                title="Mini Map Preview"
                className="w-full h-full border-0 pointer-events-none"
                src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=14&output=embed`}
              />
            )}
            <div className="absolute top-1 left-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded backdrop-blur-xs font-mono">
              {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}
            </div>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-[#3D3C38]">{location.placeName || 'Tagged Location'}</p>
            <p className="text-xs text-[#5E5D57] mt-0.5 leading-relaxed">{location.address}</p>
            <p className="text-[11px] text-emerald-800 mt-1.5 flex items-center gap-1 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Attached to reflection &bull; will display on dashboard card</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocation(null)}
            className="text-xs text-[#9C3838] hover:underline self-end sm:self-center shrink-0 cursor-pointer font-medium"
          >
            &times; Remove
          </button>
        </div>
      )}

      {/* Textarea Toolbar: Markdown Toggle, Voice Dictation, Attach Media, Inspire Me */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label
            htmlFor="entry-textarea"
            className="text-xs font-semibold text-[#7C7A70] uppercase tracking-wider font-sans"
          >
            Your Journal Reflection
          </label>

          {/* Plain Text vs Markdown Toggle */}
          <div className="inline-flex items-center rounded-lg bg-[#EFECE3] p-0.5 border border-[#D1CDBE]">
            <button
              type="button"
              onClick={() => setBodyFormat('plain')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                bodyFormat === 'plain'
                  ? 'bg-white text-[#3D3C38] shadow-2xs font-semibold'
                  : 'text-[#7C7A70] hover:text-[#3D3C38]'
              }`}
            >
              Plain Text
            </button>
            <button
              type="button"
              onClick={() => setBodyFormat('markdown')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                bodyFormat === 'markdown'
                  ? 'bg-white text-[#3D3C38] shadow-2xs font-semibold'
                  : 'text-[#7C7A70] hover:text-[#3D3C38]'
              }`}
            >
              Markdown
            </button>
          </div>

          {/* Markdown view sub-toggle (Edit / Preview / Split) */}
          {bodyFormat === 'markdown' && (
            <div className="hidden sm:inline-flex items-center rounded-lg bg-[#EAE7DE] p-0.5 border border-[#D1CDBE]">
              <button
                type="button"
                onClick={() => setMarkdownView('edit')}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  markdownView === 'edit'
                    ? 'bg-white text-[#3D3C38] font-medium'
                    : 'text-[#7C7A70]'
                }`}
                title="Write Markdown"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setMarkdownView('preview')}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  markdownView === 'preview'
                    ? 'bg-white text-[#3D3C38] font-medium'
                    : 'text-[#7C7A70]'
                }`}
                title="Live Markdown Preview"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setMarkdownView('split')}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  markdownView === 'split'
                    ? 'bg-white text-[#3D3C38] font-medium'
                    : 'text-[#7C7A70]'
                }`}
                title="Side by side"
              >
                Split
              </button>
            </div>
          )}
        </div>

        {/* Toolbar Buttons: Voice Dictation, Attach Media, Inspire */}
        <div className="flex items-center gap-2.5">
          {/* Feature 3: Voice Dictation Trigger */}
          <button
            id="voice-dictation-btn"
            type="button"
            onClick={() => setShowVoiceModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EAE8DD] hover:bg-[#E0DDD0] text-xs text-[#5A5A40] hover:text-[#3D3C38] font-medium transition-colors cursor-pointer border border-[#D1CDBE]/70"
            title="Speak your reflection with AI Voice Dictation"
          >
            <Mic className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>Voice Dictation</span>
          </button>

          {/* Feature 2: Attach Media Trigger */}
          <button
            id="attach-media-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFiles}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EAE8DD] hover:bg-[#E0DDD0] text-xs text-[#5A5A40] hover:text-[#3D3C38] font-medium transition-colors cursor-pointer border border-[#D1CDBE]/70 disabled:opacity-50"
            title="Attach images, video, or PDF"
          >
            {isUploadingFiles ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5A5A40]" />
            ) : (
              <Paperclip className="w-3.5 h-3.5 text-[#5A5A40]" />
            )}
            <span>Attach Media</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Inspire Me Prompts */}
          <button
            id="inspire-prompts-btn"
            type="button"
            onClick={handleFetchPrompts}
            disabled={isLoadingPrompts}
            className="inline-flex items-center gap-1.5 text-xs text-[#5A5A40] hover:text-[#3D3C38] font-medium cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>{isLoadingPrompts ? 'Prompts...' : 'Inspire Me'}</span>
          </button>
        </div>
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

      {/* Main Journal Input / Markdown Preview Area */}
      <div className="mb-4">
        {bodyFormat === 'plain' || markdownView === 'edit' ? (
          <textarea
            id="entry-textarea"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pour your raw thoughts, questions, or reflections here. There are no right or wrong words..."
            className="w-full bg-[#FAF9F5] border border-[#D1CDBE] rounded-xl p-4 text-sm text-[#3D3C38] leading-relaxed placeholder:text-[#9C988D] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] resize-y font-serif"
          />
        ) : markdownView === 'preview' ? (
          <div className="w-full min-h-[175px] bg-white border border-[#D1CDBE] rounded-xl p-5 overflow-y-auto">
            {text.trim() ? (
              <div className="prose prose-stone max-w-none text-sm leading-relaxed text-[#3D3C38] font-serif">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic font-serif">
                (Nothing written yet to preview. Switch to Edit or write above.)
              </p>
            )}
          </div>
        ) : (
          /* Split View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <textarea
              id="entry-textarea"
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write Markdown here (e.g. ## Today, **insights**)..."
              className="w-full bg-[#FAF9F5] border border-[#D1CDBE] rounded-xl p-3 text-xs sm:text-sm text-[#3D3C38] leading-relaxed placeholder:text-[#9C988D] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] resize-y font-mono"
            />
            <div className="w-full min-h-[175px] max-h-[300px] bg-white border border-[#D1CDBE] rounded-xl p-3 overflow-y-auto">
              <p className="text-[10px] uppercase font-bold text-[#7C7A70] tracking-wider mb-2 font-sans">
                Live Preview
              </p>
              <div className="prose prose-stone max-w-none text-xs sm:text-sm leading-relaxed text-[#3D3C38] font-serif">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || '*No text yet*'}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center text-[11px] text-[#7C7A70] mt-1 px-1">
          <span>{bodyFormat === 'markdown' ? 'Markdown enabled' : 'Plain text reflection'} &bull; Isolated in Firestore</span>
          <span>{wordCount} words &bull; {text.length} characters</span>
        </div>
      </div>

      {/* Feature 2: Active Attachments List */}
      {(attachments.length > 0 || Object.keys(uploadProgresses).length > 0) && (
        <div className="mb-6 p-4 rounded-xl bg-[#EFECE3] border border-[#D1CDBE]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-[#5A5A40]" />
              <h4 className="text-xs font-semibold text-[#3D3C38] uppercase tracking-wider font-sans">
                Attached Media ({attachments.length})
              </h4>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-[#5A5A40] hover:text-[#3D3C38] font-medium"
            >
              + Add More
            </button>
          </div>

          {/* Upload progress bars */}
          {Object.entries(uploadProgresses).map(([key, pct]) => (
            <div key={key} className="mb-2 p-2 rounded-lg bg-white/70 border border-stone-200 text-xs">
              <div className="flex justify-between text-[11px] text-stone-600 mb-1">
                <span className="truncate max-w-xs">{key.split('_')[0]}</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-700 h-full transition-all duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}

          {/* Grid of uploaded files */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative rounded-xl border border-stone-300 bg-white overflow-hidden shadow-2xs flex flex-col"
              >
                {/* Visual Thumbnail */}
                <div
                  onClick={() => setViewingAttachment(att)}
                  className="h-24 w-full bg-stone-100 flex items-center justify-center cursor-pointer overflow-hidden relative"
                >
                  {att.type === 'image' && (
                    <img
                      src={att.url}
                      alt={att.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  {att.type === 'video' && (
                    <div className="flex flex-col items-center justify-center text-stone-600">
                      <Film className="w-8 h-8 text-amber-800" />
                      <span className="text-[10px] mt-1 font-mono uppercase">Video</span>
                    </div>
                  )}
                  {att.type === 'pdf' && (
                    <div className="flex flex-col items-center justify-center text-stone-600">
                      <FileText className="w-8 h-8 text-red-700" />
                      <span className="text-[10px] mt-1 font-mono uppercase">PDF</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>

                {/* Info & Remove affordance */}
                <div className="p-2 flex items-center justify-between text-xs bg-stone-50 border-t border-stone-200">
                  <div className="min-w-0 pr-1">
                    <p className="text-[11px] font-medium text-stone-800 truncate" title={att.name}>
                      {att.name}
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono">
                      {(att.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att)}
                    className="p-1 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            disabled={isSaving || isUploadingFiles}
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

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPickerModal
          currentLocation={location}
          onSelect={(loc) => setLocation(loc)}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* Voice Dictation Modal */}
      {showVoiceModal && (
        <VoiceDictationModal
          category={category}
          mood={mood}
          onInsert={(structuredText) => {
            setText((prev) => (prev ? `${prev}\n\n${structuredText}` : structuredText));
            setShowVoiceModal(false);
            setNotification({
              type: 'success',
              message: 'Spoken reflection structured & inserted into editor.',
            });
          }}
          onClose={() => setShowVoiceModal(false)}
        />
      )}

      {/* Media Viewer Modal */}
      {viewingAttachment && (
        <MediaViewerModal
          attachment={viewingAttachment}
          onClose={() => setViewingAttachment(null)}
        />
      )}
    </div>
  );
};
