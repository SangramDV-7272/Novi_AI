import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Plus,
  BookOpen,
  ShieldCheck,
  AlertCircle,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  MessageSquare,
  Smile,
  Bell,
  X,
  Check,
  FlaskConical,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { AuthLanding } from './components/AuthLanding';
import { EntryEditor } from './components/EntryEditor';
import { ConversationDrawer } from './components/ConversationDrawer';
import { EntryCard } from './components/EntryCard';
import { EntryDetailModal } from './components/EntryDetailModal';
import { StatsBar } from './components/StatsBar';
import { InsightsSection } from './components/InsightsSection';
import { CheckInModal } from './components/CheckInModal';
import { CheckInHistoryModal } from './components/CheckInHistoryModal';
import { RemindersSettingsModal } from './components/RemindersSettingsModal';
import { TherapistReportModal } from './components/TherapistReportModal';
import { BreathingExerciseModal } from './components/BreathingExerciseModal';
import { SharedReportViewer } from './components/SharedReportViewer';
import { AISettingsModal } from './components/AISettingsModal';
import {
  subscribeToAuth,
  signOutUser,
  fetchUserEntries,
  saveJournalEntry,
  deleteEntryFromFirestore,
  setSimulateDeleteFailure,
  fetchUserCheckIns,
  saveUserCheckIn,
  deleteUserCheckIn,
  fetchUserReminderSettings,
  saveUserReminderSettings,
  fetchUserTherapistReports,
  saveTherapistReport,
  deleteTherapistReport,
  revokeTherapistReport,
  fetchUserAISettings,
} from './lib/firebase';
import { setGlobalAISettings } from './lib/aiSettingsState';
import type {
  UserProfile,
  JournalEntry,
  MediaAttachment,
  CheckInRecord,
  ReminderSettings,
  TherapistReportData,
  UserAISettings,
} from './types';

interface DeleteErrorState {
  entryId: string;
  entryTitle: string;
  attachments?: MediaAttachment[];
  errorMessage: string;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Delete reflection error & diagnostic states
  const [deleteError, setDeleteError] = useState<DeleteErrorState | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);
  const [simulateNetworkError, setSimulateNetworkError] = useState(false);
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState(false);

  // Shared report token from query string (?sharedReport=token)
  const [sharedReportToken, setSharedReportToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('sharedReport');
    }
    return null;
  });

  // Navigation tab: 'reflections' | 'insights'
  const [activeTab, setActiveTab] = useState<'reflections' | 'insights'>('reflections');

  // Feature 5: Check-in records & reminders state
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings | null>(null);
  const [isReminderDismissed, setIsReminderDismissed] = useState(false);

  // Feature 6: Therapist Reports
  const [savedReports, setSavedReports] = useState<TherapistReportData[]>([]);

  // Bring Your Own Key (BYOK) AI Settings State
  const [aiSettings, setAISettings] = useState<UserAISettings | null>(null);

  // Modals state
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState<CheckInRecord | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [isTherapistReportModalOpen, setIsTherapistReportModalOpen] = useState(false);
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState(false);
  const [isAISettingsModalOpen, setIsAISettingsModalOpen] = useState(false);

  // Active reflection view states
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [initialPromptForNewEntry, setInitialPromptForNewEntry] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [chattingEntry, setChattingEntry] = useState<JournalEntry | null>(null);
  const [viewingDetailEntry, setViewingDetailEntry] = useState<JournalEntry | null>(null);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Subscribe to Firebase Authentication
  useEffect(() => {
    const unsubscribe = subscribeToAuth((authUser) => {
      if (authUser) {
        setUser({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
        });
      } else {
        setUser(null);
        setEntries([]);
        setCheckIns([]);
        setSavedReports([]);
        setAISettings(null);
        setGlobalAISettings(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch entries & check-ins whenever user logs in
  const loadUserData = async (userId: string) => {
    setEntriesLoading(true);
    setErrorBanner(null);
    try {
      const [entriesData, checkInsData, remSettings, reportsData, userAISettings] = await Promise.all([
        fetchUserEntries(userId),
        fetchUserCheckIns(userId),
        fetchUserReminderSettings(userId),
        fetchUserTherapistReports(userId),
        fetchUserAISettings(userId),
      ]);
      setEntries(entriesData);
      setCheckIns(checkInsData);
      setReminderSettings(remSettings);
      setSavedReports(reportsData);
      setAISettings(userAISettings);
      setGlobalAISettings(userAISettings);
    } catch (err: any) {
      console.error('Failed to load user data from Firestore:', err);
      setErrorBanner('Could not load your saved reflections. Please refresh or try again.');
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadUserData(user.uid);
    }
  }, [user?.uid]);

  // Calculate user streak (consecutive active days with reflections or check-ins)
  const streakCount = useMemo(() => {
    const activeDates = new Set<string>();
    entries.forEach((e) => {
      activeDates.add(new Date(e.createdAt).toDateString());
    });
    checkIns.forEach((c) => {
      activeDates.add(new Date(c.createdAt).toDateString());
    });

    let currentStreak = 0;
    const now = new Date();
    // Check today or yesterday
    let checkDate = new Date(now);
    const todayStr = checkDate.toDateString();
    const hasToday = activeDates.has(todayStr);

    if (!hasToday) {
      // check if yesterday had an entry
      checkDate.setDate(checkDate.getDate() - 1);
      if (!activeDates.has(checkDate.toDateString())) {
        return 0;
      }
    }

    // Count backwards
    while (activeDates.has(checkDate.toDateString())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return currentStreak;
  }, [entries, checkIns]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setIsCreatingNew(false);
      setEditingEntry(null);
      setChattingEntry(null);
      setViewingDetailEntry(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Save handler (used by Editor & Conversation drawer)
  const handleSaveEntry = async (entryToSave: JournalEntry) => {
    if (!user?.uid) return;
    try {
      await saveJournalEntry(user.uid, entryToSave);

      // Trigger celebratory confetti on initial or new reflections
      if (!entries.some((e) => e.id === entryToSave.id)) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#4f46e5', '#10b981', '#f59e0b'],
          });
        } catch {
          // ignore confetti failures gracefully
        }
      }

      setEntries((prev) => {
        const existingIdx = prev.findIndex((e) => e.id === entryToSave.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = entryToSave;
          return updated;
        } else {
          return [entryToSave, ...prev];
        }
      });

      // If we are currently chatting with this entry, keep it updated
      if (chattingEntry?.id === entryToSave.id) {
        setChattingEntry(entryToSave);
      }

      setIsCreatingNew(false);
      setEditingEntry(null);
      setInitialPromptForNewEntry(null);
    } catch (err: any) {
      console.error('Save entry failed:', err);
      throw err;
    }
  };

  // Delete reflection handler with immediate UI update, optimistic rollback, and clear retry error toast
  const handleDeleteEntry = async (entryId: string, attachments?: MediaAttachment[]) => {
    if (!user?.uid) {
      setDeleteError({
        entryId,
        entryTitle: 'Reflection',
        attachments,
        errorMessage: 'Authentication required. Please sign in to delete reflections.',
      });
      return;
    }

    const targetEntry = entries.find((e) => e.id === entryId);
    const entryTitle = targetEntry?.title || 'Reflection';

    // Clear prior error and success states
    setDeleteError(null);
    setDeleteSuccessToast(null);
    setDeletingEntryId(entryId);

    // Snapshot current state for rollback if deletion fails
    const previousEntries = [...entries];

    // 1. Immediately update UI list (no refresh needed)
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    if (chattingEntry?.id === entryId) setChattingEntry(null);
    if (viewingDetailEntry?.id === entryId) setViewingDetailEntry(null);

    try {
      // 2. Perform Firestore & Storage delete
      await deleteEntryFromFirestore(user.uid, entryId, attachments);
      setDeleteSuccessToast(`"${entryTitle}" was removed.`);
      setTimeout(() => {
        setDeleteSuccessToast((curr) => (curr ? null : curr));
      }, 4000);
    } catch (err: any) {
      console.error('Delete entry failed:', err);
      // 3. Rollback UI on failure so user does not lose their reflection
      setEntries(previousEntries);
      // 4. Show clear error toast with retry option (never fail silently)
      setDeleteError({
        entryId,
        entryTitle,
        attachments,
        errorMessage:
          err?.message || 'Database error: Could not complete deletion in Firestore.',
      });
    } finally {
      setDeletingEntryId(null);
    }
  };

  // Toggle simulate network error for testing
  const handleToggleSimulateError = (enabled: boolean) => {
    setSimulateNetworkError(enabled);
    setSimulateDeleteFailure(enabled);
  };

  // Create a quick test entry to verify deletion with or without attachments
  const handleCreateTestEntry = async (withAttachments: boolean) => {
    if (!user?.uid) return;
    const testId = 'test-' + Date.now();
    const testEntry: JournalEntry = {
      id: testId,
      userId: user.uid,
      title: withAttachments ? 'Test Reflection (With Media)' : 'Test Reflection (No Media)',
      category: 'Daily Reflection',
      mood: 'thoughtful',
      initialText: withAttachments
        ? 'Test reflection created to confirm that deletion properly removes documents and attached media items from Firestore without error.'
        : 'Test reflection created to confirm that deletion immediately removes documents from Firestore and the UI list.',
      bodyFormat: 'plain',
      location: null,
      attachments: withAttachments
        ? [
            {
              id: 'sample-media-1',
              name: 'mindful-scene.jpg',
              type: 'image',
              mimeType: 'image/jpeg',
              url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
              size: 102400,
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
      summary: withAttachments
        ? 'Contains 1 media attachment for cascade deletion testing.'
        : 'Zero media attachments.',
      keyInsights: ['Deletion testing', 'UI optimistic update'],
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await handleSaveEntry(testEntry);
      setDeleteSuccessToast(`Created "${testEntry.title}". You can now test deleting it.`);
    } catch (err: any) {
      setErrorBanner('Failed to create test reflection: ' + (err?.message || String(err)));
    }
  };

  // Check-In Handlers
  const handleSaveCheckIn = async (record: CheckInRecord) => {
    if (!user?.uid) return;
    await saveUserCheckIn(user.uid, record);
    setCheckIns((prev) => {
      const idx = prev.findIndex((c) => c.id === record.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = record;
        return updated;
      }
      return [record, ...prev];
    });
  };

  const handleDeleteCheckIn = async (recordId: string) => {
    if (!user?.uid) return;
    await deleteUserCheckIn(user.uid, recordId);
    setCheckIns((prev) => prev.filter((c) => c.id !== recordId));
  };

  // Reminders Settings Save Handler
  const handleSaveReminderSettings = async (settings: ReminderSettings) => {
    if (!user?.uid) return;
    await saveUserReminderSettings(user.uid, settings);
    setReminderSettings(settings);
  };

  // Therapist Report Handlers
  const handleSaveReport = async (report: TherapistReportData) => {
    if (!user?.uid) return;
    await saveTherapistReport(user.uid, report);
    setSavedReports((prev) => {
      const idx = prev.findIndex((r) => r.id === report.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = report;
        return updated;
      }
      return [report, ...prev];
    });
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!user?.uid) return;
    await deleteTherapistReport(user.uid, reportId);
    setSavedReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const handleRevokeReport = async (reportId: string) => {
    if (!user?.uid) return;
    await revokeTherapistReport(user.uid, reportId);
    setSavedReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, isRevoked: true } : r))
    );
  };

  // Filtered reflections list
  const filteredEntries = entries.filter((e) => {
    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      e.title.toLowerCase().includes(q) ||
      (e.summary && e.summary.toLowerCase().includes(q)) ||
      e.initialText.toLowerCase().includes(q) ||
      (e.keyInsights && e.keyInsights.some((ins) => ins.toLowerCase().includes(q)));
    return matchesCategory && matchesSearch;
  });

  // Handle Shared Report direct link
  if (sharedReportToken) {
    return (
      <SharedReportViewer
        shareToken={sharedReportToken}
        onExit={() => {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/');
          }
          setSharedReportToken(null);
        }}
      />
    );
  }

  // Auth Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#5A5A40] text-[#EAE8DD] mx-auto flex items-center justify-center mb-4 shadow-sm animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-serif font-semibold text-[#3D3C38]">Connecting to secure session...</p>
          <p className="text-xs text-[#7C7A70] mt-1">Verifying Firebase Authentication</p>
        </div>
      </div>
    );
  }

  // Not signed in: render landing page
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] text-[#3D3C38]">
        <Navbar
          user={null}
          onSignOut={() => {}}
          onNewEntry={() => {}}
          entriesCount={0}
        />
        <AuthLanding onLoginSuccess={() => {}} />
      </div>
    );
  }

  // Determine if reminder prompt should be shown today
  const shouldShowGentleReminder =
    Boolean(reminderSettings?.enabled) &&
    !isReminderDismissed &&
    !checkIns.some((c) => new Date(c.createdAt).toDateString() === new Date().toDateString()) &&
    !entries.some((e) => new Date(e.createdAt).toDateString() === new Date().toDateString());

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#3D3C38] flex flex-col font-sans">
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onNewEntry={() => {
          setActiveTab('reflections');
          setEditingEntry(null);
          setInitialPromptForNewEntry(null);
          setIsCreatingNew(true);
        }}
        entriesCount={entries.length}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'insights') {
            setIsCreatingNew(false);
            setEditingEntry(null);
          }
        }}
        onQuickCheckIn={() => {
          setEditingCheckIn(null);
          setIsCheckInModalOpen(true);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Gentle Daily Reminder Banner (if enabled and user hasn't logged today) */}
        {shouldShowGentleReminder && (
          <div className="mb-6 p-4 rounded-2xl bg-[#FAF9F5] border border-[#CAD5C6] shadow-2xs flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#5A5A40] text-white flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#3D3C38]">
                  Gentle Daily Pause &bull; Keep your {streakCount}d streak going
                </p>
                <p className="text-[11px] text-[#7C7A70]">
                  How are you feeling this evening? Take a 30-second pause to record a quick check-in.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingCheckIn(null);
                  setIsCheckInModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#5A5A40] text-white text-xs font-medium hover:bg-[#484833] cursor-pointer"
              >
                Quick Check-In
              </button>
              <button
                type="button"
                onClick={() => setIsReminderDismissed(true)}
                className="p-1.5 text-[#7C7A70] hover:text-[#3D3C38] cursor-pointer"
                title="Dismiss for now"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {errorBanner && (
          <div className="mb-6 p-4 rounded-xl bg-[#F8EFEF] border border-[#E2B6B6] text-[#7A3333] text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#9C3838] shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => user && loadUserData(user.uid)}
              className="text-xs font-semibold text-[#5A5A40] underline hover:no-underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* VIEW 1: PRIVATE INSIGHTS SECTION (FEATURE 4, 5, 6) */}
        {activeTab === 'insights' ? (
          <InsightsSection
            entries={entries}
            checkIns={checkIns}
            streakCount={streakCount}
            onStartNewReflectionWithPrompt={(prompt) => {
              setInitialPromptForNewEntry(prompt);
              setEditingEntry(null);
              setIsCreatingNew(true);
              setActiveTab('reflections');
            }}
            onOpenCheckIn={() => {
              setEditingCheckIn(null);
              setIsCheckInModalOpen(true);
            }}
            onOpenHistory={() => setIsHistoryModalOpen(true)}
            onOpenReminders={() => setIsRemindersModalOpen(true)}
            onOpenTherapistReport={() => setIsTherapistReportModalOpen(true)}
            onOpenBreathingModal={() => setIsBreathingModalOpen(true)}
          />
        ) : (
          /* VIEW 2: REFLECTIONS & JOURNAL WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Left / Center Area */}
            <div className={chattingEntry ? 'lg:col-span-7' : 'lg:col-span-12'}>
              {/* If creating new or editing an entry */}
              {isCreatingNew || editingEntry ? (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-serif font-bold text-[#3D3C38]">
                      {editingEntry ? 'Edit Reflection' : 'New Journal Reflection'}
                    </h2>
                    <button
                      onClick={() => {
                        setIsCreatingNew(false);
                        setEditingEntry(null);
                        setInitialPromptForNewEntry(null);
                      }}
                      className="text-xs font-medium text-[#7C7A70] hover:text-[#3D3C38] cursor-pointer"
                    >
                      Close Editor
                    </button>
                  </div>
                  <EntryEditor
                    userId={user.uid}
                    initialEntry={editingEntry}
                    initialPrompt={initialPromptForNewEntry}
                    onSave={handleSaveEntry}
                    onOpenConversation={(entry) => {
                      setChattingEntry(entry);
                    }}
                    onCancel={() => {
                      setIsCreatingNew(false);
                      setEditingEntry(null);
                      setInitialPromptForNewEntry(null);
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* Stats & Search Bar */}
                  <StatsBar
                    entries={entries}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    onOpenAISettings={() => setIsAISettingsModalOpen(true)}
                    isUsingPersonalKey={Boolean(aiSettings?.usePersonalKey && aiSettings?.hasKeyConfigured)}
                    maskedKey={aiSettings?.maskedKey}
                  />

                  {/* History Section Header */}
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h2 className="text-lg font-serif font-bold text-[#3D3C38]">
                        Your Reflection History
                      </h2>
                      <p className="text-xs text-[#7C7A70]">
                        Private, encrypted records stored under your isolated user ID.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="toggle-diagnostics-btn"
                        onClick={() => setShowDiagnosticsPanel((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-colors shadow-2xs ${
                          showDiagnosticsPanel
                            ? 'bg-[#5A5A40] text-[#FAF9F5] border-[#5A5A40]'
                            : 'bg-white border-[#D1CDBE] hover:bg-[#FAF9F5] text-[#5E5D57]'
                        }`}
                        title="Open Deletion Testing Tools"
                      >
                        <FlaskConical className="w-3.5 h-3.5 text-[#5A5A40]" />
                        <span>Test Tools</span>
                      </button>

                      <button
                        id="open-checkins-modal-btn"
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#D1CDBE] hover:bg-[#FAF9F5] text-xs font-medium text-[#5E5D57] cursor-pointer transition-colors shadow-2xs"
                      >
                        <Smile className="w-3.5 h-3.5 text-[#5A5A40]" />
                        <span>Check-Ins ({checkIns.length})</span>
                      </button>

                      <button
                        id="primary-new-reflection-btn"
                        onClick={() => {
                          setEditingEntry(null);
                          setInitialPromptForNewEntry(null);
                          setIsCreatingNew(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-[#FAF9F5] text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Write Reflection</span>
                      </button>
                    </div>
                  </div>

                  {/* Deletion Test & Verification Panel */}
                  {showDiagnosticsPanel && (
                    <div
                      id="deletion-diagnostics-panel"
                      className="mb-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 space-y-3 animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-amber-700" />
                          <span className="font-bold uppercase tracking-wider text-[11px] text-amber-900">
                            Deletion Verification & Testing Suite
                          </span>
                        </div>
                        <label className="inline-flex items-center gap-2 cursor-pointer font-medium select-none bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                          <input
                            id="toggle-network-failure-sim"
                            type="checkbox"
                            checked={simulateNetworkError}
                            onChange={(e) => handleToggleSimulateError(e.target.checked)}
                            className="rounded border-amber-300 text-amber-700 focus:ring-amber-500 cursor-pointer h-4 w-4"
                          />
                          <span className="text-amber-950 text-xs">
                            Simulate Network Failure:{' '}
                            {simulateNetworkError ? (
                              <span className="text-red-700 font-bold">ACTIVE (Deletions Will Fail)</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">OFF (Normal Deletions)</span>
                            )}
                          </span>
                        </label>
                      </div>

                      <p className="text-amber-900/90 text-xs leading-relaxed">
                        Test deleting an entry with no attachments, deleting an entry with attachments, and simulating a network failure to confirm the error toast with retry appears reliably.
                      </p>

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <button
                          id="create-test-no-att-btn"
                          type="button"
                          onClick={() => handleCreateTestEntry(false)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 font-semibold text-amber-900 shadow-2xs transition-colors cursor-pointer"
                        >
                          + Create Test Entry (No Media)
                        </button>
                        <button
                          id="create-test-with-att-btn"
                          type="button"
                          onClick={() => handleCreateTestEntry(true)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 font-semibold text-amber-900 shadow-2xs transition-colors cursor-pointer"
                        >
                          + Create Test Entry (With Media)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Entries Grid or Empty State */}
                  {entriesLoading ? (
                    <div className="py-16 text-center">
                      <RefreshCw className="w-6 h-6 text-[#7C7A70] animate-spin mx-auto mb-2" />
                      <p className="text-xs text-[#7C7A70]">Loading your private journal from Firestore...</p>
                    </div>
                  ) : filteredEntries.length === 0 ? (
                    <div className="bg-[#FAF9F5] rounded-2xl border border-dashed border-[#D1CDBE] p-10 text-center">
                      <div className="w-12 h-12 rounded-xl bg-[#EFEEE8] text-[#5A5A40] mx-auto flex items-center justify-center mb-3 border border-[#D1CDBE]/70">
                        <BookOpen className="w-6 h-6 text-[#5A5A40]" />
                      </div>
                      <h3 className="text-lg font-serif font-bold text-[#3D3C38] mb-1">
                        {searchQuery || selectedCategory !== 'All'
                          ? 'No matching reflections found'
                          : 'Your journal is empty'}
                      </h3>
                      <p className="text-xs text-[#7C7A70] max-w-sm mx-auto mb-6">
                        {searchQuery || selectedCategory !== 'All'
                          ? 'Try adjusting your search keywords or category filters.'
                          : 'Start by writing your first reflection and conversing with Gemini AI.'}
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All');
                          setEditingEntry(null);
                          setInitialPromptForNewEntry(null);
                          setIsCreatingNew(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-[#FAF9F5] text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Write First Reflection</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredEntries.map((entry) => (
                        <EntryCard
                          key={entry.id}
                          entry={entry}
                          onSelect={(e) => setViewingDetailEntry(e)}
                          onOpenChat={(e) => setChattingEntry(e)}
                          onDelete={handleDeleteEntry}
                          isDeleting={deletingEntryId === entry.id}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Sidebar: Active Multi-Turn AI Reflection Drawer */}
            {chattingEntry && (
              <div className="lg:col-span-5 sticky top-24 h-[calc(100vh-8rem)] rounded-2xl overflow-hidden bg-[#FAF9F5] border border-[#D1CDBE] shadow-sm flex flex-col">
                <ConversationDrawer
                  entry={chattingEntry}
                  onUpdateEntry={handleSaveEntry}
                  onClose={() => setChattingEntry(null)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Entry Detail & Conversation Transcript Modal */}
      {viewingDetailEntry && (
        <EntryDetailModal
          entry={viewingDetailEntry}
          onClose={() => setViewingDetailEntry(null)}
          onContinueChat={(entry) => {
            setViewingDetailEntry(null);
            setChattingEntry(entry);
          }}
          onDelete={handleDeleteEntry}
        />
      )}

      {/* Check-In Modal (Feature 5) */}
      {isCheckInModalOpen && user && (
        <CheckInModal
          isOpen={isCheckInModalOpen}
          onClose={() => {
            setIsCheckInModalOpen(false);
            setEditingCheckIn(null);
          }}
          userId={user.uid}
          initialRecord={editingCheckIn}
          onSave={handleSaveCheckIn}
          onDelete={handleDeleteCheckIn}
        />
      )}

      {/* Check-In History List Modal (Feature 5) */}
      {isHistoryModalOpen && (
        <CheckInHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          checkIns={checkIns}
          onEdit={(record) => {
            setEditingCheckIn(record);
            setIsHistoryModalOpen(false);
            setIsCheckInModalOpen(true);
          }}
          onDelete={handleDeleteCheckIn}
        />
      )}

      {/* Reminders & Streaks Settings Modal (Feature 5) */}
      {isRemindersModalOpen && (
        <RemindersSettingsModal
          isOpen={isRemindersModalOpen}
          onClose={() => setIsRemindersModalOpen(false)}
          streakCount={streakCount}
          initialSettings={reminderSettings}
          onSave={handleSaveReminderSettings}
        />
      )}

      {/* Therapist Report Modal (Feature 6) */}
      {isTherapistReportModalOpen && user && (
        <TherapistReportModal
          isOpen={isTherapistReportModalOpen}
          onClose={() => setIsTherapistReportModalOpen(false)}
          userId={user.uid}
          userName={user.displayName || 'Reflective Soul'}
          entries={entries}
          checkIns={checkIns}
          savedReports={savedReports}
          onSaveReport={handleSaveReport}
          onDeleteReport={handleDeleteReport}
          onRevokeReport={handleRevokeReport}
        />
      )}

      {/* Mindful Breathing Exercise Modal */}
      {isBreathingModalOpen && (
        <BreathingExerciseModal
          isOpen={isBreathingModalOpen}
          onClose={() => setIsBreathingModalOpen(false)}
        />
      )}

      {/* Bring Your Own Key (BYOK) AI Settings Modal */}
      {isAISettingsModalOpen && user && (
        <AISettingsModal
          isOpen={isAISettingsModalOpen}
          onClose={() => setIsAISettingsModalOpen(false)}
          user={user}
          aiSettings={aiSettings}
          onSettingsUpdated={(updated) => setAISettings(updated)}
        />
      )}

      {/* Clear Delete Error Toast with Retry Action (Reliable failure feedback) */}
      {deleteError && (
        <div
          id="delete-error-toast"
          role="alert"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-white border-2 border-red-500 rounded-2xl shadow-2xl p-4 flex flex-col gap-2.5 animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-950">
                  Failed to Delete &ldquo;{deleteError.entryTitle}&rdquo;
                </h4>
                <p className="text-xs text-red-800 leading-relaxed mt-0.5">
                  {deleteError.errorMessage}
                </p>
              </div>
            </div>
            <button
              id="dismiss-delete-error-btn"
              onClick={() => setDeleteError(null)}
              className="text-stone-400 hover:text-stone-700 p-1 rounded cursor-pointer"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-red-100">
            <button
              id="dismiss-delete-error-btn-secondary"
              onClick={() => setDeleteError(null)}
              className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button
              id="retry-delete-btn"
              onClick={() => {
                const { entryId, attachments } = deleteError;
                setDeleteError(null);
                handleDeleteEntry(entryId, attachments);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Success Toast */}
      {deleteSuccessToast && (
        <div
          id="delete-success-toast"
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-white border border-[#CAD5C6] rounded-2xl shadow-xl p-3.5 flex items-center justify-between gap-3 text-xs text-[#3D3C38] animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#485942]" />
            <span className="font-medium">{deleteSuccessToast}</span>
          </div>
          <button
            id="dismiss-delete-success-toast"
            onClick={() => setDeleteSuccessToast(null)}
            className="text-[#7C7A70] hover:text-[#3D3C38] p-1 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
