import React, { useState, useEffect } from 'react';
import { Lock, Shield, FileText, AlertCircle, Calendar, ArrowLeft } from 'lucide-react';
import type { TherapistReportData } from '../types';

interface SharedReportViewerProps {
  shareToken: string;
  onExit: () => void;
}

export const SharedReportViewer: React.FC<SharedReportViewerProps> = ({
  shareToken,
  onExit,
}) => {
  const [report, setReport] = useState<TherapistReportData | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async (pwd?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = {};
      if (pwd) {
        headers['x-report-password'] = pwd;
      }

      const res = await fetch(`/api/reports/shared/${encodeURIComponent(shareToken)}`, {
        headers,
      });

      if (res.status === 401) {
        setRequiresPassword(true);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load report.');
      }

      const reportData = await res.json();
      setReport(reportData);
      setRequiresPassword(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Report not found, expired, or access has been revoked.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [shareToken]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport(password);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#3D3C38] py-8 px-4 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-3xl mb-4 flex justify-between items-center">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A5A40] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Journal</span>
        </button>

        <span className="text-xs text-[#7C7A70] flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-[#5A5A40]" />
          Encrypted Shared Report View
        </span>
      </div>

      {isLoading ? (
        <div className="w-full max-w-3xl p-12 bg-white rounded-3xl border border-[#D1CDBE] text-center shadow-xs">
          <div className="w-8 h-8 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-serif text-[#3D3C38]">Verifying secure link...</p>
        </div>
      ) : requiresPassword ? (
        <div className="w-full max-w-md p-8 bg-white rounded-3xl border border-[#D1CDBE] shadow-lg text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#EAE8DD] text-[#5A5A40] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[#3D3C38] mb-1">
            Password Protected Report
          </h2>
          <p className="text-xs text-[#7C7A70] mb-6">
            The author has protected this reflection report with a passcode. Please enter it below to access.
          </p>

          {errorMsg && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Enter passcode..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-center text-sm px-4 py-2.5 rounded-xl border border-[#D1CDBE] focus:outline-hidden focus:ring-2 focus:ring-[#5A5A40]"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#5A5A40] text-white text-xs font-semibold hover:bg-[#484833] transition-colors cursor-pointer"
            >
              Unlock Report
            </button>
          </form>
        </div>
      ) : errorMsg ? (
        <div className="w-full max-w-md p-8 bg-white rounded-3xl border border-red-200 shadow-md text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-serif font-bold text-[#3D3C38] mb-2">
            Unable to Access Report
          </h2>
          <p className="text-xs text-[#7C7A70] mb-6 leading-relaxed">
            {errorMsg}
          </p>
          <button
            onClick={onExit}
            className="px-5 py-2 rounded-xl bg-[#5A5A40] text-white text-xs font-medium cursor-pointer"
          >
            Back to Application
          </button>
        </div>
      ) : report ? (
        <div className="w-full max-w-3xl bg-white border border-[#D1CDBE] rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
          {/* Header */}
          <div className="border-b border-[#D1CDBE] pb-6">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#7C7A70] block">
              Shared Reflection & Well-Being Summary
            </span>
            <h1 className="text-2xl font-serif font-bold text-[#3D3C38] mt-1">
              {report.title}
            </h1>
            <p className="text-xs text-[#7C7A70] mt-1">
              Client: <strong>{report.clientName}</strong> &bull; Period:{' '}
              {report.period?.replace(/_/g, ' ')} ({new Date(report.startDate).toLocaleDateString()} &ndash; {new Date(report.endDate).toLocaleDateString()})
            </p>
          </div>

          {/* Section 1: Overview */}
          <div className="space-y-2">
            <h2 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
              1. Emotional Overview & Intensity
            </h2>
            <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E2DFD2] flex gap-4 items-center text-xs flex-wrap">
              <div>
                <span className="text-[#7C7A70] block text-[10px]">Average Intensity:</span>
                <span className="font-bold text-sm text-[#5A5A40]">
                  {report.emotionalOverview.averageIntensity} / 5.0
                </span>
              </div>
              <div className="h-6 w-px bg-[#D1CDBE]" />
              <div>
                <span className="text-[#7C7A70] block text-[10px]">Dominant Emotions:</span>
                <span className="font-medium text-[#3D3C38]">
                  {report.emotionalOverview.dominantEmotions
                    ?.slice(0, 4)
                    .map((d) => `${d.emotion} (${d.count})`)
                    .join(', ') || 'Balanced'}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#3D3C38] leading-relaxed p-3 bg-white border border-[#E2DFD2] rounded-xl">
              {report.emotionalOverview.summaryText}
            </p>
          </div>

          {/* Section 2: Themes */}
          {report.recurringThemes && report.recurringThemes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
                2. Recurring Themes
              </h2>
              <ul className="space-y-1 text-xs">
                {report.recurringThemes.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-[#3D3C38]">
                    <span className="text-[#5A5A40]">&bull;</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 3: Positive Changes */}
          {report.positiveChanges && report.positiveChanges.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                3. Positive Changes & Coping Wins
              </h2>
              <ul className="space-y-1 text-xs">
                {report.positiveChanges.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-[#3D3C38]">
                    <span className="text-emerald-600">&bull;</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 4: Difficult Periods */}
          {report.difficultPeriods && report.difficultPeriods.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                4. Difficult Periods & Situational Triggers
              </h2>
              <ul className="space-y-1 text-xs">
                {report.difficultPeriods.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-[#3D3C38]">
                    <span className="text-indigo-600">&bull;</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 5: Coping & Sleep/Energy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.copingActivities && report.copingActivities.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-serif font-bold text-[#3D3C38]">
                  Self-Care Activities
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {report.copingActivities.map((act, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-[#FAF9F5] border border-[#D1CDBE] px-2 py-0.5 rounded-md"
                    >
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {report.sleepEnergyNotes && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-serif font-bold text-[#3D3C38]">
                  Sleep & Energy Context
                </h3>
                <p className="text-xs text-[#5E5D57] bg-[#FAF9F5] p-2.5 rounded-xl border border-[#D1CDBE]">
                  {report.sleepEnergyNotes}
                </p>
              </div>
            )}
          </div>

          {/* Section 6: Discussion Prompts */}
          {report.discussionPrompts && report.discussionPrompts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-serif font-bold text-[#3D3C38] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
                5. Suggested Discussion Prompts
              </h2>
              <ol className="space-y-1 text-xs">
                {report.discussionPrompts.map((prompt, i) => (
                  <li key={i} className="flex items-start gap-2 text-[#3D3C38]">
                    <span className="font-bold text-[#5A5A40]">{i + 1}.</span>
                    <span>{prompt}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Clinician Notes */}
          {report.customClinicianNotes && (
            <div className="space-y-2 p-3 bg-[#FAF3E5] border border-[#E8D8B6] rounded-2xl">
              <h3 className="text-xs font-bold text-[#875F23]">
                Client Discussion Note:
              </h3>
              <p className="text-xs text-[#875F23] italic leading-relaxed">
                "{report.customClinicianNotes}"
              </p>
            </div>
          )}

          {/* Disclaimer Footer */}
          <div className="mt-8 pt-4 border-t border-[#D1CDBE] text-center text-[11px] text-[#7C7A70] italic">
            &ldquo;This report is based on self-reported journal data and is not a clinical assessment.&rdquo;
          </div>
        </div>
      ) : null}
    </div>
  );
};
