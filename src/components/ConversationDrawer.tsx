import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Wand2,
  RefreshCw,
  X,
  Lightbulb,
  Check,
} from 'lucide-react';
import type { ChatMessage, JournalEntry, GeminiChatResponse, GeminiSummaryResponse } from '../types';
import { getAIRequestHeadersAndBody } from '../lib/aiSettingsState';

interface ConversationDrawerProps {
  entry: JournalEntry;
  onUpdateEntry: (updated: JournalEntry) => Promise<void>;
  onClose?: () => void;
}

const QUICK_INQUIRIES = [
  'What patterns or cognitive blindspots do you notice?',
  'Help me identify one actionable micro-step for tomorrow.',
  'How can I look at this situation with more self-compassion?',
  'What are the positive takeaways from this experience?',
];

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  entry,
  onUpdateEntry,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(entry.messages || []);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Sync internal state when entry changes
  useEffect(() => {
    setMessages(entry.messages || []);
  }, [entry.id]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-user',
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsSending(true);
    setErrorMessage(null);

    try {
      // Call server-side Gemini chat endpoint
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          category: entry.category,
          mood: entry.mood,
          title: entry.title,
          ...getAIRequestHeadersAndBody(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data: GeminiChatResponse = await response.json();

      const aiMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-ai',
        role: 'model',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      // Persist conversation update to parent & Firestore
      const updatedEntry: JournalEntry = {
        ...entry,
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      };

      await onUpdateEntry(updatedEntry);
    } catch (err: any) {
      console.error('Error in conversation:', err);
      setErrorMessage(err?.message || 'Failed to receive AI response. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSummarizeSession = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: entry.initialText,
          messages: messages,
          category: entry.category,
          ...getAIRequestHeadersAndBody(),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to synthesize summary');
      }

      const data: GeminiSummaryResponse = await response.json();

      const updatedEntry: JournalEntry = {
        ...entry,
        title: entry.title && entry.title !== 'Untitled Reflection' ? entry.title : data.title,
        summary: data.summary,
        keyInsights: data.keyInsights,
        mood: data.detectedMood || entry.mood,
        messages: messages,
        updatedAt: new Date().toISOString(),
      };

      await onUpdateEntry(updatedEntry);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Summarize error:', err);
      setErrorMessage(err?.message || 'Failed to generate summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF9F5] border-l border-[#D1CDBE]">
      {/* Header */}
      <div className="p-4 border-b border-[#D1CDBE] bg-[#EFEEE8]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5A5A40]/10 border border-[#D1CDBE] flex items-center justify-center text-[#5A5A40]">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-serif font-bold text-[#3D3C38] leading-tight">
              Reflect with Gemini
            </h2>
            <p className="text-[11px] text-[#7C7A70]">Multi-turn AI reflection dialog</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="summarize-session-btn"
            onClick={handleSummarizeSession}
            disabled={isSummarizing || messages.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#E5E2D9] text-[#3D3C38] border border-[#D1CDBE]/80 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Synthesize conversation into key insights and summary"
          >
            {isSummarizing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5A5A40]" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-[#485942]" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 text-[#5A5A40]" />
            )}
            <span className="hidden sm:inline">
              {isSummarizing ? 'Synthesizing...' : saveSuccess ? 'Saved' : 'Synthesize'}
            </span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#E5E2D9] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Initial Prompt Note if present */}
        {entry.initialText && (
          <div className="p-3.5 rounded-xl bg-[#EAE8DD]/80 border border-[#D1CDBE] text-xs text-[#3D3C38]">
            <div className="flex items-center gap-1.5 font-semibold text-[#5A5A40] mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Initial Reflection Context</span>
            </div>
            <p className="line-clamp-3 text-[#5E5D57]">{entry.initialText}</p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-10 h-10 rounded-full bg-[#EFEEE8] text-[#5A5A40] mx-auto flex items-center justify-center mb-3 border border-[#D1CDBE]/70">
              <Sparkles className="w-5 h-5 text-[#5A5A40]" />
            </div>
            <p className="text-sm font-serif font-bold text-[#3D3C38] mb-1">
              Start your conversation with Gemini
            </p>
            <p className="text-xs text-[#7C7A70] max-w-xs mx-auto mb-4">
              Explore your thoughts, receive thoughtful follow-ups, and gain clarity.
            </p>

            <div className="space-y-1.5 text-left max-w-sm mx-auto">
              <p className="text-[11px] font-semibold text-[#7C7A70] uppercase tracking-wider pl-1 font-sans">
                Suggested Starters
              </p>
              {QUICK_INQUIRIES.map((inquiry, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(inquiry)}
                  className="w-full text-left p-2.5 rounded-lg bg-[#FAF9F5] border border-[#D1CDBE] hover:border-[#5A5A40] hover:bg-[#EAE8DD]/50 text-xs text-[#3D3C38] transition-colors cursor-pointer"
                >
                  &ldquo;{inquiry}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isModel = msg.role === 'model';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isModel ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${
                    isModel
                      ? 'bg-[#5A5A40] text-[#FAF9F5] shadow-2xs'
                      : 'bg-[#EFEEE8] text-[#3D3C38] border border-[#D1CDBE]'
                  }`}
                >
                  {isModel ? <Bot className="w-4 h-4 text-[#EAE8DD]" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    isModel
                      ? 'bg-[#FAF9F5] border border-[#D1CDBE] text-[#3D3C38] shadow-2xs whitespace-pre-wrap'
                      : 'bg-[#5A5A40] text-[#FAF9F5] shadow-2xs'
                  }`}
                >
                  <p>{msg.content}</p>
                  <span
                    className={`block text-[10px] mt-1.5 ${
                      isModel ? 'text-[#9C988D]' : 'text-[#D1CDBE]'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isSending && (
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-lg bg-[#5A5A40] text-[#EAE8DD] flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#FAF9F5] border border-[#D1CDBE] rounded-2xl px-4 py-3 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C7A70] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C7A70] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C7A70] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#F8EFEF] border border-[#E2B6B6] text-[#7A3333] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#9C3838] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">AI Interaction Notice</p>
              <p className="mt-0.5 text-[#7A3333]">{errorMessage}</p>
              <button
                onClick={() => handleSendMessage()}
                className="mt-2 text-xs font-semibold text-[#5A5A40] underline hover:no-underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Follow-up Pills */}
      {messages.length > 0 && !isSending && (
        <div className="px-4 py-2 border-t border-[#D1CDBE]/60 bg-[#EFEEE8]/60 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] text-[#7C7A70] font-medium whitespace-nowrap font-sans">Ask:</span>
          {QUICK_INQUIRIES.slice(0, 2).map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              className="text-[11px] text-[#3D3C38] bg-[#FAF9F5] border border-[#D1CDBE]/70 hover:bg-[#E5E2D9] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-3.5 bg-[#FAF9F5] border-t border-[#D1CDBE]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            id="gemini-chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your reflection or question..."
            disabled={isSending}
            className="flex-1 bg-[#EFEEE8]/70 border border-[#D1CDBE] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#3D3C38] placeholder:text-[#9C988D] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] disabled:opacity-60"
          />
          <button
            id="gemini-chat-send-btn"
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2.5 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-[#FAF9F5] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
