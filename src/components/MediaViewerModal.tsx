import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';
import type { MediaAttachment } from '../types';

interface MediaViewerModalProps {
  attachment: MediaAttachment;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  attachment,
  onClose,
}) => {
  return (
    <div
      id="media-viewer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="media-viewer-modal-container"
        className="relative max-w-4xl w-full bg-stone-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-stone-950/70 border-b border-stone-800 text-stone-300">
          <span className="text-xs font-medium truncate max-w-md">{attachment.name}</span>
          <div className="flex items-center gap-3">
            <a
              href={attachment.url}
              download={attachment.name}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
              title="Download or Open File"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-stone-950/90">
          {attachment.type === 'image' && (
            <img
              src={attachment.url}
              alt={attachment.name}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] max-w-full object-contain rounded-lg"
            />
          )}

          {attachment.type === 'video' && (
            <video
              src={attachment.url}
              controls
              autoPlay
              className="max-h-[75vh] max-w-full rounded-lg"
            />
          )}

          {attachment.type === 'pdf' && (
            <div className="w-full h-[70vh] flex flex-col items-center justify-center bg-stone-900 rounded-lg p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/40 text-red-400 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-stone-200 text-sm font-medium">{attachment.name}</h4>
                <p className="text-stone-400 text-xs mt-1">
                  {(attachment.size / (1024 * 1024)).toFixed(2)} MB PDF Document
                </p>
              </div>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
              >
                <span>Open PDF Document in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
