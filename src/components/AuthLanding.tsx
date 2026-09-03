import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  Lock,
  BrainCircuit,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface AuthLandingProps {
  onLoginSuccess?: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Sign-in failure:', err);
      setErrorMsg(
        err?.message ||
          'Could not complete Google Sign-In. Please check your browser popup settings and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F5F5F0] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Main Card */}
        <div className="bg-[#FAF9F5] rounded-2xl border border-[#D1CDBE] shadow-sm p-6 sm:p-10">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFEEE8] border border-[#D1CDBE]/70 text-xs font-medium text-[#5A5A40] mb-6">
              <Shield className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Isolated Firestore Database &bull; Powered by Gemini AI</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-[#3D3C38] mb-4">
              Your Private Space for Mindful Reflections & AI Insights
            </h1>
            <p className="text-[#7C7A70] text-base sm:text-lg leading-relaxed mb-8">
              Write daily journals, engage in multi-turn reflective conversations with Gemini, and receive synthesized takeaways—all encrypted and securely stored in your personal Firestore database.
            </p>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-[#F8EFEF] border border-[#E2B6B6] text-[#7A3333] text-sm text-left flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#9C3838] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Authentication Notice</p>
                  <p className="text-xs mt-0.5 text-[#7A3333]">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Google Sign In Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <button
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-[#FAF9F5] font-medium text-base shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in securely...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                    <ArrowRight className="w-4 h-4 text-[#D1CDBE]" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Architectural Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-[#D1CDBE]/60">
            <div className="p-5 rounded-xl bg-[#EFEEE8]/70 border border-[#D1CDBE]/70">
              <div className="w-9 h-9 rounded-lg bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-[#3D3C38] text-base mb-1">
                Zero-Shared Isolation
              </h3>
              <p className="text-xs text-[#7C7A70] leading-relaxed">
                Owner-bound Firestore security rules enforce strict read/write authorization at <code className="text-[11px] bg-[#D1CDBE]/40 px-1 py-0.5 rounded text-[#3D3C38]">/users/{'{userId}'}</code>.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#EFEEE8]/70 border border-[#D1CDBE]/70">
              <div className="w-9 h-9 rounded-lg bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center mb-3">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-[#3D3C38] text-base mb-1">
                Multi-Turn Gemini Dialogue
              </h3>
              <p className="text-xs text-[#7C7A70] leading-relaxed">
                Engage in back-and-forth conversational reflection with empathetic guidance, blindspot discovery, and idea synthesis.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#EFEEE8]/70 border border-[#D1CDBE]/70">
              <div className="w-9 h-9 rounded-lg bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center mb-3">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-[#3D3C38] text-base mb-1">
                Auto-Summaries & History
              </h3>
              <p className="text-xs text-[#7C7A70] leading-relaxed">
                Gemini structures your entry with actionable key takeaways, mood metrics, and search-indexed reflection archives.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Architecture Transparency */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#7C7A70]">
            Authenticated via Firebase Authentication &bull; Database in Google Cloud Firestore &bull; API proxy via Express Node Server
          </p>
        </div>
      </div>
    </div>
  );
};
