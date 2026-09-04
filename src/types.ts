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
