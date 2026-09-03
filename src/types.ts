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

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  category: ReflectionCategory;
  mood: MoodType;
  initialText: string;
  summary?: string;
  keyInsights?: string[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
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
