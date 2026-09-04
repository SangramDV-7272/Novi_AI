import React, { useState } from 'react';
import {
  X,
  Calendar,
  MessageSquare,
  Copy,
  Check,
  Download,
  Bot,
  User,
  Wand2,
  MapPin,
  Paperclip,
  FileText,
  Film,
  ExternalLink,
  Eye,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { JournalEntry, MediaAttachment } from '../types';
import { InteractiveMapModal } from './InteractiveMapModal';
import { MediaViewerModal } from './MediaViewerModal';

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
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<MediaAttachment | null>(null);

  if (!entry) return null;

  const handleCopyMarkdown = () => {
    let md = `# ${entry.title || 'Untitled Reflection'}\n`;
    md += `**Date**: ${new Date(entry.createdAt).toLocaleDateString()}\n`;
    md += `**Category**: ${entry.category}\n`;
    md += `**Mood**: ${entry.mood}\n`;
    if (entry.location) {
      md += `**Location**: ${entry.location.placeName || entry.location.address} (${entry.location.address})\n`;
    }
    md += `\n## Journal Reflection\n${entry.initialText}\n\n`;

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

    if (entry.attachments && entry.attachments.length > 0) {
      md += `## Attachments\n`;
      entry.attachments.forEach((a) => {
        md += `- [${a.name}](${a.url}) (${a.type})\n`;
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
    md += `Date: ${new Date(entry.createdAt).toLocaleDateString()}\n`;
    if (entry.location) md += `Location: ${entry.location.address}\n`;
    md += `\n## Reflection\n${entry.initialText}\n\n`;
    if (entry.summary) md += `## AI Summary\n${entry.summary}\n\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(entry.title || 'reflection').toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const images = entry.attachments?.filter((a) => a.type === 'image') || [];
  const videos = entry.attachments?.filter((a) => a.type === 'video') || [];
  const pdfs = entry.attachments?.filter((a) => a.type === 'pdf') || [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#3D3C38]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="bg-[#FAF9F5] rounded-2xl border border-[#D1CDBE] shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-6 border-b border-[#D1CDBE] flex items-start justify-between gap-4 bg-[#EFEEE8]/60">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
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

                {/* Location Badge with Map Click */}
                {entry.location && (
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-900 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-md hover:bg-emerald-200 transition-colors cursor-pointer"
                    title="Open Google Map"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{entry.location.placeName || entry.location.address}</span>
                  </button>
                )}
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
            {/* Location Banner if set */}
            {entry.location && (
              <div
                onClick={() => setShowMapModal(true)}
                className="p-3.5 rounded-xl bg-[#EFECE3] border border-[#D1CDBE] flex items-center justify-between cursor-pointer hover:bg-[#EAE5D9] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-[#3D3C38] group-hover:text-emerald-900 transition-colors">
                      {entry.location.placeName || 'Reflection Location'}
                    </p>
                    <p className="text-xs text-[#7C7A70] truncate">{entry.location.address}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-800 shrink-0 ml-2 group-hover:underline">
                  View Map &rarr;
                </span>
              </div>
            )}

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

            {/* User's Original Writing (Rendered with Markdown if markdown format) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-[#7C7A70] uppercase tracking-wider font-sans">
                  Journal Entry {entry.bodyFormat === 'markdown' && <span className="text-[#5A5A40]">(Markdown)</span>}
                </h4>
              </div>

              <div className="p-5 rounded-xl bg-[#EFEEE8]/60 border border-[#D1CDBE] text-[#3D3C38] text-sm leading-relaxed font-serif">
                {entry.bodyFormat === 'markdown' ? (
                  <div className="prose prose-stone max-w-none text-sm leading-relaxed text-[#3D3C38]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {entry.initialText || '*No text provided.*'}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{entry.initialText || 'No initial text provided.'}</p>
                )}
              </div>
            </div>

            {/* Feature 2: Multimedia Attachments Section */}
            {entry.attachments && entry.attachments.length > 0 && (
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-semibold text-[#7C7A70] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Paperclip className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>Attachments ({entry.attachments.length})</span>
                </h4>

                {/* Images Grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setSelectedAttachment(img)}
                        className="group relative h-32 rounded-xl overflow-hidden border border-stone-300 bg-stone-100 cursor-pointer shadow-2xs"
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-5 h-5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Videos */}
                {videos.length > 0 && (
                  <div className="space-y-3">
                    {videos.map((vid) => (
                      <div key={vid.id} className="rounded-xl border border-stone-300 overflow-hidden bg-black">
                        <video src={vid.url} controls className="w-full max-h-72 object-contain" />
                        <div className="p-2 bg-stone-900 text-stone-300 text-xs flex justify-between">
                          <span className="truncate">{vid.name}</span>
                          <span className="font-mono">{(vid.size / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* PDFs */}
                {pdfs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pdfs.map((pdf) => (
                      <div
                        key={pdf.id}
                        className="p-3 rounded-xl border border-stone-300 bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-5 h-5 text-red-700 shrink-0" />
                          <div className="truncate">
                            <p className="font-medium text-stone-800 truncate">{pdf.name}</p>
                            <p className="text-[10px] text-stone-500 font-mono">
                              {(pdf.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <a
                          href={pdf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-medium shrink-0 p-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

      {/* Map Modal */}
      {showMapModal && entry.location && (
        <InteractiveMapModal
          location={entry.location}
          title={entry.title}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* Attachment Modal */}
      {selectedAttachment && (
        <MediaViewerModal
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </>
  );
};
