import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Calendar,
  Filter,
  Shield,
  Heart,
  Wind,
  Smile,
  FileText,
  HelpCircle,
  Clock,
  MapPin,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  Flame,
  Activity,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type {
  JournalEntry,
  CheckInRecord,
  InsightsAnalysisResult,
  CheckInMood,
} from '../types';
import { getAIRequestHeadersAndBody } from '../lib/aiSettingsState';

interface InsightsSectionProps {
  entries: JournalEntry[];
  checkIns: CheckInRecord[];
  onStartNewReflectionWithPrompt?: (promptText: string) => void;
  onOpenCheckIn: () => void;
  onOpenHistory: () => void;
  onOpenReminders: () => void;
  onOpenTherapistReport: () => void;
  onOpenBreathingModal: () => void;
  streakCount: number;
}

const PALETTE_COLORS = [
  '#5A5A40', // Olive primary
  '#875F23', // Warm amber
  '#5C7866', // Sage
  '#7C7A70', // Neutral taupe
  '#4A6B82', // Dusty slate blue
  '#9B6B6B', // Dusty rose
];

export const InsightsSection: React.FC<InsightsSectionProps> = ({
  entries,
  checkIns,
  onStartNewReflectionWithPrompt,
  onOpenCheckIn,
  onOpenHistory,
  onOpenReminders,
  onOpenTherapistReport,
  onOpenBreathingModal,
  streakCount,
}) => {
  // Consent & Exclusion state
  const [hasConsent, setHasConsent] = useState(true);
  const [excludedEntryIds, setExcludedEntryIds] = useState<string[]>([]);
  const [isExclusionModalOpen, setIsExclusionModalOpen] = useState(false);

  // Filter state
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [moodFilter, setMoodFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationQuery, setLocationQuery] = useState('');

  // Trend graph frequency mode: 'daily' | 'weekly' | 'monthly'
  const [trendMode, setTrendMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // "What does this mean?" explanatory toggle
  const [showExplanation, setShowExplanation] = useState(false);

  // AI Insights caching & loading
  const [insights, setInsights] = useState<InsightsAnalysisResult | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Filter reflections and check-ins based on active filters & exclusions
  const filteredData = useMemo(() => {
    const now = Date.now();
    let cutoff = 0;
    if (dateFilter === '7d') cutoff = now - 7 * 86400000;
    else if (dateFilter === '30d') cutoff = now - 30 * 86400000;
    else if (dateFilter === '90d') cutoff = now - 90 * 86400000;

    const filteredEntries = entries.filter((e) => {
      if (excludedEntryIds.includes(e.id)) return false;
      const t = new Date(e.createdAt).getTime();

      if (dateFilter === 'custom') {
        const start = customStart ? new Date(customStart).getTime() : 0;
        const end = customEnd ? new Date(customEnd).getTime() + 86400000 : Infinity;
        if (t < start || t > end) return false;
      } else if (cutoff > 0 && t < cutoff) {
        return false;
      }

      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (moodFilter !== 'all' && e.mood !== moodFilter) return false;

      if (locationQuery.trim()) {
        const loc = e.location?.address || '';
        if (!loc.toLowerCase().includes(locationQuery.toLowerCase().trim())) return false;
      }

      return true;
    });

    const filteredCheckIns = checkIns.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      if (dateFilter === 'custom') {
        const start = customStart ? new Date(customStart).getTime() : 0;
        const end = customEnd ? new Date(customEnd).getTime() + 86400000 : Infinity;
        if (t < start || t > end) return false;
      } else if (cutoff > 0 && t < cutoff) {
        return false;
      }

      if (moodFilter !== 'all' && c.mood !== moodFilter) return false;
      if (locationQuery.trim()) {
        const loc = c.location?.address || '';
        if (!loc.toLowerCase().includes(locationQuery.toLowerCase().trim())) return false;
      }

      return true;
    });

    return { entries: filteredEntries, checkIns: filteredCheckIns };
  }, [entries, checkIns, excludedEntryIds, dateFilter, customStart, customEnd, categoryFilter, moodFilter, locationQuery]);

  // Request AI Analysis when filtered data changes or on demand
  const triggerAnalysis = async () => {
    if (!hasConsent) return;
    setIsLoadingAnalysis(true);
    setAnalysisError(null);

    try {
      const res = await fetch('/api/insights/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: filteredData.entries,
          checkIns: filteredData.checkIns,
          dateRange: dateFilter,
          ...getAIRequestHeadersAndBody(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to analyze insights.');
      }

      const data = await res.json();
      setInsights(data);
    } catch (err: any) {
      console.error('Insights error:', err);
      setAnalysisError(err.message || 'Unable to update insights.');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    if (hasConsent && (entries.length > 0 || checkIns.length > 0)) {
      triggerAnalysis();
    }
  }, [hasConsent, filteredData.entries.length, filteredData.checkIns.length, dateFilter]);

  // Compute graph data points based on trendMode ('daily' | 'weekly' | 'monthly')
  const chartData = useMemo(() => {
    // Collect all data points with timestamp and intensity
    const points: { date: Date; intensity: number; label: string }[] = [];

    filteredData.checkIns.forEach((c) => {
      points.push({
        date: new Date(c.createdAt),
        intensity: c.intensity,
        label: c.mood,
      });
    });

    filteredData.entries.forEach((e) => {
      // Map mood to estimate intensity (3 default)
      let estimatedIntensity = 3;
      if (e.mood === 'peaceful' || e.mood === 'thoughtful') estimatedIntensity = 2;
      if (e.mood === 'motivated' || e.mood === 'grateful') estimatedIntensity = 4;
      if (e.mood === 'anxious') estimatedIntensity = 4.5;
      points.push({
        date: new Date(e.createdAt),
        intensity: estimatedIntensity,
        label: e.mood,
      });
    });

    points.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (points.length === 0) {
      // Fallback empty data for display
      return [
        { period: 'Day 1', intensity: 2.5, records: 0 },
        { period: 'Day 2', intensity: 3.0, records: 0 },
        { period: 'Day 3', intensity: 2.8, records: 0 },
      ];
    }

    if (trendMode === 'daily') {
      const byDay: Record<string, { sum: number; count: number }> = {};
      points.forEach((p) => {
        const key = p.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (!byDay[key]) byDay[key] = { sum: 0, count: 0 };
        byDay[key].sum += p.intensity;
        byDay[key].count += 1;
      });

      return Object.entries(byDay).map(([key, val]) => ({
        period: key,
        intensity: Number((val.sum / val.count).toFixed(1)),
        records: val.count,
      }));
    } else if (trendMode === 'weekly') {
      // Group by ISO week or 7-day chunk
      const byWeek: Record<string, { sum: number; count: number }> = {};
      points.forEach((p) => {
        const weekNum = Math.ceil(p.date.getDate() / 7);
        const key = `${p.date.toLocaleDateString(undefined, { month: 'short' })} W${weekNum}`;
        if (!byWeek[key]) byWeek[key] = { sum: 0, count: 0 };
        byWeek[key].sum += p.intensity;
        byWeek[key].count += 1;
      });

      return Object.entries(byWeek).map(([key, val]) => ({
        period: key,
        intensity: Number((val.sum / val.count).toFixed(1)),
        records: val.count,
      }));
    } else {
      // Monthly
      const byMonth: Record<string, { sum: number; count: number }> = {};
      points.forEach((p) => {
        const key = p.date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        if (!byMonth[key]) byMonth[key] = { sum: 0, count: 0 };
        byMonth[key].sum += p.intensity;
        byMonth[key].count += 1;
      });

      return Object.entries(byMonth).map(([key, val]) => ({
        period: key,
        intensity: Number((val.sum / val.count).toFixed(1)),
        records: val.count,
      }));
    }
  }, [filteredData, trendMode]);

  // Compute emotion distribution donut/bar data
  const emotionDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.checkIns.forEach((c) => {
      counts[c.mood] = (counts[c.mood] || 0) + 1;
    });
    filteredData.entries.forEach((e) => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });

    const list = Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));

    list.sort((a, b) => b.value - a.value);
    return list;
  }, [filteredData]);

  // Compute average intensity
  const averageIntensityScore = useMemo(() => {
    if (typeof insights?.averageIntensity === 'number') {
      return insights.averageIntensity;
    }
    if (insights?.emotionalIntensity?.averageScore) {
      return insights.emotionalIntensity.averageScore;
    }
    const points = [
      ...filteredData.checkIns.map((c) => c.intensity),
      ...filteredData.entries.map((e) => (e.mood === 'peaceful' ? 2 : e.mood === 'motivated' ? 4 : 3)),
    ];
    if (points.length === 0) return 3.0;
    const sum = points.reduce((a, b) => a + b, 0);
    return Number((sum / points.length).toFixed(1));
  }, [insights, filteredData]);

  // Unique categories & locations for filter dropdowns
  const availableCategories = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => {
      if (e.category) s.add(e.category);
    });
    return Array.from(s);
  }, [entries]);

  return (
    <div id="insights-section" className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D1CDBE]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#5A5A40]" />
            <span className="text-xs uppercase tracking-wider font-semibold text-[#7C7A70]">
              Private Well-Being & Mood Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#3D3C38]">
            Insights & Emotional Reflection
          </h1>
          <p className="text-xs text-[#7C7A70] mt-1 max-w-2xl">
            Synthesize patterns across your journal reflections and daily check-ins to discover themes, celebrate calm moments, and support personal clarity.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="quick-checkin-btn"
            type="button"
            onClick={onOpenCheckIn}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5A5A40] text-[#FAF9F5] hover:bg-[#484833] text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Daily Check-In</span>
          </button>

          <button
            id="open-therapist-report-btn"
            type="button"
            onClick={onOpenTherapistReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#3D3C38] border border-[#D1CDBE] hover:bg-[#FAF9F5] text-xs font-medium transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>Therapist Report</span>
          </button>

          <button
            id="open-reminders-settings-btn"
            type="button"
            onClick={onOpenReminders}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-[#5E5D57] border border-[#D1CDBE] hover:bg-[#FAF9F5] text-xs font-medium cursor-pointer"
            title="Streaks & Reminders"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Streak: {streakCount}d</span>
          </button>
        </div>
      </div>

      {/* Consent & Exclusion Privacy Banner */}
      <div className="bg-[#FAF9F5] border border-[#D1CDBE] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EAE8DD] text-[#5A5A40] flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-[#3D3C38]">User-Controlled Data Consent</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                Private & Isolated
              </span>
            </div>
            <p className="text-[11px] text-[#7C7A70]">
              Insights analyzes only your saved reflections. You have total control to exclude any individual entry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            id="manage-excluded-entries-btn"
            type="button"
            onClick={() => setIsExclusionModalOpen(true)}
            className="text-xs text-[#5A5A40] hover:underline font-medium cursor-pointer"
          >
            Manage Excluded Entries ({excludedEntryIds.length})
          </button>

          <label className="relative inline-flex items-center cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={hasConsent}
              onChange={(e) => setHasConsent(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#D1CDBE] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D1CDBE] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A5A40]"></div>
          </label>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#D1CDBE] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-[#5E5D57] flex items-center gap-1.5 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#5A5A40]" />
            Filter Insights & Trends
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerAnalysis}
              disabled={isLoadingAnalysis}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-[#5A5A40] hover:bg-[#FAF9F5] border border-[#D1CDBE] cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingAnalysis ? 'animate-spin' : ''}`} />
              <span>{isLoadingAnalysis ? 'Refreshing...' : 'Refresh Analysis'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date Range Selector */}
          <div>
            <label className="block text-[10px] text-[#7C7A70] uppercase font-semibold mb-1">
              Time Period
            </label>
            <select
              id="insights-date-filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full text-xs p-2 rounded-xl border border-[#D1CDBE] bg-[#FAF9F5] text-[#3D3C38]"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Mood Filter */}
          <div>
            <label className="block text-[10px] text-[#7C7A70] uppercase font-semibold mb-1">
              Mood Filter
            </label>
            <select
              id="insights-mood-filter"
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-[#D1CDBE] bg-[#FAF9F5] text-[#3D3C38]"
            >
              <option value="all">All Moods</option>
              <option value="Calm">Calm</option>
              <option value="Happy">Happy</option>
              <option value="Peaceful">Peaceful</option>
              <option value="Thoughtful">Thoughtful</option>
              <option value="Grateful">Grateful</option>
              <option value="Anxious">Anxious</option>
              <option value="Stressed">Stressed</option>
              <option value="Sad">Sad</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] text-[#7C7A70] uppercase font-semibold mb-1">
              Category
            </label>
            <select
              id="insights-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-[#D1CDBE] bg-[#FAF9F5] text-[#3D3C38]"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-[10px] text-[#7C7A70] uppercase font-semibold mb-1">
              Location / Space
            </label>
            <div className="relative">
              <input
                id="insights-location-filter"
                type="text"
                placeholder="Search location..."
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full text-xs p-2 pl-7 rounded-xl border border-[#D1CDBE] bg-[#FAF9F5] text-[#3D3C38]"
              />
              <MapPin className="w-3.5 h-3.5 text-[#7C7A70] absolute left-2 top-2.5" />
            </div>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-[#EAE8DD]">
            <div>
              <span className="text-[10px] text-[#7C7A70] block">Start Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs p-1.5 rounded-lg border border-[#D1CDBE]"
              />
            </div>
            <div>
              <span className="text-[10px] text-[#7C7A70] block">End Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs p-1.5 rounded-lg border border-[#D1CDBE]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Mood Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dominant Emotions Card */}
        <div className="p-6 rounded-3xl bg-white border border-[#D1CDBE] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
              Dominant Emotions
            </h3>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#7C7A70]">
              Frequency
            </span>
          </div>

          <div className="space-y-2">
            {insights?.dominantEmotions && insights.dominantEmotions.length > 0 ? (
              insights.dominantEmotions.slice(0, 4).map((item, idx) => (
                <div key={item.emotion} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#3D3C38]">{item.emotion}</span>
                    <span className="text-[#7C7A70]">{item.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#EFEEE8] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5A5A40]"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : emotionDistribution.length > 0 ? (
              emotionDistribution.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs py-1">
                  <span className="font-medium text-[#3D3C38]">{item.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#EFEEE8] text-[#5E5D57] font-semibold text-[11px]">
                    {item.value} {item.value === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#7C7A70] italic py-2">
                Log check-ins or reflections to see emotional frequency.
              </p>
            )}
          </div>
        </div>

        {/* Emotional Intensity Gauge Card */}
        <div className="p-6 rounded-3xl bg-white border border-[#D1CDBE] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#875F23]" />
              Emotional Intensity
            </h3>
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-[11px] text-[#5A5A40] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>What's this?</span>
            </button>
          </div>

          <div className="text-center py-2">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-serif font-extrabold text-[#3D3C38]">
                {averageIntensityScore}
              </span>
              <span className="text-sm font-bold text-[#7C7A70]">/ 5.0</span>
            </div>
            <p className="text-xs font-semibold text-[#5A5A40] mt-1">
              {insights?.emotionalIntensity?.trend
                ? `Trend: ${insights.emotionalIntensity.trend}`
                : averageIntensityScore < 2.5
                ? 'Gentle & Grounded'
                : averageIntensityScore < 3.8
                ? 'Moderate & Dynamic'
                : 'High Intensity State'}
            </p>
            <p className="text-[11px] text-[#7C7A70] mt-2 max-w-xs mx-auto">
              {insights?.emotionalIntensity?.description ||
                'Calculated from your self-reported 1-5 check-in scores and reflection narratives.'}
            </p>
          </div>
        </div>

        {/* Recurring Themes Card */}
        <div className="p-6 rounded-3xl bg-white border border-[#D1CDBE] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5C7866]" />
              Recurring Themes
            </h3>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#7C7A70]">
              Patterns
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {insights?.recurringThemes && insights.recurringThemes.length > 0 ? (
              insights.recurringThemes.map((theme, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-xl bg-[#FAF9F5] border border-[#D1CDBE] text-[#3D3C38] text-xs font-medium"
                >
                  {theme}
                </span>
              ))
            ) : (
              <p className="text-xs text-[#7C7A70] italic">
                Recurring patterns will appear as your reflections grow.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Explanatory Banner (Toggled by "What does this mean?") */}
      {showExplanation && (
        <div className="p-4 rounded-2xl bg-[#FAF3E5] border border-[#E8D8B6] text-xs text-[#875F23] space-y-2 animate-in fade-in duration-150">
          <div className="flex justify-between items-center">
            <span className="font-bold flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              Understanding Your Emotional Intensity & Trends
            </span>
            <button
              onClick={() => setShowExplanation(false)}
              className="text-xs font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
          <p className="leading-relaxed">
            The intensity scale ranges from <strong>1 (very mild)</strong> to <strong>5 (intense)</strong>. A score of 1–2 indicates peaceful, subtle, background emotions. A score of 3 represents balanced daily activation. Scores of 4–5 signify deeply engaging states—whether that is intense focus, vibrant excitement, or heightened anxiety/stress. Graphs smooth these values to help you observe daily shifts, weekly rhythms, and recovery cycles over time.
          </p>
        </div>
      )}

      {/* Interactive Trends & Graphs Section */}
      <div className="bg-white border border-[#D1CDBE] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-[#3D3C38] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#5A5A40]" />
              Emotional Trends & Trajectory
            </h3>
            <p className="text-xs text-[#7C7A70]">
              Track mood intensity over time to recognize high-energy phases and calming recoveries.
            </p>
          </div>

          {/* Daily, Weekly, Monthly Switcher */}
          <div className="flex bg-[#EFEEE8] p-1 rounded-xl border border-[#D1CDBE]">
            {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                id={`trend-mode-${mode}-btn`}
                type="button"
                onClick={() => setTrendMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-colors ${
                  trendMode === mode
                    ? 'bg-[#5A5A40] text-white shadow-2xs'
                    : 'text-[#5E5D57] hover:text-[#3D3C38]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Main Intensity Line Chart (2 Cols) */}
          <div className="lg:col-span-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE8DD" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#7C7A70', fontSize: 11 }}
                  stroke="#D1CDBE"
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: '#7C7A70', fontSize: 11 }}
                  stroke="#D1CDBE"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#FAF9F5] p-3 rounded-xl border border-[#D1CDBE] shadow-md text-xs">
                          <p className="font-bold text-[#3D3C38] mb-1">{label}</p>
                          <p className="text-[#5A5A40] font-semibold">
                            Intensity: {payload[0].value} / 5
                          </p>
                          {payload[0].payload.records && (
                            <p className="text-[10px] text-[#7C7A70]">
                              {payload[0].payload.records} check-ins recorded
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="intensity"
                  stroke="#5A5A40"
                  strokeWidth={2.5}
                  dot={{ fill: '#FAF9F5', stroke: '#5A5A40', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#5A5A40' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Emotion Frequency Donut / Bar Chart (1 Col) */}
          <div className="h-72 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-[#D1CDBE] lg:pl-6 pt-4 lg:pt-0">
            <span className="text-xs font-semibold text-[#5E5D57] uppercase tracking-wider mb-2">
              Emotion Breakdown
            </span>
            {emotionDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={emotionDistribution}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {emotionDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PALETTE_COLORS[index % PALETTE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#FAF9F5] p-2 rounded-lg border border-[#D1CDBE] text-xs">
                            <span className="font-semibold text-[#3D3C38]">
                              {payload[0].name}: {payload[0].value} logs
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-[#7C7A70] py-12">
                No logs recorded yet.
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-xs">
              {emotionDistribution.slice(0, 4).map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1 text-[11px] text-[#5E5D57]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PALETTE_COLORS[idx % PALETTE_COLORS.length] }}
                  />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Patterns Highlight Box */}
      {((insights?.detectedPatterns && insights.detectedPatterns.length > 0) ||
        (insights?.patterns && insights.patterns.length > 0)) && (
        <div className="p-6 rounded-3xl bg-[#FAF9F5] border border-[#D1CDBE] shadow-2xs space-y-3">
          <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#875F23]" />
            Observed Behavioral & Emotional Patterns
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(insights.detectedPatterns || insights.patterns || []).map((pat, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white border border-[#E2DFD2] text-xs text-[#3D3C38] flex items-start gap-2.5 shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40] mt-1.5 shrink-0" />
                <span className="leading-relaxed">{pat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positive Moments Highlights */}
      {insights?.positiveMoments && insights.positiveMoments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-700" />
              Celebrated Positive Moments & Wins
            </h3>
            <span className="text-xs text-[#7C7A70]">From your journal reflections</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {insights.positiveMoments.map((moment, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-[#CAD5C6] shadow-2xs space-y-2 hover:border-[#5A5A40] transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] text-[#7C7A70]">
                  <span>{moment.date}</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                    Joy & Calm
                  </span>
                </div>
                <p className="text-xs text-[#3D3C38] leading-relaxed italic">
                  &ldquo;{moment.snippet}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supportive, Non-Judgmental Suggestions Section */}
      <div className="bg-[#FAF9F5] border border-[#D1CDBE] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#5A5A40]" />
            <span className="text-xs uppercase tracking-wider font-semibold text-[#7C7A70]">
              Gentle Self-Care
            </span>
          </div>
          <h3 className="text-xl font-serif font-bold text-[#3D3C38]">
            Supportive Reflection & Grounding
          </h3>
          <p className="text-xs text-[#7C7A70]">
            Non-judgmental invitations to pause, breathe, or reach out. Choose what feels right for you today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Interactive Breathing Exercise */}
          <div className="p-5 rounded-2xl bg-white border border-[#D1CDBE] shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#CAD5C6]/40 text-[#5A5A40] flex items-center justify-center">
                <Wind className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-serif font-bold text-[#3D3C38]">
                Mindful Breathing Exercise
              </h4>
              <p className="text-xs text-[#7C7A70] leading-relaxed">
                Take a 2-minute somatic pause with our guided expanding breath circle. Helps reset the nervous system during intense days.
              </p>
            </div>
            <button
              id="start-breathing-modal-btn"
              type="button"
              onClick={onOpenBreathingModal}
              className="w-full mt-2 py-2 rounded-xl bg-[#5A5A40] text-[#FAF9F5] hover:bg-[#484833] text-xs font-medium cursor-pointer transition-colors"
            >
              Start Breathing Pause
            </button>
          </div>

          {/* Card 2: Journaling Prompts */}
          <div className="p-5 rounded-2xl bg-white border border-[#D1CDBE] shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#FAF3E5] text-[#875F23] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-serif font-bold text-[#3D3C38]">
                Personalized Journaling Prompt
              </h4>
              <p className="text-xs text-[#3D3C38] bg-[#FAF9F5] p-2.5 rounded-xl border border-[#E2DFD2] italic leading-relaxed">
                &ldquo;
                {insights?.supportiveSuggestions?.journalingPrompts?.[0] ||
                  insights?.suggestions?.journalingPrompt ||
                  'What gave you a sense of quiet reassurance this week?'}
                &rdquo;
              </p>
            </div>
            {onStartNewReflectionWithPrompt && (
              <button
                id="use-journaling-prompt-btn"
                type="button"
                onClick={() =>
                  onStartNewReflectionWithPrompt(
                    insights?.supportiveSuggestions?.journalingPrompts?.[0] ||
                      insights?.suggestions?.journalingPrompt ||
                      'What gave you a sense of quiet reassurance this week?'
                  )
                }
                className="w-full mt-2 py-2 rounded-xl bg-white text-[#5A5A40] border border-[#5A5A40] hover:bg-[#FAF9F5] text-xs font-medium cursor-pointer transition-colors"
              >
                Use Prompt in New Reflection
              </button>
            )}
          </div>

          {/* Card 3: Contact a Trusted Person */}
          <div className="p-5 rounded-2xl bg-white border border-[#D1CDBE] shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#EFEEE8] text-[#5E5D57] flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-serif font-bold text-[#3D3C38]">
                Reach Out to a Trusted Person
              </h4>
              <p className="text-xs text-[#7C7A70] leading-relaxed">
                {insights?.supportiveSuggestions?.trustedContactReminder ||
                  insights?.suggestions?.connectionReminder ||
                  'Connecting with a trusted friend, partner, or counselor can offer warmth and perspective when energy is low.'}
              </p>
            </div>
            <div className="text-[11px] text-[#7C7A70] bg-[#FAF9F5] p-2 rounded-xl text-center">
              A quick text or warm greeting can ease tension.
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Non-Diagnostic Disclaimer Footer */}
      <div className="p-4 rounded-2xl bg-[#EFEEE8] border border-[#D1CDBE] text-center text-xs text-[#7C7A70] leading-relaxed">
        <strong>Important Notice:</strong> This analysis is created solely for personal self-reflection and mindfulness. It does not constitute a medical diagnosis, clinical evaluation, or therapy. If you are experiencing overwhelming emotional distress, please consult a qualified mental health professional or reach out to supportive healthcare services.
      </div>

      {/* Exclusion Management Modal */}
      {isExclusionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF9F5] border border-[#D1CDBE] rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-serif font-bold text-[#3D3C38]">
                  Exclude Entries from Analysis
                </h3>
                <p className="text-xs text-[#7C7A70]">
                  Uncheck any private reflection you do not want included in well-being synthesis.
                </p>
              </div>
              <button
                onClick={() => setIsExclusionModalOpen(false)}
                className="p-1.5 rounded-lg text-[#7C7A70] hover:bg-[#EFEEE8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2">
              {entries.map((e) => {
                const isExcluded = excludedEntryIds.includes(e.id);
                return (
                  <label
                    key={e.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E2DFD2] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => {
                        setExcludedEntryIds((prev) =>
                          isExcluded ? prev.filter((id) => id !== e.id) : [...prev, e.id]
                        );
                      }}
                      className="rounded text-[#5A5A40] focus:ring-[#5A5A40]"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-semibold text-[#3D3C38] truncate">{e.title}</p>
                      <p className="text-[10px] text-[#7C7A70]">
                        {new Date(e.createdAt).toLocaleDateString()} &bull; {e.category}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-[#D1CDBE]">
              <button
                type="button"
                onClick={() => setIsExclusionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
