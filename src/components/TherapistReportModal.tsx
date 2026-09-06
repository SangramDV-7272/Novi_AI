import React, { useState } from 'react';
import {
  X,
  FileText,
  Download,
  Share2,
  Lock,
  Calendar,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Shield,
  Eye,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import type {
  JournalEntry,
  CheckInRecord,
  TherapistReportData,
  ReportPeriod,
} from '../types';
import { getAIRequestHeadersAndBody } from '../lib/aiSettingsState';

interface TherapistReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  entries: JournalEntry[];
  checkIns: CheckInRecord[];
  savedReports: TherapistReportData[];
  onSaveReport: (report: TherapistReportData) => Promise<void>;
  onDeleteReport?: (reportId: string) => Promise<void>;
  onRevokeReport?: (reportId: string) => Promise<void>;
}

export const TherapistReportModal: React.FC<TherapistReportModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName = 'Client',
  entries,
  checkIns,
  savedReports,
  onSaveReport,
  onDeleteReport,
  onRevokeReport,
}) => {
  // Step: 'configure' | 'preview' | 'history'
  const [activeStep, setActiveStep] = useState<'configure' | 'preview' | 'history'>('configure');

  // Configuration options
  const [period, setPeriod] = useState<ReportPeriod>('last_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>(entries.map((e) => e.id));
  const [includeCheckIns, setIncludeCheckIns] = useState(true);
  const [sleepEnergyNotes, setSleepEnergyNotes] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Active generated report (editable before export)
  const [generatedReport, setGeneratedReport] = useState<TherapistReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sharing states
  const [expiryHours, setExpiryHours] = useState('72');
  const [passcode, setPasscode] = useState('');
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // Filter entries based on period
  const getFilteredEntries = () => {
    const now = Date.now();
    let cutoff = now - 30 * 86400000;
    if (period === 'last_week') cutoff = now - 7 * 86400000;
    else if (period === 'last_month') cutoff = now - 30 * 86400000;
    else if (period === 'last_three_months') cutoff = now - 90 * 86400000;

    return entries.filter((e) => {
      const t = new Date(e.createdAt).getTime();
      if (period === 'custom') {
        const start = customStartDate ? new Date(customStartDate).getTime() : 0;
        const end = customEndDate ? new Date(customEndDate).getTime() + 86400000 : Infinity;
        return t >= start && t <= end;
      }
      return t >= cutoff;
    });
  };

  const currentAvailableEntries = getFilteredEntries();

  const toggleEntrySelection = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const approvedEntries = entries.filter((e) => selectedEntryIds.includes(e.id));
      const relevantCheckIns = includeCheckIns ? checkIns : [];

      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          startDate: customStartDate || new Date(Date.now() - 30 * 86400000).toISOString(),
          endDate: customEndDate || new Date().toISOString(),
          clientName: userName,
          selectedEntries: approvedEntries,
          checkIns: relevantCheckIns,
          sleepEnergyNotes,
          customNotes,
          ...getAIRequestHeadersAndBody(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate report.');
      }

      const reportData = await res.json();
      const finalReport: TherapistReportData = {
        id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId,
        title: reportData.title || `Well-Being Report (${period.replace(/_/g, ' ')})`,
        clientName: userName,
        period,
        startDate: reportData.startDate,
        endDate: reportData.endDate,
        createdAt: new Date().toISOString(),
        emotionalOverview: reportData.emotionalOverview,
        recurringThemes: reportData.recurringThemes || [],
        positiveChanges: reportData.positiveChanges || [],
        difficultPeriods: reportData.difficultPeriods || [],
        copingActivities: reportData.copingActivities || [],
        sleepEnergyNotes: reportData.sleepEnergyNotes || sleepEnergyNotes,
        discussionPrompts: reportData.discussionPrompts || [],
        selectedReflections: reportData.selectedReflections || [],
        customClinicianNotes: customNotes,
        disclaimer:
          'This report is based on self-reported journal data and is not a clinical assessment.',
      };

      setGeneratedReport(finalReport);
      // Auto-save to Firestore for safe persistence
      await onSaveReport(finalReport);
      setActiveStep('preview');
    } catch (err: any) {
      console.error('Report generation error:', err);
      setErrorMsg(err.message || 'Could not generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintDownload = () => {
    window.print();
  };

  const handleCreateShareLink = async () => {
    if (!generatedReport) return;
    setIsSharing(true);
    setCreatedShareUrl(null);
    try {
      const res = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: generatedReport,
          expiryHours: Number(expiryHours),
          password: passcode.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate share link.');
      }

      const data = await res.json();
      const origin = window.location.origin;
      const fullUrl = `${origin}/?sharedReport=${data.shareToken}`;
      setCreatedShareUrl(fullUrl);

      // Update local report object
      const updatedReport: TherapistReportData = {
        ...generatedReport,
        shareToken: data.shareToken,
        shareExpiry: data.expiresAt,
        isPasswordProtected: data.isPasswordProtected,
      };
      setGeneratedReport(updatedReport);
      await onSaveReport(updatedReport);
    } catch (err: any) {
      console.error('Share link error:', err);
      setErrorMsg(err.message || 'Could not create share link.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevoke = async (reportId: string) => {
    if (!onRevokeReport) return;
    if (!window.confirm('Revoke access to this shared report? The link will immediately stop working.'))
      return;
    try {
      await onRevokeReport(reportId);
      await fetch('/api/reports/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      if (generatedReport && generatedReport.id === reportId) {
        setGeneratedReport({ ...generatedReport, isRevoked: true });
      }
      setCreatedShareUrl(null);
    } catch (err) {
      console.error('Failed to revoke:', err);
    }
  };

  return (
    <div
      id="therapist-report-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-[#FAF9F5] border border-[#D1CDBE] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 text-[#3D3C38]">
        {/* Header with Navigation Tabs */}
        <div className="p-6 border-b border-[#D1CDBE] flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#5A5A40]" />
              <span className="text-xs uppercase tracking-wider font-semibold text-[#7C7A70]">
                Privacy-First Collaborative Tool
              </span>
            </div>
            <h2 className="text-xl font-serif font-bold text-[#3D3C38]">
              Shareable Therapist & Counselor Report
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#EFEEE8] p-1 rounded-xl border border-[#D1CDBE]">
              <button
                type="button"
                onClick={() => setActiveStep('configure')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  activeStep === 'configure'
                    ? 'bg-[#5A5A40] text-white shadow-2xs'
                    : 'text-[#5E5D57] hover:text-[#3D3C38]'
                }`}
              >
                Configure
              </button>
              <button
                type="button"
                onClick={() => generatedReport && setActiveStep('preview')}
                disabled={!generatedReport}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  !generatedReport
                    ? 'opacity-40 cursor-not-allowed text-[#7C7A70]'
                    : activeStep === 'preview'
                    ? 'bg-[#5A5A40] text-white shadow-2xs cursor-pointer'
                    : 'text-[#5E5D57] hover:text-[#3D3C38] cursor-pointer'
                }`}
              >
                Preview & Edit
              </button>
              {savedReports.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveStep('history')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    activeStep === 'history'
                      ? 'bg-[#5A5A40] text-white shadow-2xs'
                      : 'text-[#5E5D57] hover:text-[#3D3C38]'
                  }`}
                >
                  Past Reports ({savedReports.length})
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#EFEEE8] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Non-clinical Disclaimer Banner */}
        <div className="bg-[#EAE8DD]/80 px-6 py-2.5 border-b border-[#D1CDBE] flex items-center gap-2 text-xs text-[#5A5A40] font-medium">
          <Shield className="w-4 h-4 shrink-0 text-[#5A5A40]" />
          <span>
            <strong>Privacy Pledge:</strong> This report is based entirely on self-reported journal data and is not a clinical assessment. Data is never automatically shared with anyone.
          </span>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: CONFIGURE */}
          {activeStep === 'configure' && (
            <div className="space-y-6">
              {/* Report Period Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider mb-2">
                  1. Select Report Period
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'last_week', label: 'Last Week (7 Days)' },
                    { id: 'last_month', label: 'Last Month (30 Days)' },
                    { id: 'last_three_months', label: 'Last 3 Months' },
                    { id: 'custom', label: 'Custom Date Range' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriod(p.id as ReportPeriod)}
                      className={`p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        period === p.id
                          ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-2xs'
                          : 'bg-white text-[#3D3C38] border-[#D1CDBE] hover:bg-[#F5F4EE]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {period === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-white rounded-xl border border-[#D1CDBE]">
                    <div>
                      <label className="block text-[11px] text-[#7C7A70] mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-[#D1CDBE]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#7C7A70] mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-[#D1CDBE]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* User Approval: Select reflections to include */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider">
                    2. User-Approved Reflections ({selectedEntryIds.length}/{currentAvailableEntries.length} Selected)
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedEntryIds(currentAvailableEntries.map((e) => e.id))}
                      className="text-[#5A5A40] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-[#D1CDBE]">&bull;</span>
                    <button
                      type="button"
                      onClick={() => setSelectedEntryIds([])}
                      className="text-[#7C7A70] hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#7C7A70] mb-3">
                  Only the specific entries you leave checked will be synthesized in the summary report. Private reflections can be excluded.
                </p>

                <div className="max-h-52 overflow-y-auto space-y-2 border border-[#D1CDBE] rounded-2xl p-3 bg-white">
                  {currentAvailableEntries.length === 0 ? (
                    <p className="text-xs text-[#7C7A70] italic text-center py-4">
                      No reflection entries recorded in this time period.
                    </p>
                  ) : (
                    currentAvailableEntries.map((entry) => {
                      const isSelected = selectedEntryIds.includes(entry.id);
                      return (
                        <label
                          key={entry.id}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#FAF9F5] border-[#5A5A40]/40'
                              : 'bg-white border-[#E2DFD2] opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEntrySelection(entry.id)}
                            className="mt-0.5 rounded text-[#5A5A40] focus:ring-[#5A5A40]"
                          />
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-semibold text-[#3D3C38]">{entry.title}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFEEE8] text-[#5E5D57]">
                                {entry.category}
                              </span>
                              <span className="text-[10px] text-[#7C7A70]">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[#7C7A70] line-clamp-1 italic">
                              {entry.summary || entry.initialText}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Include Mood Check-ins Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#D1CDBE] bg-white">
                <div>
                  <p className="text-xs font-semibold text-[#3D3C38]">
                    Include Mood Check-Ins & Intensity Trends
                  </p>
                  <p className="text-[11px] text-[#7C7A70]">
                    Aggregates quick emotion check-ins and average intensity ({checkIns.length} records available).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={includeCheckIns}
                  onChange={(e) => setIncludeCheckIns(e.target.checked)}
                  className="rounded text-[#5A5A40] focus:ring-[#5A5A40] w-4 h-4"
                />
              </div>

              {/* Sleep & Energy Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider mb-1.5">
                  3. Sleep & Physical Energy Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={sleepEnergyNotes}
                  onChange={(e) => setSleepEnergyNotes(e.target.value)}
                  placeholder="e.g. Averaged 6-7 hours of sleep; energy felt low in afternoons, recovered on weekends..."
                  className="w-full text-xs p-3 rounded-xl border border-[#D1CDBE] bg-white focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>

              {/* Custom Clinician Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#5E5D57] uppercase tracking-wider mb-1.5">
                  4. Topics You Want to Discuss in Therapy (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Want to explore boundary setting at work and managing evening restlessness..."
                  className="w-full text-xs p-3 rounded-xl border border-[#D1CDBE] bg-white focus:ring-1 focus:ring-[#5A5A40] resize-none"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-[#D1CDBE]">
                <button
                  id="generate-therapist-report-btn"
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5A5A40] text-[#FAF9F5] hover:bg-[#484833] text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? 'Synthesizing Report...' : 'Generate Structured Report'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & EDIT */}
          {activeStep === 'preview' && generatedReport && (
            <div className="space-y-6">
              {/* Action Bar */}
              <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#D1CDBE] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#3D3C38]">Export & Share:</span>
                  <button
                    id="print-report-btn"
                    type="button"
                    onClick={handlePrintDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFEEE8] hover:bg-[#EAE8DD] text-[#3D3C38] text-xs font-medium border border-[#D1CDBE] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download / Print PDF</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="open-share-options-btn"
                    type="button"
                    onClick={() => setCreatedShareUrl((u) => (u ? null : 'active'))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5A5A40] text-white hover:bg-[#484833] text-xs font-medium cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Create Secure Share Link</span>
                  </button>
                </div>
              </div>

              {/* Share Configuration Drawer if opened */}
              {createdShareUrl && (
                <div className="p-4 rounded-2xl bg-[#FAF3E5] border border-[#E8D8B6] space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#875F23] flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Secure Encrypted Share Link
                    </span>
                    <button
                      onClick={() => setCreatedShareUrl(null)}
                      className="text-xs text-[#875F23] hover:underline"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#875F23] mb-1">
                        Link Expiry
                      </label>
                      <select
                        value={expiryHours}
                        onChange={(e) => setExpiryHours(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-[#D1CDBE] bg-white"
                      >
                        <option value="24">24 Hours</option>
                        <option value="72">3 Days (72 Hours)</option>
                        <option value="168">7 Days</option>
                        <option value="720">30 Days</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#875F23] mb-1">
                        Optional Passcode Protection
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 4-digit PIN or secret word"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-[#D1CDBE] bg-white"
                      >
                      </input>
                    </div>
                  </div>

                  {createdShareUrl !== 'active' ? (
                    <div className="space-y-2 pt-2 border-t border-[#E8D8B6]">
                      <p className="text-[11px] text-[#875F23]">Share link generated:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={createdShareUrl}
                          className="flex-1 text-xs p-2 rounded-lg bg-white border border-[#D1CDBE] font-mono select-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(createdShareUrl);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          className="px-3 py-2 rounded-lg bg-[#5A5A40] text-white text-xs font-medium cursor-pointer"
                        >
                          {copiedLink ? 'Copied!' : 'Copy Link'}
                        </button>
                        <a
                          href={createdShareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-[#EFEEE8] text-[#5E5D57] hover:text-[#3D3C38] border border-[#D1CDBE]"
                          title="Open view in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      {generatedReport.id && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleRevoke(generatedReport.id)}
                            className="text-[11px] text-red-600 hover:underline cursor-pointer"
                          >
                            Revoke Share Link
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleCreateShareLink}
                        disabled={isSharing}
                        className="px-4 py-1.5 rounded-lg bg-[#5A5A40] text-white text-xs font-medium cursor-pointer"
                      >
                        {isSharing ? 'Generating...' : 'Confirm & Generate Link'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* REPORT DOCUMENT (EDITABLE INLINE) */}
              <div
                id="therapist-report-document"
                className="bg-white border border-[#D1CDBE] rounded-3xl p-6 sm:p-10 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0"
              >
                {/* Header */}
                <div className="border-b border-[#D1CDBE] pb-6 flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-[#7C7A70] block">
                      Self-Reported Well-Being Reflection
                    </span>
                    <input
                      type="text"
                      value={generatedReport.title}
                      onChange={(e) =>
                        setGeneratedReport({ ...generatedReport, title: e.target.value })
                      }
                      className="text-2xl font-serif font-bold text-[#3D3C38] mt-1 bg-transparent border-b border-dashed border-[#CAD5C6] focus:outline-hidden focus:border-[#5A5A40] w-full"
                    />
                    <p className="text-xs text-[#7C7A70] mt-1.5">
                      Client: <strong>{generatedReport.clientName}</strong> &bull; Period: {generatedReport.period.replace(/_/g, ' ')} ({new Date(generatedReport.startDate).toLocaleDateString()} &ndash; {new Date(generatedReport.endDate).toLocaleDateString()})
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#D1CDBE] text-right">
                    <span className="text-[10px] text-[#7C7A70] block">Generated On</span>
                    <span className="text-xs font-semibold text-[#3D3C38]">
                      {new Date(generatedReport.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Section 1: Emotional Overview */}
                <div className="space-y-2">
                  <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
                    1. Emotional Overview & Intensity
                  </h3>
                  <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E2DFD2] flex gap-4 items-center text-xs flex-wrap mb-2">
                    <div>
                      <span className="text-[#7C7A70] block text-[10px]">Average Intensity:</span>
                      <span className="font-bold text-sm text-[#5A5A40]">
                        {generatedReport.emotionalOverview.averageIntensity} / 5.0
                      </span>
                    </div>
                    <div className="h-6 w-px bg-[#D1CDBE]" />
                    <div>
                      <span className="text-[#7C7A70] block text-[10px]">Primary Emotions:</span>
                      <span className="font-medium text-[#3D3C38]">
                        {generatedReport.emotionalOverview.dominantEmotions
                          .slice(0, 4)
                          .map((d) => `${d.emotion} (${d.count})`)
                          .join(', ') || 'Balanced'}
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={generatedReport.emotionalOverview.summaryText}
                    onChange={(e) =>
                      setGeneratedReport({
                        ...generatedReport,
                        emotionalOverview: {
                          ...generatedReport.emotionalOverview,
                          summaryText: e.target.value,
                        },
                      })
                    }
                    className="w-full text-xs p-3 rounded-xl border border-[#D1CDBE] bg-white focus:ring-1 focus:ring-[#5A5A40] leading-relaxed"
                  />
                </div>

                {/* Section 2: Recurring Themes */}
                <div className="space-y-2">
                  <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
                    2. Recurring Themes
                  </h3>
                  <div className="space-y-1.5">
                    {generatedReport.recurringThemes.map((theme, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[#5A5A40] text-xs">&bull;</span>
                        <input
                          type="text"
                          value={theme}
                          onChange={(e) => {
                            const updated = [...generatedReport.recurringThemes];
                            updated[idx] = e.target.value;
                            setGeneratedReport({ ...generatedReport, recurringThemes: updated });
                          }}
                          className="flex-1 text-xs p-2 rounded-lg border border-[#E2DFD2] bg-[#FAF9F5] focus:bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Positive Changes & Breakthroughs */}
                <div className="space-y-2">
                  <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    3. Positive Changes & Wins
                  </h3>
                  <div className="space-y-1.5">
                    {generatedReport.positiveChanges.map((change, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-emerald-600 text-xs">&bull;</span>
                        <input
                          type="text"
                          value={change}
                          onChange={(e) => {
                            const updated = [...generatedReport.positiveChanges];
                            updated[idx] = e.target.value;
                            setGeneratedReport({ ...generatedReport, positiveChanges: updated });
                          }}
                          className="flex-1 text-xs p-2 rounded-lg border border-[#E2DFD2] bg-[#FAF9F5] focus:bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Difficult Periods & Triggers */}
                <div className="space-y-2">
                  <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    4. Difficult Periods & Situational Triggers
                  </h3>
                  <div className="space-y-1.5">
                    {generatedReport.difficultPeriods.map((diff, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-indigo-600 text-xs">&bull;</span>
                        <input
                          type="text"
                          value={diff}
                          onChange={(e) => {
                            const updated = [...generatedReport.difficultPeriods];
                            updated[idx] = e.target.value;
                            setGeneratedReport({ ...generatedReport, difficultPeriods: updated });
                          }}
                          className="flex-1 text-xs p-2 rounded-lg border border-[#E2DFD2] bg-[#FAF9F5] focus:bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 5: Coping Activities & Sleep/Energy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-bold text-[#3D3C38]">
                      5a. Self-Care & Coping Activities
                    </h3>
                    <div className="space-y-1.5">
                      {generatedReport.copingActivities.map((act, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={act}
                          onChange={(e) => {
                            const updated = [...generatedReport.copingActivities];
                            updated[idx] = e.target.value;
                            setGeneratedReport({ ...generatedReport, copingActivities: updated });
                          }}
                          className="w-full text-xs p-2 rounded-lg border border-[#E2DFD2] bg-[#FAF9F5] focus:bg-white"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-serif font-bold text-[#3D3C38]">
                      5b. Sleep & Energy Notes
                    </h3>
                    <textarea
                      rows={3}
                      value={generatedReport.sleepEnergyNotes}
                      onChange={(e) =>
                        setGeneratedReport({
                          ...generatedReport,
                          sleepEnergyNotes: e.target.value,
                        })
                      }
                      className="w-full text-xs p-2.5 rounded-lg border border-[#E2DFD2] bg-[#FAF9F5] focus:bg-white resize-none"
                    />
                  </div>
                </div>

                {/* Section 6: Collaborative Discussion Prompts */}
                <div className="space-y-2">
                  <h3 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
                    6. Suggested Session Discussion Prompts
                  </h3>
                  <div className="space-y-1.5">
                    {generatedReport.discussionPrompts.map((prompt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[#5A5A40] text-xs font-bold">{idx + 1}.</span>
                        <input
                          type="text"
                          value={prompt}
                          onChange={(e) => {
                            const updated = [...generatedReport.discussionPrompts];
                            updated[idx] = e.target.value;
                            setGeneratedReport({ ...generatedReport, discussionPrompts: updated });
                          }}
                          className="flex-1 text-xs p-2 rounded-lg border border-[#E2DFD2] bg-[#FAF9F5] focus:bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visible Non-Diagnostic Note */}
                <div className="mt-8 pt-4 border-t border-[#D1CDBE] text-center text-[11px] text-[#7C7A70] italic">
                  &ldquo;This report is based on self-reported journal data and is not a clinical assessment.&rdquo;
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAST REPORTS */}
          {activeStep === 'history' && (
            <div className="space-y-3">
              {savedReports.length === 0 ? (
                <div className="text-center py-12 text-[#7C7A70]">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved reports found.</p>
                </div>
              ) : (
                savedReports.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-white border border-[#E2DFD2] shadow-2xs flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-sm font-serif font-bold text-[#3D3C38]">{r.title}</h4>
                      <p className="text-xs text-[#7C7A70]">
                        Period: {r.period} &bull; Created {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                      {r.shareToken && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mt-1 ${
                          r.isRevoked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {r.isRevoked ? 'Share Link Revoked' : 'Share Link Active'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratedReport(r);
                          setActiveStep('preview');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#5A5A40] text-white text-xs font-medium cursor-pointer"
                      >
                        View & Edit
                      </button>
                      {r.shareToken && !r.isRevoked && onRevokeReport && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(r.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium border border-red-200 cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                      {onDeleteReport && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this saved report?')) {
                              onDeleteReport(r.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-[#7C7A70] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
