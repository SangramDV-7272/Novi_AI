import React from 'react';
import { Sparkles, LogOut, Plus, ShieldCheck, Database, BookOpen } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  onSignOut: () => void;
  onNewEntry: () => void;
  entriesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onNewEntry,
  entriesCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#D1CDBE]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
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

        {/* Center / Right controls */}
        {user ? (
          <div className="flex items-center gap-3">
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
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-[#3D3C38] leading-none">
                  {user.displayName || 'Reflective Soul'}
                </p>
                <p className="text-[10px] text-[#7C7A70] leading-tight mt-0.5 max-w-[140px] truncate">
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
