import React from 'react';
import { Sparkles, LogOut, Plus, ShieldCheck, BookOpen, TrendingUp, Smile } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  onSignOut: () => void;
  onNewEntry: () => void;
  entriesCount: number;
  activeTab?: 'reflections' | 'insights';
  onSelectTab?: (tab: 'reflections' | 'insights') => void;
  onQuickCheckIn?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onNewEntry,
  entriesCount,
  activeTab = 'reflections',
  onSelectTab,
  onQuickCheckIn,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#D1CDBE]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#5A5A40] text-[#FAF9F5] flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-[#EAE8DD]" />
          </div>
          <div>
            <span className="text-lg font-serif font-bold tracking-tight text-[#3D3C38] block leading-tight">
              Mindful Reflections
            </span>
            <span className="text-xs text-[#7C7A70] font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40] inline-block"></span>
              Gemini 3.6 Flash &bull; Cloud Firestore
            </span>
          </div>
        </div>

        {/* Center Navigation Tabs (Reflections vs Insights) */}
        {user && onSelectTab && (
          <nav className="flex items-center bg-[#EFEEE8] p-1 rounded-2xl border border-[#D1CDBE]">
            <button
              id="nav-reflections-tab"
              type="button"
              onClick={() => onSelectTab('reflections')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                activeTab === 'reflections'
                  ? 'bg-[#5A5A40] text-white shadow-2xs font-semibold'
                  : 'text-[#5E5D57] hover:text-[#3D3C38] hover:bg-[#EAE8DD]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Reflections</span>
              {entriesCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ml-0.5 ${
                  activeTab === 'reflections' ? 'bg-[#484833] text-[#FAF9F5]' : 'bg-[#D1CDBE] text-[#3D3C38]'
                }`}>
                  {entriesCount}
                </span>
              )}
            </button>

            <button
              id="nav-insights-tab"
              type="button"
              onClick={() => onSelectTab('insights')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                activeTab === 'insights'
                  ? 'bg-[#5A5A40] text-white shadow-2xs font-semibold'
                  : 'text-[#5E5D57] hover:text-[#3D3C38] hover:bg-[#EAE8DD]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Insights</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </button>
          </nav>
        )}

        {/* Center / Right controls */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {onQuickCheckIn && (
              <button
                id="navbar-quick-checkin-btn"
                type="button"
                onClick={onQuickCheckIn}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#D1CDBE] hover:bg-[#FAF9F5] text-[#3D3C38] text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                title="Quick Daily Mood Check-In"
              >
                <Smile className="w-4 h-4 text-[#5A5A40]" />
                <span className="hidden md:inline">Check-In</span>
              </button>
            )}

            <button
              id="new-reflection-btn"
              onClick={onNewEntry}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#5A5A40] text-[#FAF9F5] hover:bg-[#484833] text-sm font-medium transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Reflection</span>
            </button>

            <div className="h-6 w-px bg-[#D1CDBE]/80 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2.5 pl-1">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-[#D1CDBE] object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#EFEEE8] text-[#3D3C38] font-semibold text-xs flex items-center justify-center border border-[#D1CDBE]">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-[#3D3C38] leading-none">
                  {user.displayName || 'Reflective Soul'}
                </p>
                <p className="text-[10px] text-[#7C7A70] leading-tight mt-0.5 max-w-[120px] truncate">
                  {user.email}
                </p>
              </div>

              <button
                id="sign-out-btn"
                onClick={onSignOut}
                title="Sign Out"
                className="p-2 rounded-xl text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#EFEEE8] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium text-[#5A5A40] bg-[#EFEEE8] px-3 py-1.5 rounded-full border border-[#D1CDBE]/60">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>Secure Firebase Isolation</span>
          </div>
        )}
      </div>
    </header>
  );
};
