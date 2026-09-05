export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type ReflectionCategory =
  | 'Daily Reflection'
  | 'Gratitude & Joy'
  | 'Mindfulness & Peace'
  | 'Career & Ambition'
  | 'Creative Spark'
  | 'Problem Solving';

export type MoodType =
  | 'peaceful'
  | 'motivated'
  | 'thoughtful'
  | 'grateful'
  | 'anxious'
  | 'neutral';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface LocationTag {
  latitude: number;
  longitude: number;
  address: string;
  placeName?: string;
  placeId?: string;
  staticMapUrl?: string;
}

export interface MediaAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf';
  mimeType: string;
  url: string;
  storagePath?: string;
  size: number;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  category: ReflectionCategory;
  mood: MoodType;
  initialText: string;
  bodyFormat?: 'plain' | 'markdown';
  location?: LocationTag | null;
  attachments?: MediaAttachment[];
  summary?: string;
  keyInsights?: string[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface VoiceTranscriptionResult {
  rawTranscript?: string;
  structuredText: string;
  modelUsed: string;
}

export interface GeminiChatResponse {
  reply: string;
  modelUsed: string;
}

export interface GeminiSummaryResponse {
  title: string;
  summary: string;
  keyInsights: string[];
  detectedMood?: MoodType;
  suggestedAction?: string;
  modelUsed: string;
}

// FEATURE 5: Mood Check-In Types
export type CheckInMood =
  | 'Happy'
  | 'Calm'
  | 'Neutral'
  | 'Sad'
  | 'Anxious'
  | 'Angry'
  | 'Stressed'
  | 'Excited';

export type CheckInIntensity = 1 | 2 | 3 | 4 | 5;

export interface CheckInRecord {
  id: string;
  userId: string;
  mood: CheckInMood;
  intensity: CheckInIntensity;
  notes?: string;
  activities?: string[];
  location?: LocationTag | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSettings {
  enabled: boolean;
  timeOfDay: string;
  lastDismissedDate?: string;
}

// FEATURE 4: Insights & Well-Being Types
export interface InsightsFilter {
  timeframe: '7d' | '30d' | '90d' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  mood?: string;
  category?: string;
  locationQuery?: string;
  excludedEntryIds: string[];
}

export interface EmotionCount {
  emotion: string;
  count: number;
  percentage: number;
  color: string;
}

export interface WellBeingAnalysis {
  dominantEmotions: EmotionCount[];
  averageIntensity: number;
  emotionalIntensity?: {
    averageScore?: number;
    trend?: string;
    description?: string;
  };
  recurringThemes: string[];
  positiveMoments: { id?: string; title: string; snippet: string; date: string }[];
  detectedPatterns: string[];
  patterns?: string[];
  supportiveSuggestions: {
    journalingPrompts: string[];
    breathingExercise: {
      name: string;
      technique: string;
      instructions: string;
    };
    gratitudePrompts: string[];
    trustedContactReminder: string;
  };
  suggestions?: {
    journalingPrompt?: string;
    connectionReminder?: string;
    breathingExercise?: string;
  };
  aiSummary?: string;
  analyzedEntriesCount: number;
  generatedAt: string;
  disclaimer: string;
}

export type InsightsAnalysisResult = WellBeingAnalysis;

// FEATURE 6: Shareable Therapist Report Types
export type ReportPeriod = 'last_week' | 'last_month' | 'last_three_months' | 'custom';

export interface TherapistReportData {
  id: string;
  userId: string;
  title: string;
  clientName?: string;
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  createdAt: string;
  emotionalOverview: {
    averageIntensity: number;
    dominantEmotions: { emotion: string; count: number }[];
    summaryText: string;
  };
  recurringThemes: string[];
  positiveChanges: string[];
  difficultPeriods: string[];
  copingActivities: string[];
  sleepEnergyNotes: string;
  discussionPrompts: string[];
  selectedReflections: {
    id: string;
    title: string;
    date: string;
    mood: string;
    excerpt: string;
  }[];
  customClinicianNotes?: string;
  shareToken?: string;
  shareExpiry?: string;
  isPasswordProtected?: boolean;
  passwordHash?: string;
  isRevoked?: boolean;
  disclaimer: string;
}

