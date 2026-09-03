import React, { useState } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  Download,
  Share2,
  Bot,
  User,
  Heart,
  Zap,
  Smile,
  CloudRain,
  MinusCircle,
  Wand2,
} from 'lucide-react';
import type { JournalEntry } from '../types';

interface EntryDetailModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onContinueChat: (entry: JournalEntry) => void;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  entry,
  onClose,
  onContinueChat,
}) => {
  const [copied, setCopied] = useState(false);

  if (!entry) return null;

  const handleCopyMarkdown = () => {
    let md = `# ${entry.title || 'Untitled Reflection'}\n`;
    md += `**Date**: ${new Date(entry.createdAt).toLocaleDateString()}\n`;
    md += `**Category**: ${entry.category}\n`;
    md += `**Mood**: ${entry.mood}\n\n`;
    md += `## Journal Reflection\n${entry.initialText}\n\n`;

    if (entry.summary) {
      md += `## AI Synthesized Summary\n${entry.summary}\n\n`;
    }

    if (entry.keyInsights && entry.keyInsights.length > 0) {
      md += `## Key Takeaways\n`;
      entry.keyInsights.forEach((item) => {
        md += `- ${item}\n`;
      });
      md += `\n`;
    }

    if (entry.messages && entry.messages.length > 0) {
      md += `## Gemini Conversation Transcript\n`;
      entry.messages.forEach((msg) => {
        md += `**${msg.role === 'model' ? 'Gemini' : 'User'}**: ${msg.content}\n\n`;
      });
    }

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    let md = `# ${entry.title || 'Untitled Reflection'}\n`;
    md += `Date: ${new Date(entry.createdAt).toLocaleDateString()}\n\n`;
    md += `## Reflection\n${entry.initialText}\n\n`;
    if (entry.summary) md += `## AI Summary\n${entry.summary}\n\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(entry.title || 'reflection').toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#3D3C38]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#FAF9F5] rounded-2xl border border-[#D1CDBE] shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-[#D1CDBE] flex items-start justify-between gap-4 bg-[#EFEEE8]/60">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-[#5A5A40] uppercase tracking-wider bg-[#EAE8DD] border border-[#D1CDBE] px-2.5 py-0.5 rounded-md font-sans">
                {entry.category}
              </span>
              <span className="text-xs text-[#7C7A70] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(entry.createdAt).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <h2 className="text-xl font-serif font-bold text-[#3D3C38] leading-snug">
              {entry.title || 'Untitled Reflection'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyMarkdown}
              title="Copy as Markdown"
              className="p-2 rounded-lg text-[#5E5D57] hover:bg-[#E5E2D9] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-[#485942]" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              title="Download Markdown"
              className="p-2 rounded-lg text-[#5E5D57] hover:bg-[#E5E2D9] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#E5E2D9] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Summary Card if present */}
          {entry.summary && (
            <div className="p-4 rounded-xl bg-[#EAE8DD]/80 border border-[#D1CDBE]">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4 text-[#5A5A40]" />
                <h4 className="text-xs font-serif font-bold text-[#3D3C38] uppercase tracking-wider">
                  AI Synthesized Reflection
                </h4>
              </div>
              <p className="text-sm text-[#3D3C38] leading-relaxed italic mb-3">
                &ldquo;{entry.summary}&rdquo;
              </p>

              {entry.keyInsights && entry.keyInsights.length > 0 && (
                <div className="pt-2 border-t border-[#D1CDBE]/70">
                  <p className="text-[11px] font-semibold text-[#5A5A40] uppercase tracking-wider mb-1.5 font-sans">
                    Actionable Takeaways & Insights
                  </p>
                  <ul className="space-y-1">
                    {entry.keyInsights.map((insight, idx) => (
                      <li key={idx} className="text-xs text-[#5E5D57] flex items-start gap-1.5">
                        <span className="text-[#5A5A40] font-bold">&check;</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* User's Original Writing */}
          <div>
            <h4 className="text-xs font-semibold text-[#7C7A70] uppercase tracking-wider mb-2 font-sans">
              Journal Entry
            </h4>
            <div className="p-4 rounded-xl bg-[#EFEEE8]/60 border border-[#D1CDBE] text-[#3D3C38] text-sm leading-relaxed whitespace-pre-wrap font-normal">
              {entry.initialText || 'No initial text provided.'}
            </div>
          </div>

          {/* Gemini Conversation Turns */}
          {entry.messages && entry.messages.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[#7C7A70] uppercase tracking-wider mb-3 flex items-center gap-1.5 font-sans">
                <MessageSquare className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Conversation Transcript ({entry.messages.length} messages)</span>
              </h4>

              <div className="space-y-3">
                {entry.messages.map((msg) => {
                  const isAi = msg.role === 'model';
                  return (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                        isAi
                          ? 'bg-[#FAF9F5] border-[#D1CDBE] text-[#3D3C38]'
                          : 'bg-[#5A5A40] text-[#FAF9F5] border-[#5A5A40]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {isAi ? (
                          <>
                            <Bot className="w-3.5 h-3.5 text-[#875F23]" />
                            <span className="font-semibold text-[#3D3C38] text-xs font-sans">Gemini AI</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-[#EAE8DD]" />
                            <span className="font-semibold text-[#FAF9F5] text-xs font-sans">You</span>
                          </>
                        )}
                        <span
                          className={`text-[10px] ml-auto ${
                            isAi ? 'text-[#9C988D]' : 'text-[#D1CDBE]'
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D1CDBE] bg-[#EFEEE8]/60 flex items-center justify-between">
          <span className="text-xs text-[#7C7A70]">
            Isolated Document in Firestore
          </span>
          <button
            onClick={() => {
              onClose();
              onContinueChat(entry);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-[#FAF9F5] text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-2xs"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Continue Conversation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
