import React, { useState } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Lock,
  Cpu,
} from 'lucide-react';
import type { UserProfile, UserAISettings } from '../types';
import { saveUserAISettings, deleteUserAISettings } from '../lib/firebase';
import { setGlobalAISettings } from '../lib/aiSettingsState';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  aiSettings: UserAISettings | null;
  onSettingsUpdated: (updated: UserAISettings) => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  aiSettings,
  onSettingsUpdated,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasKey = Boolean(aiSettings?.hasKeyConfigured && aiSettings?.maskedKey);
  const usePersonalKey = Boolean(aiSettings?.usePersonalKey && hasKey);

  // Toggle between using personal key and app default
  const handleToggleSource = async () => {
    if (!hasKey) {
      setIsUpdatingKey(true);
      return;
    }
    const newToggleState = !usePersonalKey;
    setErrorMessage(null);
    try {
      const updated: UserAISettings = {
        usePersonalKey: newToggleState,
        hasKeyConfigured: true,
        maskedKey: aiSettings?.maskedKey || null,
        encryptedKey: aiSettings?.encryptedKey || null,
        updatedAt: new Date().toISOString(),
        lastTestedAt: aiSettings?.lastTestedAt,
      };
      await saveUserAISettings(user.uid, updated);
      setGlobalAISettings(updated);
      onSettingsUpdated(updated);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update AI engine preference.');
    }
  };

  // Test personal key before saving or test currently configured key
  const handleTestKey = async (keyToValidate?: string) => {
    setIsTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    try {
      const payload: any = {};
      if (keyToValidate) {
        payload.apiKey = keyToValidate.trim();
      } else if (aiSettings?.encryptedKey) {
        payload.encryptedKey = aiSettings.encryptedKey;
      } else if (apiKeyInput.trim()) {
        payload.apiKey = apiKeyInput.trim();
      } else {
        throw new Error('Please enter a Gemini API key to test.');
      }

      const res = await fetch('/api/settings/ai-key/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to validate API key with Google AI Studio.');
      }

      setTestResult({
        success: true,
        message: data.message || 'Key verified! Responsive and functional with Gemini 3.8 Flash.',
      });

      if (hasKey && !keyToValidate && aiSettings) {
        const updated: UserAISettings = {
          ...aiSettings,
          lastTestedAt: new Date().toISOString(),
        };
        await saveUserAISettings(user.uid, updated);
        setGlobalAISettings(updated);
        onSettingsUpdated(updated);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Validation failed. Please double-check your API key.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save and encrypt personal key
  const handleSaveKey = async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      setErrorMessage('Please paste your Gemini API key from Google AI Studio.');
      return;
    }
    if (key.length < 10) {
      setErrorMessage('API key is too short. Please check the key value.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 1. First run a quick validation test
      const testRes = await fetch('/api/settings/ai-key/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const testData = await testRes.json();
      if (!testRes.ok || !testData.success) {
        throw new Error(testData.error || 'API key verification failed. Please verify your key in Google AI Studio.');
      }

      // 2. Encrypt key via AES-256-GCM server-side
      const encRes = await fetch('/api/settings/ai-key/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const encData = await encRes.json();
      if (!encRes.ok || !encData.success) {
        throw new Error(encData.error || 'Server encryption step failed.');
      }

      // 3. Persist to owner-bound Firestore subcollection /users/{uid}/settings/ai
      const updatedSettings: UserAISettings = {
        usePersonalKey: true,
        hasKeyConfigured: true,
        maskedKey: encData.maskedKey,
        encryptedKey: encData.encryptedKey,
        updatedAt: new Date().toISOString(),
        lastTestedAt: new Date().toISOString(),
      };

      await saveUserAISettings(user.uid, updatedSettings);
      setGlobalAISettings(updatedSettings);
      onSettingsUpdated(updatedSettings);

      setApiKeyInput('');
      setIsUpdatingKey(false);
      setTestResult({
        success: true,
        message: 'Personal Gemini key securely encrypted and activated!',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to securely store your personal key.');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove configured personal key
  const handleRemoveKey = async () => {
    if (!window.confirm('Are you sure you want to remove your personal Gemini API key? Your AI features will instantly switch back to the app default key.')) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await deleteUserAISettings(user.uid);
      const clearedSettings: UserAISettings = {
        usePersonalKey: false,
        hasKeyConfigured: false,
        maskedKey: null,
        encryptedKey: null,
        updatedAt: new Date().toISOString(),
      };
      setGlobalAISettings(clearedSettings);
      onSettingsUpdated(clearedSettings);
      setIsUpdatingKey(false);
      setApiKeyInput('');
      setTestResult(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to remove personal key.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3D3C38]/40 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-[#FAF9F5] w-full max-w-xl rounded-2xl border border-[#D1CDBE] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#D1CDBE] flex items-center justify-between bg-[#F4F2EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5A5A40] text-white flex items-center justify-center shadow-xs">
              <Key className="w-5 h-5 text-[#EAE8DD]" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#3D3C38]">
                AI Settings & Personal Key
              </h2>
              <p className="text-xs text-[#7C7A70]">
                Configure Bring Your Own Key (BYOK) with AES-256-GCM zero-leak encryption
              </p>
            </div>
          </div>
          <button
            id="close-ai-settings-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7C7A70] hover:text-[#3D3C38] hover:bg-[#EAE8DD] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Active Mode Banner */}
          <div className="p-4 rounded-xl border border-[#D1CDBE] bg-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  usePersonalKey
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-[#EFEEE8] text-[#5A5A40]'
                }`}
              >
                {usePersonalKey ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Cpu className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#3D3C38]">
                    {usePersonalKey ? 'Using Personal Gemini API Key' : 'Using App Default Key'}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      usePersonalKey
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-[#EFEEE8] text-[#5A5A40] border border-[#D1CDBE]'
                    }`}
                  >
                    {usePersonalKey ? 'Active' : 'Standard'}
                  </span>
                </div>
                <p className="text-xs text-[#7C7A70] mt-0.5">
                  {usePersonalKey
                    ? 'Your private Google AI Studio key powers reflection and insights.'
                    : 'The shared application service powers reflection and insights.'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            {hasKey && (
              <label
                id="toggle-byok-label"
                className="relative inline-flex items-center cursor-pointer shrink-0"
              >
                <input
                  id="toggle-byok-input"
                  type="checkbox"
                  checked={usePersonalKey}
                  onChange={handleToggleSource}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#D1CDBE] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A5A40]"></div>
              </label>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              )}
              <div className="flex-1 font-medium">{testResult.message}</div>
            </div>
          )}

          {/* Key Management Section */}
          {hasKey && !isUpdatingKey ? (
            <div className="p-4 rounded-xl border border-[#D1CDBE] bg-[#FAF9F5] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5E5D57] uppercase tracking-wider">
                  Configured API Key
                </span>
                <span className="text-[11px] text-[#7C7A70] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#5A5A40]" />
                  AES-256-GCM Encrypted
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-[#D1CDBE] flex items-center justify-between font-mono text-sm text-[#3D3C38]">
                <span>{aiSettings?.maskedKey}</span>
                <span className="text-xs font-sans text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                  Secured at rest
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  id="test-active-key-btn"
                  type="button"
                  onClick={() => handleTestKey()}
                  disabled={isTesting || isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D1CDBE] bg-white hover:bg-[#FAF9F5] text-xs font-medium text-[#3D3C38] transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5A5A40]" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-[#5A5A40]" />
                  )}
                  <span>Test Key</span>
                </button>

                <button
                  id="update-key-btn"
                  type="button"
                  onClick={() => {
                    setIsUpdatingKey(true);
                    setTestResult(null);
                    setErrorMessage(null);
                  }}
                  disabled={isTesting || isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D1CDBE] bg-white hover:bg-[#FAF9F5] text-xs font-medium text-[#3D3C38] transition-colors cursor-pointer disabled:opacity-60"
                >
                  <span>Update Key</span>
                </button>

                <button
                  id="remove-key-btn"
                  type="button"
                  onClick={handleRemoveKey}
                  disabled={isTesting || isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-medium text-red-700 transition-colors cursor-pointer ml-auto disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 rounded-xl border border-[#D1CDBE] bg-white">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="personal-gemini-key-input"
                  className="text-xs font-semibold text-[#3D3C38] flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>Enter Personal Gemini API Key</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#5A5A40] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Get Key from Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  id="personal-gemini-key-input"
                  type={showKeyText ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setTestResult(null);
                    setErrorMessage(null);
                  }}
                  placeholder="Paste your Gemini API key (AIzaSy...)"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono rounded-xl border border-[#D1CDBE] bg-[#FAF9F5] text-[#3D3C38] placeholder-[#9E9B90] focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30 focus:border-[#5A5A40]"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C7A70] hover:text-[#3D3C38]"
                  title={showKeyText ? 'Hide key' : 'Show key'}
                >
                  {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  id="test-input-key-btn"
                  type="button"
                  onClick={() => handleTestKey(apiKeyInput)}
                  disabled={!apiKeyInput.trim() || isTesting || isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D1CDBE] bg-[#FAF9F5] hover:bg-[#EFEEE8] text-xs font-medium text-[#3D3C38] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5A5A40]" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
                  )}
                  <span>Test Key</span>
                </button>

                <div className="flex items-center gap-2">
                  {hasKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUpdatingKey(false);
                        setApiKeyInput('');
                        setTestResult(null);
                      }}
                      className="px-3 py-2 text-xs font-medium text-[#7C7A70] hover:text-[#3D3C38] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    id="save-personal-key-btn"
                    type="button"
                    onClick={handleSaveKey}
                    disabled={!apiKeyInput.trim() || isSaving || isTesting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5A5A40] text-white hover:bg-[#484833] text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save & Encrypt Key</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy & Quota Information Box */}
          <div className="p-4 rounded-xl border border-[#D1CDBE]/70 bg-[#F4F2EB] space-y-2.5">
            <h4 className="text-xs font-semibold text-[#3D3C38] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#5A5A40]" />
              <span>Why Bring Your Own Key & How It's Protected</span>
            </h4>
            <ul className="text-xs text-[#5E5D57] space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>
                <strong>Higher Personal Quota:</strong> Use your personal project limits from Google AI Studio without sharing rate limits with other users.
              </li>
              <li>
                <strong>Zero-Leak Encryption at Rest:</strong> Your key is encrypted via server-side <code>AES-256-GCM</code> before saving. It is never stored in plaintext in Firestore, never printed in logs, and only decrypted server-side for your personal calls.
              </li>
              <li>
                <strong>Automatic Fail-Safe Guarantee:</strong> If your personal key ever exhausts its quota or encounters an error, the app gracefully falls back to the default service so your reflection is never blocked.
              </li>
              <li>
                <strong>Owner-Bound Isolation:</strong> Under Firestore Security Rules (<code>request.auth.uid == userId</code>), only your authenticated Google account can read or alter your encrypted key configuration.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#D1CDBE] bg-[#F4F2EB] flex items-center justify-end">
          <button
            id="close-ai-settings-footer-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#D1CDBE] text-[#3D3C38] hover:bg-[#FAF9F5] text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
