import type { UserAISettings, EncryptedKeyPayload } from '../types';

let currentAISettings: UserAISettings | null = null;
const listeners = new Set<(settings: UserAISettings | null) => void>();

export const setGlobalAISettings = (settings: UserAISettings | null) => {
  currentAISettings = settings;
  listeners.forEach((listener) => listener(settings));
};

export const getGlobalAISettings = (): UserAISettings | null => {
  return currentAISettings;
};

export const subscribeToAISettings = (listener: (settings: UserAISettings | null) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Returns the payload fragment to attach to any AI request so that
 * the server can utilize the user's encrypted personal key if enabled.
 */
export const getAIRequestHeadersAndBody = (): {
  usePersonalKey: boolean;
  encryptedKey?: EncryptedKeyPayload | null;
} => {
  if (
    currentAISettings &&
    currentAISettings.usePersonalKey &&
    currentAISettings.encryptedKey
  ) {
    return {
      usePersonalKey: true,
      encryptedKey: currentAISettings.encryptedKey,
    };
  }
  return {
    usePersonalKey: false,
  };
};
