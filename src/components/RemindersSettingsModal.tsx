import React, { useState, useEffect } from 'react';
import { X, Bell, BellOff, Flame, Check, Sparkles } from 'lucide-react';
import type { ReminderSettings } from '../types';

interface RemindersSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
  initialSettings: ReminderSettings | null;
  onSave: (settings: ReminderSettings) => Promise<void>;
}

export const RemindersSettingsModal: React.FC<RemindersSettingsModalProps> = ({
  isOpen,
  onClose,
  streakCount,
  initialSettings,
  onSave,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState('20:00');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setEnabled(Boolean(initialSettings.enabled));
      setTimeOfDay(initialSettings.timeOfDay || '20:00');
    }
  }, [initialSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onSave({
        enabled,
        timeOfDay,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('Failed to save reminder settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="reminders-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
    >
      <div className="bg-[#FAF9F5] border border-[#D1CDBE] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-200 text-[#3D3C38]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#EFEEE8] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#5A5A40]" />
          <span className="text-xs uppercase tracking-wider font-semibold text-[#7C7A70]">
            Habits & Reflection Rhythm
          </span>
        </div>

        <h2 className="text-xl font-serif font-bold text-[#3D3C38] mb-1">
          Streaks & Gentle Reminders
        </h2>
        <p className="text-xs text-[#7C7A70] mb-6">
          Nurture a consistent practice without pressure. You have complete control to enable or disable reminders anytime.
        </p>

        {/* Streak Highlight Card */}
        <div className="p-4 rounded-2xl bg-[#EAE8DD] border border-[#D1CDBE] mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#5A5A40] text-[#FAF9F5] flex items-center justify-center shrink-0 shadow-2xs">
            <Flame className="w-6 h-6 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-serif font-bold text-[#3D3C38]">
                {streakCount}
              </span>
              <span className="text-xs font-semibold text-[#5A5A40]">
                {streakCount === 1 ? 'Day Streak' : 'Days Active Streak'}
              </span>
            </div>
            <p className="text-[11px] text-[#7C7A70]">
              {streakCount > 0
                ? 'Wonderful momentum! Every moment of mindfulness grounds your thoughts.'
                : 'Log a reflection or mood check-in today to spark your streak.'}
            </p>
          </div>
        </div>

        {/* Reminder Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#D1CDBE] bg-white">
            <div className="flex items-center gap-3">
              {enabled ? (
                <Bell className="w-5 h-5 text-[#5A5A40]" />
              ) : (
                <BellOff className="w-5 h-5 text-[#7C7A70]" />
              )}
              <div>
                <p className="text-xs font-semibold text-[#3D3C38]">
                  Daily In-App Reminder
                </p>
                <p className="text-[11px] text-[#7C7A70]">
                  {enabled ? 'Active reminder prompt' : 'Reminders completely disabled'}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="reminder-toggle-checkbox"
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#D1CDBE] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D1CDBE] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A5A40]"></div>
            </label>
          </div>

          {/* Time Picker (only if enabled) */}
          {enabled && (
            <div className="p-3.5 rounded-xl border border-[#D1CDBE] bg-white animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider mb-2">
                Preferred Reminder Time
              </label>
              <input
                id="reminder-time-input"
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full text-sm font-medium px-3 py-2 rounded-xl border border-[#D1CDBE] bg-[#FAF9F5] focus:outline-hidden focus:ring-1 focus:ring-[#5A5A40]"
              />
              <p className="text-[11px] text-[#7C7A70] mt-1.5">
                A gentle banner will remind you to take a mindful pause if you haven't checked in by this time.
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-8 pt-4 border-t border-[#D1CDBE]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#7C7A70] hover:text-[#3D3C38] cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="save-reminder-settings-btn"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#5A5A40] text-[#FAF9F5] hover:bg-[#484833] text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
