import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { AuthLanding } from './components/AuthLanding';
import { EntryEditor } from './components/EntryEditor';
import { ConversationDrawer } from './components/ConversationDrawer';
import { EntryCard } from './components/EntryCard';
import { EntryDetailModal } from './components/EntryDetailModal';
import { StatsBar } from './components/StatsBar';
import {
  subscribeToAuth,
  signOutUser,
  fetchUserEntries,
  saveJournalEntry,
  deleteEntryFromFirestore,
} from './lib/firebase';
import type { UserProfile, JournalEntry, MediaAttachment } from './types';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Active view states
  const [isCreatingNew, setIsCreatingNew] = useState(false);
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
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch entries whenever user logs in
  const loadEntries = async (userId: string) => {
    setEntriesLoading(true);
    setErrorBanner(null);
    try {
      const data = await fetchUserEntries(userId);
      setEntries(data);
    } catch (err: any) {
      console.error('Failed to load entries from Firestore:', err);
      setErrorBanner('Could not load your saved reflections. Please refresh or try again.');
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadEntries(user.uid);
    }
  }, [user?.uid]);

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
    } catch (err: any) {
      console.error('Save entry failed:', err);
      throw err;
    }
  };

  // Delete handler
  const handleDeleteEntry = async (entryId: string, attachments?: MediaAttachment[]) => {
    if (!user?.uid) return;
    try {
      await deleteEntryFromFirestore(user.uid, entryId, attachments);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (chattingEntry?.id === entryId) setChattingEntry(null);
      if (viewingDetailEntry?.id === entryId) setViewingDetailEntry(null);
    } catch (err) {
      console.error('Delete entry failed:', err);
      setErrorBanner('Failed to delete reflection from database.');
    }
  };

  // Filtered entries list
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

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#3D3C38] flex flex-col font-sans">
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onNewEntry={() => {
          setEditingEntry(null);
          setIsCreatingNew(true);
        }}
        entriesCount={entries.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error notification banner */}
        {errorBanner && (
          <div className="mb-6 p-4 rounded-xl bg-[#F8EFEF] border border-[#E2B6B6] text-[#7A3333] text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#9C3838] shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => user && loadEntries(user.uid)}
              className="text-xs font-semibold text-[#5A5A40] underline hover:no-underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dynamic Workspace Layout: Grid with Editor/History and Conversation Drawer */}
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
                    }}
                    className="text-xs font-medium text-[#7C7A70] hover:text-[#3D3C38] cursor-pointer"
                  >
                    Close Editor
                  </button>
                </div>
                <EntryEditor
                  userId={user.uid}
                  initialEntry={editingEntry}
                  onSave={handleSaveEntry}
                  onOpenConversation={(entry) => {
                    setChattingEntry(entry);
                  }}
                  onCancel={() => {
                    setIsCreatingNew(false);
                    setEditingEntry(null);
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
                />

                {/* History Section Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#3D3C38]">
                      Your Reflection History
                    </h2>
                    <p className="text-xs text-[#7C7A70]">
                      Private, encrypted records stored under your isolated user ID.
                    </p>
                  </div>

                  <button
                    id="primary-new-reflection-btn"
                    onClick={() => {
                      setEditingEntry(null);
                      setIsCreatingNew(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#484833] text-[#FAF9F5] text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Write Reflection</span>
                  </button>
                </div>

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
        />
      )}
    </div>
  );
}
