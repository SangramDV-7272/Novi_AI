import React, { useState } from 'react';
import {
  Shield,
  Lock,
  BrainCircuit,
  Database,
  ArrowRight,
  AlertCircle,
  BookOpen,
  MapPin,
  Paperclip,
  Mic,
  TrendingUp,
  Activity,
  ClipboardList,
  Sparkles,
  Heart,
  HelpCircle,
  X,
  FileCheck2,
} from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface AuthLandingProps {
  onLoginSuccess?: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'contact' | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      if (user && onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      const isUserCancellation =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.code === 'auth/cancelled-popup-request';

      if (isUserCancellation) {
        return;
      }

      if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        console.error('Sign-in failure:', err);
        setErrorMsg(
          err?.message ||
            'Could not complete Google Sign-In. Please check your browser popup settings and try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const featureItems = [
    {
      icon: BookOpen,
      title: 'Journaling & Mood Tagging',
      description: 'Capture daily stream-of-consciousness entries with mood labels, tags, and category filters.',
    },
    {
      icon: BrainCircuit,
      title: 'AI-Guided Reflection Dialogue',
      description: 'Engage in multi-turn conversational exploration with compassionate, non-judgmental Gemini guidance.',
    },
    {
      icon: Database,
      title: 'Auto-Summaries & History',
      description: 'Receive synthesized core takeaways, key insights, and an organized chronological reflection timeline.',
    },
    {
      icon: MapPin,
      title: 'Location Tagging',
      description: 'Pin where meaningful insights and moments of clarity occurred using OpenStreetMap geocoding.',
    },
    {
      icon: Paperclip,
      title: 'Multimedia Attachments',
      description: 'Enrich reflections with photos, audio notes, video clips, Markdown snippets, and PDF documents.',
    },
    {
      icon: Mic,
      title: 'Voice Dictation',
      description: 'Speak your thoughts aloud naturally with instant in-browser speech-to-text transcription.',
    },
    {
      icon: TrendingUp,
      title: 'Insights & Mood Graphs',
      description: 'Visualize emotional intensity, multi-period mood trajectories, and positive breakthroughs over time.',
    },
    {
      icon: Activity,
      title: 'Mood Check-Ins & Streaks',
      description: 'Log 30-second rapid emotional pulses with activities, notes, and gentle evening streak reminders.',
    },
    {
      icon: ClipboardList,
      title: 'Shareable Therapist Reports',
      description: 'Generate structured clinical summaries with custom entry selection, PDF export, and access keys.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#3D3C38] flex flex-col justify-between selection:bg-[#5A5A40] selection:text-[#FAF9F5]">
      {/* Top Hero Section */}
      <div className="pt-10 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto w-full">
          {/* Main Hero Card */}
          <div className="bg-[#FAF9F5] rounded-3xl border border-[#D1CDBE] shadow-xs p-6 sm:p-12">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFEEE8] border border-[#D1CDBE]/70 text-xs font-medium text-[#5A5A40] mb-6">
                <Shield className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Isolated Firestore Database &bull; Powered by Gemini AI</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-[#3D3C38] mb-4 leading-tight">
                Your Private Space for Mindful Reflections & AI Insights
              </h1>
              <p className="text-[#7C7A70] text-base sm:text-lg leading-relaxed mb-8">
                Write daily journals, engage in multi-turn reflective conversations with Gemini, and receive synthesized takeaways—all encrypted and securely stored in your personal Firestore database.
              </p>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-6 p-4 rounded-2xl bg-[#F8EFEF] border border-[#E2B6B6] text-[#7A3333] text-sm text-left flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#9C3838] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Authentication Notice</p>
                    <p className="text-xs mt-0.5 text-[#7A3333]">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Google Sign In Button */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                <button
                  id="google-signin-btn"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-2xl bg-[#5A5A40] hover:bg-[#484833] text-[#FAF9F5] font-medium text-base shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

              <p className="text-[11px] text-[#7C7A70] tracking-wide">
                No password to create &bull; Free instant sign-in with Google OAuth
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FULL FEATURES SECTION */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-[#EFEEE8]/60 border-y border-[#D1CDBE]/70">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF9F5] border border-[#D1CDBE] text-[11px] font-semibold text-[#5A5A40] uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-[#875F23]" />
              <span>Comprehensive Toolset</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#3D3C38] mb-2">
              Everything You Need for Mindful Self-Discovery
            </h2>
            <p className="text-xs sm:text-sm text-[#7C7A70] leading-relaxed">
              Designed from the ground up to nurture emotional clarity, habit consistency, and private reflection without noise.
            </p>
          </div>

          {/* 9 Feature Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureItems.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#D1CDBE] shadow-2xs hover:border-[#5A5A40]/40 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/10 text-[#5A5A40] flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif font-bold text-[#3D3C38] text-base mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-[#7C7A70] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-[#FAF9F5] rounded-3xl border border-[#D1CDBE] p-8 sm:p-12 shadow-2xs">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFEEE8] border border-[#D1CDBE] text-[11px] font-semibold text-[#5A5A40] uppercase tracking-wider mb-3">
                <Heart className="w-3 h-3 text-[#875F23]" />
                <span>Our Philosophy</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#3D3C38] mb-4">
                About Mindful Reflections
              </h2>
              <p className="text-sm sm:text-base text-[#5E5D57] leading-relaxed mb-4">
                Mindful Reflections is a dedicated sanctuary for quiet contemplation in a hyperconnected world. It blends traditional expressive journaling with empathetic, multi-turn AI facilitation—helping you unravel complex thoughts, discover blindspots, and observe emotional patterns with kindness.
              </p>
              <h3 className="text-base font-serif font-bold text-[#3D3C38] mt-6 mb-2">
                Who It&rsquo;s Built For:
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#7C7A70]">
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5A5A40] mt-2 shrink-0" />
                  <span><strong>Mindful Thinkers & Journalers:</strong> Anyone wanting an unhurried, distraction-free space to record thoughts, voice memos, and photos.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5A5A40] mt-2 shrink-0" />
                  <span><strong>Therapy & Counseling Clients:</strong> Individuals who want to bring clear summaries, mood trends, and specific breakthroughs to their sessions without scrambling through messy notes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5A5A40] mt-2 shrink-0" />
                  <span><strong>Those Seeking Clarity & Grounding:</strong> People navigating life transitions, burnout, or daily anxiety who benefit from gentle breathing exercises and non-judgmental guided inquiries.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY & SECURITY INFO BLOCK */}
      <section className="pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto w-full">
          <div className="p-8 sm:p-10 rounded-3xl bg-[#FAF9F5] border border-[#CAD5C6] shadow-2xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#5A5A40] text-white flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#3D3C38]">
                  Privacy, Data Security & Health Advisory
                </h2>
                <p className="text-xs text-[#7C7A70]">
                  How your private reflections and personal well-being information are guarded.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#D1CDBE]">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#3D3C38]">
                  <Shield className="w-4 h-4 text-[#5A5A40]" />
                  <span>Owner-Isolated Firestore</span>
                </div>
                <p className="text-xs text-[#7C7A70] leading-relaxed">
                  Every reflection, check-in, and report snapshot is stored under <code className="bg-[#EFEEE8] px-1 py-0.5 rounded text-[11px] text-[#3D3C38]">/users/{'{userId}'}</code>. Strict security rules forbid any cross-user reads or public exposure.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#3D3C38]">
                  <FileCheck2 className="w-4 h-4 text-[#5A5A40]" />
                  <span>Google Sign-In Only</span>
                </div>
                <p className="text-xs text-[#7C7A70] leading-relaxed">
                  We never ask for or store passwords. Authentication is handled directly through Google&rsquo;s OAuth 2.0 protocol with encrypted identity tokens and state isolation.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#875F23]">
                  <AlertCircle className="w-4 h-4 text-[#875F23]" />
                  <span>Wellness & Medical Notice</span>
                </div>
                <p className="text-xs text-[#7C7A70] leading-relaxed">
                  Mindful Reflections and its Gemini AI features are designed purely for self-reflection and personal growth. They do not constitute psychotherapy, medical advice, or psychiatric treatment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-[#D1CDBE] bg-[#FAF9F5] text-xs text-[#7C7A70]">
        <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[#3D3C38] text-sm">
              Mindful Reflections
            </span>
            <span>&bull;</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-medium text-[#5E5D57]">
            <button
              type="button"
              onClick={() => setActiveModal('privacy')}
              className="hover:text-[#3D3C38] underline-offset-4 hover:underline cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('terms')}
              className="hover:text-[#3D3C38] underline-offset-4 hover:underline cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('contact')}
              className="hover:text-[#3D3C38] underline-offset-4 hover:underline cursor-pointer"
            >
              Contact & Support
            </button>
          </div>
        </div>
      </footer>

      {/* Informational Modal for Footer Links */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F5] rounded-3xl border border-[#D1CDBE] shadow-xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-lg text-[#3D3C38]">
                {activeModal === 'privacy' && 'Privacy Policy'}
                {activeModal === 'terms' && 'Terms of Service'}
                {activeModal === 'contact' && 'Contact & Support'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-[#EFEEE8] text-[#7C7A70] hover:text-[#3D3C38] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-[#5E5D57] leading-relaxed space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {activeModal === 'privacy' && (
                <>
                  <p>
                    <strong>Your Privacy Matters:</strong> Mindful Reflections stores your journaling entries, voice notes, check-ins, and attachments in your isolated Firestore database space.
                  </p>
                  <p>
                    <strong>AI Data Processing:</strong> Conversations with Gemini are transmitted securely via backend proxy routes solely for the duration of generating your reflection responses and summaries.
                  </p>
                  <p>
                    <strong>Third-Party Sharing:</strong> We do not sell, rent, or trade your personal journal records or emotional check-in history to advertisers or third parties.
                  </p>
                </>
              )}

              {activeModal === 'terms' && (
                <>
                  <p>
                    <strong>Personal Use:</strong> Mindful Reflections is provided for personal reflection, wellness tracking, and journaling purposes.
                  </p>
                  <p>
                    <strong>Not a Crisis Service:</strong> The application does not provide crisis intervention, psychotherapy, or emergency care. In an emergency, please contact 988 or your local emergency services immediately.
                  </p>
                  <p>
                    <strong>Data Responsibility:</strong> You retain ownership of your journal content. You can delete individual reflections, check-in logs, or reports at any time.
                  </p>
                </>
              )}

              {activeModal === 'contact' && (
                <>
                  <p>
                    Have questions, feature suggestions, or feedback on your mindful journaling experience?
                  </p>
                  <div className="p-3.5 rounded-2xl bg-white border border-[#D1CDBE] space-y-1">
                    <p className="font-semibold text-[#3D3C38]">Support & Feedback Channel</p>
                    <p className="text-[#7C7A70]">Email: support@mindfulreflections.app</p>
                    <p className="text-[#7C7A70]">Hours: Monday &ndash; Friday, 9am &ndash; 5pm PST</p>
                  </div>
                  <p className="text-[11px] text-[#7C7A70]">
                    We respond to all user inquiries regarding accessibility, feature requests, and account privacy within 24–48 hours.
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#D1CDBE] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

