import React, { useState, useEffect } from 'react';
import {
  X,
  Smile,
  Heart,
  MinusCircle,
  Frown,
  CloudRain,
  Flame,
  Zap,
  Tag,
  MapPin,
  Check,
  Trash2,
} from 'lucide-react';
import type { CheckInMood, CheckInIntensity, CheckInRecord, LocationTag } from '../types';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialRecord?: CheckInRecord | null;
  onSave: (record: CheckInRecord) => Promise<void>;
  onDelete?: (recordId: string) => Promise<void>;
}

const MOOD_OPTIONS: {
  id: CheckInMood;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeColor: string;
}[] = [
  { id: 'Happy', label: 'Happy', icon: Smile, color: 'text-amber-700 bg-amber-50 border-amber-200', activeColor: 'bg-amber-600 text-white border-amber-600' },
  { id: 'Calm', label: 'Calm', icon: Heart, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', activeColor: 'bg-emerald-600 text-white border-emerald-600' },
  { id: 'Neutral', label: 'Neutral', icon: MinusCircle, color: 'text-stone-700 bg-stone-50 border-stone-200', activeColor: 'bg-stone-600 text-white border-stone-600' },
  { id: 'Sad', label: 'Sad', icon: Frown, color: 'text-blue-700 bg-blue-50 border-blue-200', activeColor: 'bg-blue-600 text-white border-blue-600' },
  { id: 'Anxious', label: 'Anxious', icon: CloudRain, color: 'text-indigo-700 bg-indigo-50 border-indigo-200', activeColor: 'bg-indigo-600 text-white border-indigo-600' },
  { id: 'Angry', label: 'Angry', icon: Flame, color: 'text-rose-700 bg-rose-50 border-rose-200', activeColor: 'bg-rose-600 text-white border-rose-600' },
  { id: 'Stressed', label: 'Stressed', icon: Zap, color: 'text-purple-700 bg-purple-50 border-purple-200', activeColor: 'bg-purple-600 text-white border-purple-600' },
  { id: 'Excited', label: 'Excited', icon: Zap, color: 'text-orange-700 bg-orange-50 border-orange-200', activeColor: 'bg-orange-600 text-white border-orange-600' },
];

const INTENSITY_LABELS: Record<CheckInIntensity, { title: string; desc: string }> = {
  1: { title: '1 - Very Mild', desc: 'A subtle background feeling' },
  2: { title: '2 - Mild', desc: 'Noticeable, but easily managed' },
  3: { title: '3 - Moderate', desc: 'Present and felt clearly' },
  4: { title: '4 - Strong', desc: 'Significantly influences energy' },
  5: { title: '5 - Intense', desc: 'Fully consuming emotional focus' },
};

const SUGGESTED_ACTIVITIES = [
  'Work',
  'Exercise',
  'Nature & Outdoors',
  'Family',
  'Socializing',
  'Creative Project',
  'Rest & Sleep',
  'Quiet Reading',
  'Commute',
  'Chres & Home',
];

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialRecord,
  onSave,
  onDelete,
}) => {
  const [mood, setMood] = useState<CheckInMood>('Calm');
  const [intensity, setIntensity] = useState<CheckInIntensity>(3);
  const [notes, setNotes] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [locationText, setLocationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialRecord) {
      setMood(initialRecord.mood);
      setIntensity(initialRecord.intensity);
      setNotes(initialRecord.notes || '');
      setActivities(initialRecord.activities || []);
      setLocationText(initialRecord.location?.address || '');
    } else {
      setMood('Calm');
      setIntensity(3);
      setNotes('');
      setActivities([]);
      setLocationText('');
    }
    setErrorMsg(null);
  }, [initialRecord, isOpen]);

  if (!isOpen) return null;

  const toggleActivity = (activity: string) => {
    setActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    const trimmed = customTag.trim();
    if (trimmed && !activities.includes(trimmed)) {
      setActivities((prev) => [...prev, trimmed]);
      setCustomTag('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const recordToSave: CheckInRecord = {
        id: initialRecord ? initialRecord.id : 'chk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId,
        mood,
        intensity,
        notes: notes.trim(),
        activities,
        location: locationText.trim()
          ? {
              latitude: 0,
              longitude: 0,
              address: locationText.trim(),
            }
          : null,
        createdAt: initialRecord ? initialRecord.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(recordToSave);
      onClose();
    } catch (err: any) {
      console.error('Failed to save check-in:', err);
      setErrorMsg(err.message || 'Could not save check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialRecord || !onDelete) return;
    if (!window.confirm('Are you sure you want to delete this mood record?')) return;
    setIsSubmitting(true);
    try {
      await onDelete(initialRecord.id);
      onClose();
    } catch (err: any) {
      console.error('Delete check-in failed:', err);
      setErrorMsg('Failed to delete mood record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="check-in-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="check-in-modal-content"
        className="bg-[#FAF9F5] border border-[#D1CDBE] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-xl relative my-8 animate-in fade-in zoom-in-95 duration-200 text-[#3D3C38]"
      >
        <button
          id="close-check-in-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#EFEEE8] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#5A5A40]" />
          <span className="text-xs uppercase tracking-wider font-semibold text-[#7C7A70]">
            {initialRecord ? 'Edit Mood Check-In' : 'Quick Mood Check-In'}
          </span>
        </div>

        <h2 className="text-xl font-serif font-bold text-[#3D3C38] mb-1">
          How are you feeling right now?
        </h2>
        <p className="text-xs text-[#7C7A70] mb-6">
          Log your emotional state and intensity to build clear, self-reflective patterns over time.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mood Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider mb-2.5">
              1. Select Mood
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOOD_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = mood === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={`mood-choice-${opt.id.toLowerCase()}`}
                    type="button"
                    onClick={() => setMood(opt.id)}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? opt.activeColor + ' shadow-xs ring-2 ring-[#5A5A40]/30 font-semibold'
                        : opt.color + ' hover:opacity-85'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intensity Selector (1 to 5) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider">
                2. Emotional Intensity (1 to 5)
              </label>
              <span className="text-xs font-bold text-[#5A5A40]">
                {INTENSITY_LABELS[intensity].title}
              </span>
            </div>
            <p className="text-[11px] text-[#7C7A70] mb-3">
              {INTENSITY_LABELS[intensity].desc}
            </p>

            <div className="grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as CheckInIntensity[]).map((level) => {
                const isSelected = intensity === level;
                return (
                  <button
                    key={level}
                    id={`intensity-btn-${level}`}
                    type="button"
                    onClick={() => setIntensity(level)}
                    className={`py-2 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5A5A40] text-[#FAF9F5] border-[#5A5A40] shadow-2xs ring-2 ring-[#5A5A40]/30'
                        : 'bg-[#EFEEE8] text-[#5E5D57] border-[#D1CDBE] hover:bg-[#EAE8DD]'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity / Context Tags */}
          <div>
            <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider mb-2">
              3. Activities & Context (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {SUGGESTED_ACTIVITIES.map((act) => {
                const isSelected = activities.includes(act);
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => toggleActivity(act)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[#5A5A40] text-[#FAF9F5] border-[#5A5A40]'
                        : 'bg-[#EFEEE8] text-[#5E5D57] border-[#D1CDBE] hover:bg-[#EAE8DD]'
                    }`}
                  >
                    {act}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2">
              <input
                id="custom-activity-input"
                type="text"
                placeholder="Add custom activity..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={handleAddCustomTag}
                className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-[#D1CDBE] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5A5A40]"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 rounded-xl bg-[#EFEEE8] text-[#5E5D57] hover:bg-[#EAE8DD] text-xs font-medium border border-[#D1CDBE] cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider mb-1.5">
              4. Brief Note (Optional)
            </label>
            <textarea
              id="checkin-notes-textarea"
              rows={2}
              placeholder="What triggered this feeling, or what are you experiencing right now?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#D1CDBE] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5A5A40] resize-none"
            />
          </div>

          {/* Optional Location */}
          <div>
            <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#7C7A70]" />
              <span>Location / Environment (Optional)</span>
            </label>
            <input
              id="checkin-location-input"
              type="text"
              placeholder="e.g. Quiet Home Office, Local Park, Coffee Shop..."
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-xl border border-[#D1CDBE] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#5A5A40]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#D1CDBE]">
            {initialRecord && onDelete ? (
              <button
                id="delete-checkin-btn"
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium border border-red-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#7C7A70] hover:text-[#3D3C38] cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-check-in-btn"
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#5A5A40] text-[#FAF9F5] hover:bg-[#484833] text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : initialRecord ? 'Update Check-In' : 'Save Check-In'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
