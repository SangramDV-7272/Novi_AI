import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, RefreshCw, Check, X, Sparkles, AlertCircle, Volume2 } from 'lucide-react';
import { getAIRequestHeadersAndBody } from '../lib/aiSettingsState';

interface VoiceDictationModalProps {
  category?: string;
  mood?: string;
  onInsert: (structuredText: string) => void;
  onClose: () => void;
}

export const VoiceDictationModal: React.FC<VoiceDictationModalProps> = ({
  category,
  mood,
  onInsert,
  onClose,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isStructuring, setIsStructuring] = useState(false);
  const [structuredResult, setStructuredResult] = useState<string | null>(null);
  const [rawTranscript, setRawTranscript] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const preservedAudioBlobRef = useRef<Blob | null>(null);

  // Initialize SpeechRecognition if available in browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript + ' ';
          }
          setLiveTranscript(current.trim());
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition error:', e);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition initialization error:', err);
      }
    }

    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    setPermissionDenied(false);
    setStructuredResult(null);
    setRawTranscript(null);
    setLiveTranscript('');
    audioChunksRef.current = [];
    preservedAudioBlobRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        preservedAudioBlobRef.current = audioBlob;
        processAudioForStructuring(audioBlob, mimeType);
      };

      recorder.start(250); // collect in 250ms chunks
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start duration timer
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Start Web Speech Recognition if available
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // May already be running
        }
      }
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setErrorMessage(
          'Microphone permission was denied. Please allow microphone access in your browser settings to use voice dictation.'
        );
      } else {
        setErrorMessage('Unable to access audio device. Please check your microphone connection.');
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processAudioForStructuring = async (audioBlob: Blob, mimeType: string) => {
    setIsStructuring(true);
    setErrorMessage(null);

    try {
      // Convert audio blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1] || '';
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const audioBase64 = await base64Promise;

      const response = await fetch('/api/gemini/voice-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          liveTranscript,
          category,
          mood,
          ...getAIRequestHeadersAndBody(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setStructuredResult(data.structuredText || liveTranscript || '');
      setRawTranscript(data.rawTranscript || liveTranscript || '');
    } catch (err: any) {
      console.error('Structuring failed:', err);
      setErrorMessage(
        err.message || 'Failed to structure recording with Gemini. Your audio recording has been preserved.'
      );
      // If live transcript exists, provide it as draft so user never loses their thoughts
      if (liveTranscript) {
        setStructuredResult(liveTranscript);
      }
    } finally {
      setIsStructuring(false);
    }
  };

  const handleRetryStructuring = () => {
    if (preservedAudioBlobRef.current) {
      processAudioForStructuring(
        preservedAudioBlobRef.current,
        preservedAudioBlobRef.current.type || 'audio/webm'
      );
    } else if (liveTranscript) {
      processAudioForStructuring(new Blob([], { type: 'audio/webm' }), 'audio/webm');
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="voice-dictation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="voice-dictation-modal-container"
        className="relative w-full max-w-xl bg-[#FCFAF7] rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F5F2EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-stone-800">
                Voice Reflection Dictation
              </h3>
              <p className="text-xs text-stone-500 font-sans">
                Speak freely. Gemini will transcribe & structure your thoughts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Permission error banner */}
          {permissionDenied && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Microphone Access Needed</p>
                <p className="mt-1">{errorMessage}</p>
                <p className="mt-1 text-red-600">
                  You can continue writing your reflection manually in the editor.
                </p>
              </div>
            </div>
          )}

          {/* Recording & Dictation Controls */}
          {!structuredResult && !isStructuring && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              {isRecording ? (
                <div className="space-y-4">
                  {/* Pulsing visual recording indicator */}
                  <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full bg-red-500/30 animate-pulse" />
                    <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Mic className="w-8 h-8 animate-bounce" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      Listening… ({formatTime(recordingSeconds)})
                    </div>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      Speak your mind naturally. Pause whenever you like.
                    </p>
                  </div>

                  {/* Live transcript bubble */}
                  {liveTranscript && (
                    <div className="p-4 rounded-xl bg-[#F4EFE6] border border-stone-200 text-left text-sm text-stone-700 max-h-32 overflow-y-auto italic font-serif">
                      "{liveTranscript}"
                    </div>
                  )}

                  <button
                    id="stop-recording-btn"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-sm font-medium shadow-sm transition-colors"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Done Speaking — Structure Thoughts</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 rounded-full bg-[#EAE5D9] text-stone-700 flex items-center justify-center mx-auto shadow-inner">
                    <Mic className="w-9 h-9" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-serif font-medium text-stone-800">
                      Ready to Speak?
                    </h4>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto">
                      Talk about what happened, how you felt, or stream of consciousness.
                      Gemini will organize it into beautiful, thoughtful paragraphs.
                    </p>
                  </div>

                  <button
                    id="start-recording-btn"
                    onClick={startRecording}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium shadow-md transition-all hover:scale-[1.02]"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Voice Recording</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Structuring Progress State */}
          {isStructuring && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center animate-spin">
                <RefreshCw className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-serif font-medium text-stone-800 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>Structuring Your Reflection…</span>
                </h4>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Removing filler words and arranging your thoughts into a clear, cohesive narrative.
                </p>
              </div>
            </div>
          )}

          {/* Structured Result Preview & Confirmation */}
          {structuredResult && !isStructuring && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Error banner with preserved audio retry */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  {preservedAudioBlobRef.current && (
                    <button
                      onClick={handleRetryStructuring}
                      className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-medium transition-colors ml-2 shrink-0"
                    >
                      Retry Gemini
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-1.5 font-medium text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Structured Reflection Preview</span>
                </div>
                {rawTranscript && (
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-stone-500 hover:text-stone-800 underline transition-colors"
                  >
                    {showRaw ? 'Hide Raw Audio Transcript' : 'View Raw Audio Transcript'}
                  </button>
                )}
              </div>

              {/* Raw Transcript expandable */}
              {showRaw && rawTranscript && (
                <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-600 italic font-sans max-h-24 overflow-y-auto">
                  <p className="font-semibold not-italic mb-1 text-stone-700">Raw Words:</p>
                  "{rawTranscript}"
                </div>
              )}

              {/* Editable Structured Text Area */}
              <div className="space-y-1">
                <label className="text-xs text-stone-500 font-sans block">
                  You can edit or refine this text before inserting it into your reflection:
                </label>
                <textarea
                  id="structured-voice-textarea"
                  value={structuredResult}
                  onChange={(e) => setStructuredResult(e.target.value)}
                  rows={8}
                  className="w-full p-4 rounded-xl bg-[#FAF8F5] border border-stone-300 text-stone-800 font-serif text-base leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all shadow-inner"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <button
                  id="re-record-btn"
                  onClick={startRecording}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-record</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    id="discard-voice-btn"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-200/50 rounded-lg transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    id="insert-voice-btn"
                    onClick={() => onInsert(structuredResult)}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium shadow-sm transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Insert into Reflection</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
