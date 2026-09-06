import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Mount middleware
app.use(express.json({ limit: '15mb' }));

// Lazy GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Fallback ladder of reliable models for high availability
const MODEL_FALLBACK_LADDER = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
];

// =======================================================
// AES-256-GCM Secure Encryption & Decryption for BYOK
// =======================================================
const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET ||
  process.env.GEMINI_API_KEY ||
  'mindful-reflections-secure-vault-salt-2026';
const DERIVED_KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

function encryptApiKey(rawKey: string): { encrypted: EncryptedPayload; maskedKey: string } {
  const trimmed = rawKey.trim();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', DERIVED_KEY, iv);
  let encrypted = cipher.update(trimmed, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  const last4 = trimmed.length >= 4 ? trimmed.slice(-4) : trimmed;
  const maskedKey = '••••••••••••' + last4;

  return {
    encrypted: {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      tag,
    },
    maskedKey,
  };
}

function decryptApiKey(payload?: any): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const { ciphertext, iv, tag } = payload;
  if (!ciphertext || !iv || !tag) return null;

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      DERIVED_KEY,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt user personal key:', err);
    return null;
  }
}

function extractCustomKeyFromRequest(req: Request): string | null {
  const { usePersonalKey, encryptedKey } = req.body || {};
  if (!usePersonalKey || !encryptedKey) {
    return null;
  }
  return decryptApiKey(encryptedKey);
}

// Helper to execute generation with automatic model fallback and BYOK personal key support
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
  customKey?: string | null;
}): Promise<{ text: string; modelUsed: string; usedPersonalKey?: boolean; fallbackNotice?: string }> {
  let personalAI: GoogleGenAI | null = null;
  let isPersonalKeyProvided = false;

  if (params.customKey && typeof params.customKey === 'string' && params.customKey.trim().length > 10) {
    try {
      personalAI = new GoogleGenAI({ apiKey: params.customKey.trim() });
      isPersonalKeyProvided = true;
    } catch (e) {
      console.warn('Could not initialize personal Gemini client, falling back to default:', e);
    }
  }

  // 1. If user provided a personal key, try running with personal key first
  if (personalAI && isPersonalKeyProvided) {
    for (const model of MODEL_FALLBACK_LADDER) {
      try {
        const response = await personalAI.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        const responseText = response.text || '';
        if (responseText) {
          return { text: responseText, modelUsed: model, usedPersonalKey: true };
        }
      } catch (error: any) {
        console.warn(`Attempt with personal key on "${model}" failed:`, error?.message || error);
        // Continue to try other models in ladder if quota or transient error
        const statusCode = error?.status || error?.statusCode || 0;
        if (
          [404, 429, 500, 503].includes(statusCode) ||
          error?.message?.includes('not found') ||
          error?.message?.includes('quota') ||
          error?.message?.includes('RESOURCE_EXHAUSTED')
        ) {
          continue;
        }
      }
    }
    console.warn('Personal key exhausted quota or encountered error. Gracefully falling back to app default key.');
  }

  // 2. Fallback to app default key
  const defaultAI = getAIClient();
  if (!defaultAI) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await defaultAI.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      const responseText = response.text || '';
      if (responseText) {
        return {
          text: responseText,
          modelUsed: model,
          usedPersonalKey: false,
          fallbackNotice: isPersonalKeyProvided
            ? 'Personal key rate limit or error occurred; safely used application default key.'
            : undefined,
        };
      }
    } catch (error: any) {
      console.warn(`Attempt with model "${model}" failed:`, error?.message || error);
      lastError = error;
      const statusCode = error?.status || error?.statusCode || 0;
      if ([404, 429, 500, 503].includes(statusCode) || error?.message?.includes('not found') || error?.message?.includes('quota')) {
        continue;
      }
      if (statusCode === 401 || statusCode === 403) {
        throw error;
      }
    }
  }

  throw lastError || new Error('All fallback models failed to generate a response.');
}

// =======================================================
// BYOK Key Validation & Encryption Endpoints
// =======================================================

// Validate an entered Gemini API Key with a lightweight request
app.post('/api/settings/ai-key/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey, encryptedKey } = req.body;
    let keyToTest = '';

    if (apiKey && typeof apiKey === 'string') {
      keyToTest = apiKey.trim();
    } else if (encryptedKey) {
      const decrypted = decryptApiKey(encryptedKey);
      if (decrypted) keyToTest = decrypted;
    }

    if (!keyToTest || keyToTest.length < 10) {
      res.status(400).json({ success: false, error: 'Please enter a valid Gemini API key.' });
      return;
    }

    const testAI = new GoogleGenAI({ apiKey: keyToTest });
    const response = await testAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Ping: reply with "OK".',
      config: { maxOutputTokens: 5 },
    });

    if (response && response.text) {
      res.json({
        success: true,
        message: 'Personal Gemini API key validated successfully!',
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: 'Key validation call did not return a response.',
    });
  } catch (error: any) {
    console.warn('API key test error:', error?.message || error);
    const msg = String(error?.message || '');
    let friendlyError = 'Failed to validate API key with Google AI Studio.';
    if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('400')) {
      friendlyError = 'Invalid Gemini API key. Please check that you copied the complete key from Google AI Studio.';
    } else if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      friendlyError = 'API key quota or rate limit exceeded for this key in Google AI Studio.';
    } else if (msg.includes('404')) {
      friendlyError = 'Model service not found for this API key project.';
    } else {
      friendlyError = msg.length < 150 ? msg : 'Unable to connect with the provided key.';
    }
    res.status(400).json({
      success: false,
      error: friendlyError,
    });
  }
});

// Securely encrypt key using AES-256-GCM and return ciphertext + masked string
app.post('/api/settings/ai-key/encrypt', async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      res.status(400).json({ error: 'Please provide a valid API key string.' });
      return;
    }
    const result = encryptApiKey(apiKey);
    res.json({
      success: true,
      encryptedKey: result.encrypted,
      maskedKey: result.maskedKey,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to securely encrypt API key.' });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Multi-turn Conversational Reflection Endpoint
app.post('/api/gemini/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, category, mood, title } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Request must include a non-empty array of messages.' });
      return;
    }

    const ai = getAIClient();
    if (!ai) {
      // Return a graceful offline fallback if API key is not yet set
      res.json({
        reply: "I hear your thoughts and reflections. To enable real-time Gemini AI insights and conversational analysis, please configure your GEMINI_API_KEY in the AI Studio Settings panel.",
        modelUsed: 'local-fallback',
      });
      return;
    }

    const systemInstruction = `You are a mindful, emotionally intelligent, and deeply supportive Journaling & Reflection Companion.
Your purpose is to help the user unpack their thoughts, explore their emotions with compassionate inquiry, uncover cognitive blindspots, and discover actionable clarity.

Current Context:
- Reflection Topic/Title: ${title || 'Personal Reflection'}
- Category: ${category || 'General Reflection'}
- User Mood: ${mood || 'Reflective'}

Guidelines:
1. Warm, authentic, and grounded tone without generic clichés or toxic positivity.
2. Acknowledge the emotional core of what the user is experiencing.
3. Offer 1-2 thoughtful, open-ended inquiry questions that invite deeper contemplation or self-compassion.
4. Keep paragraphs concise, well-formatted, and visually pleasant.
5. Never pretend to be a licensed medical/psychiatric professional; encourage healthy real-world support for acute distress.`;

    // Map conversation turns to Gemini API contents
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').trim() }],
    }));

    const customKey = extractCustomKeyFromRequest(req);
    const result = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.75,
        maxOutputTokens: 1024,
      },
      customKey,
    });

    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      usedPersonalKey: result.usedPersonalKey,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate AI response. Please try again.',
    });
  }
});

// Summarization & Key Insights Extraction Endpoint
app.post('/api/gemini/summarize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, messages, category } = req.body;

    if (!text && (!Array.isArray(messages) || messages.length === 0)) {
      res.status(400).json({ error: 'Journal text or conversation messages are required.' });
      return;
    }

    const ai = getAIClient();
    if (!ai) {
      res.json({
        title: 'Daily Reflection',
        summary: 'A meaningful journal entry capturing personal thoughts and reflections.',
        keyInsights: ['Documented personal perspective', 'Explored active thoughts and feelings'],
        detectedMood: 'thoughtful',
        suggestedAction: 'Take a brief quiet moment to digest your reflections.',
        modelUsed: 'local-fallback',
      });
      return;
    }

    let compiledContent = text || '';
    if (Array.isArray(messages) && messages.length > 0) {
      compiledContent += '\n\nConversation transcript:\n' +
        messages
          .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Gemini'}: ${m.content}`)
          .join('\n');
    }

    const prompt = `Analyze this personal journal entry and conversation. Provide a structured psychological reflection summary, an evocative 3-5 word title, 2-4 key actionable insights or takeaways, detected dominant mood (one of: peaceful, motivated, thoughtful, grateful, anxious, neutral), and one grounding suggested next step.

Category: ${category || 'General'}
Content:
"""
${compiledContent.slice(0, 8000)}
"""

Respond ONLY in valid JSON matching this exact structure:
{
  "title": "Evocative Title Here",
  "summary": "2-3 sentence concise synthesis of the core theme and emotional arc.",
  "keyInsights": [
    "Insight or takeaway 1",
    "Insight or takeaway 2",
    "Insight or takeaway 3"
  ],
  "detectedMood": "thoughtful",
  "suggestedAction": "One small mindful micro-action or reflection question."
}`;

    const customKey = extractCustomKeyFromRequest(req);
    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
      customKey,
    });

    let parsed: any;
    try {
      // Strip markdown code fences if any
      const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        title: 'Mindful Reflection',
        summary: result.text.slice(0, 300),
        keyInsights: ['Deepened personal self-awareness', 'Synthesized reflections'],
        detectedMood: 'thoughtful',
      };
    }

    res.json({
      title: parsed.title || 'Mindful Reflection',
      summary: parsed.summary || 'A meaningful reflection session.',
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      detectedMood: parsed.detectedMood || 'thoughtful',
      suggestedAction: parsed.suggestedAction || '',
      modelUsed: result.modelUsed,
      usedPersonalKey: result.usedPersonalKey,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/summarize:', error);
    res.status(500).json({
      error: error?.message || 'Failed to synthesize summary.',
    });
  }
});

// Dynamic Prompt Generator Endpoint
app.post('/api/gemini/prompts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, currentMood } = req.body;
    const ai = getAIClient();

    if (!ai) {
      res.json({
        prompts: [
          'What is one moment from today that gave you unexpected energy or calm?',
          'What is a thought or worry you can consciously give yourself permission to release right now?',
          'What is one small choice you made today that your future self will thank you for?',
        ],
      });
      return;
    }

    const promptText = `Generate 3 compelling, thoughtful, and psychologically resonant journaling prompts for someone doing a "${category || 'Daily Reflection'}" who is feeling "${currentMood || 'reflective'}".
Keep each prompt under 25 words. Return ONLY a JSON array of strings, e.g. ["Prompt 1", "Prompt 2", "Prompt 3"].`;

    const customKey = extractCustomKeyFromRequest(req);
    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
      customKey,
    });

    let prompts: string[] = [];
    try {
      const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      prompts = JSON.parse(cleaned);
    } catch {
      prompts = [
        'What gave you peace today?',
        'What is an insight you want to remember?',
        'How can you support yourself in the days ahead?',
      ];
    }

    res.json({ prompts });
  } catch (error: any) {
    console.error('Error generating prompts:', error);
    res.json({
      prompts: [
        'What was the highlight of your day?',
        'What emotion is asking for your attention right now?',
        'What are three things you feel genuinely grateful for today?',
      ],
    });
  }
});

// OpenStreetMap & Geocoding Proxy (Reverse & Forward Geocoding via Nominatim)
app.post('/api/maps/geocode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, address } = req.body;

    // If coordinates provided: Reverse Geocoding via OpenStreetMap Nominatim
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`;
        const nomRes = await fetch(nomUrl, {
          headers: { 'User-Agent': 'MindfulReflections-AIJournal/1.0 (contact: support@mindfulreflections.app)' },
        });
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          const displayName = nomData.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          res.json({
            address: displayName,
            latitude,
            longitude,
            placeId: String(nomData.place_id || ''),
          });
          return;
        }
      } catch (nomErr) {
        console.warn('Nominatim reverse geocode error:', nomErr);
      }

      res.json({
        address: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        latitude,
        longitude,
      });
      return;
    }

    // If address text provided: Forward Geocoding via OpenStreetMap Nominatim
    if (typeof address === 'string' && address.trim()) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`;
        const nomRes = await fetch(nomUrl, {
          headers: { 'User-Agent': 'MindfulReflections-AIJournal/1.0 (contact: support@mindfulreflections.app)' },
        });
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (Array.isArray(nomData) && nomData.length > 0) {
            const first = nomData[0];
            res.json({
              address: first.display_name,
              latitude: parseFloat(first.lat),
              longitude: parseFloat(first.lon),
              placeId: String(first.place_id || ''),
            });
            return;
          }
        }
      } catch (nomErr) {
        console.warn('Nominatim forward search error:', nomErr);
      }

      res.status(404).json({ error: 'Could not resolve location for the specified address.' });
      return;
    }

    res.status(400).json({ error: 'Latitude & Longitude or Address is required.' });
  } catch (error: any) {
    console.error('Error in /api/maps/geocode:', error);
    res.status(500).json({ error: error?.message || 'Geocoding failed.' });
  }
});

// OpenStreetMap Places / Nominatim Search Proxy
app.post('/api/maps/places-search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query string is required.' });
      return;
    }

    // Query Nominatim search
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'MindfulReflections-AIJournal/1.0 (contact: support@mindfulreflections.app)' },
      });
      if (nomRes.ok) {
        const items = await nomRes.json();
        if (Array.isArray(items)) {
          const predictions = items.map((item: any) => ({
            placeId: String(item.place_id),
            description: item.display_name,
            mainText: item.name || item.display_name.split(',')[0],
            secondaryText: item.display_name.split(',').slice(1).join(',').trim(),
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          }));
          res.json({ predictions });
          return;
        }
      }
    } catch (nomErr) {
      console.warn('Nominatim search error:', nomErr);
    }

    res.json({ predictions: [] });
  } catch (error: any) {
    console.error('Error in /api/maps/places-search:', error);
    res.status(500).json({ error: error?.message || 'Place search failed.' });
  }
});

// AI Voice Dictation & Structuring Endpoint
app.post('/api/gemini/voice-structure', async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioBase64, mimeType, liveTranscript, category, mood } = req.body;

    if (!audioBase64 && !liveTranscript) {
      res.status(400).json({ error: 'Spoken audio or transcript data is required.' });
      return;
    }

    const ai = getAIClient();
    if (!ai) {
      const fallbackText = liveTranscript || 'Spoken reflection recorded.';
      res.json({
        rawTranscript: liveTranscript || '',
        structuredText: fallbackText,
        modelUsed: 'local-fallback',
      });
      return;
    }

    const parts: any[] = [];
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'audio/webm',
          data: audioBase64,
        },
      });
    }

    const prompt = `You are a mindful, empathic journaling scribe.
Transcribe and structure this spoken reflection into an authentic, clear, and beautifully written personal journal entry.

Context:
- Category: ${category || 'General Reflection'}
- Mood: ${mood || 'Reflective'}
${liveTranscript ? `- Live speech transcript: "${liveTranscript}"` : ''}

Instructions:
1. Preserve the user's authentic thoughts, emotional truth, and personal voice.
2. Remove disfluencies, accidental filler words ("um", "uh", "you know", "like"), and false starts.
3. Organize the thoughts into cohesive, elegant paragraphs with natural punctuation and rhythm.
4. If the user identified specific intentions, insights, or gratitudes, present them with clarity.
5. Return ONLY a valid JSON object matching this exact structure:
{
  "rawTranscript": "Direct cleaned transcription of what was spoken",
  "structuredText": "Mindfully organized and structured journal reflection text"
}`;

    parts.push({ text: prompt });

    const customKey = extractCustomKeyFromRequest(req);
    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.35,
      },
      customKey,
    });

    let parsed: any;
    try {
      const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        rawTranscript: liveTranscript || '',
        structuredText: result.text,
      };
    }

    res.json({
      rawTranscript: parsed.rawTranscript || liveTranscript || '',
      structuredText: parsed.structuredText || result.text,
      modelUsed: result.modelUsed,
      usedPersonalKey: result.usedPersonalKey,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/voice-structure:', error);
    res.status(500).json({
      error: error?.message || 'Failed to structure voice reflection.',
    });
  }
});

// =======================================================
// FEATURE 4: Insights & Well-Being Analysis Endpoint
// =======================================================

const DISCLAIMER_NOTE =
  'This well-being analysis is generated for personal self-reflection and mindfulness tracking only. It is not a medical diagnosis, clinical assessment, or substitute for professional medical advice or mental health therapy.';

app.post('/api/insights/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { entries = [], checkIns = [], consentGiven = true } = req.body;

    if (!consentGiven) {
      res.status(403).json({ error: 'User consent is required for reflection analysis.' });
      return;
    }

    // Algorithmic base calculations
    const emotionFrequency: Record<string, number> = {};
    let totalIntensity = 0;
    let intensityCount = 0;

    // Aggregate from checkIns
    if (Array.isArray(checkIns)) {
      checkIns.forEach((c: any) => {
        const m = c.mood || 'Neutral';
        emotionFrequency[m] = (emotionFrequency[m] || 0) + 1;
        if (typeof c.intensity === 'number') {
          totalIntensity += c.intensity;
          intensityCount++;
        }
      });
    }

    // Aggregate from entries
    if (Array.isArray(entries)) {
      entries.forEach((e: any) => {
        const m = e.mood ? e.mood.charAt(0).toUpperCase() + e.mood.slice(1) : 'Thoughtful';
        emotionFrequency[m] = (emotionFrequency[m] || 0) + 1;
      });
    }

    const totalEmotions = Object.values(emotionFrequency).reduce((a, b) => a + b, 0) || 1;
    const dominantEmotions = Object.entries(emotionFrequency)
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage: Math.round((count / totalEmotions) * 100),
        color:
          emotion === 'Happy' || emotion === 'Motivated'
            ? '#D97706'
            : emotion === 'Peaceful' || emotion === 'Calm'
            ? '#16A34A'
            : emotion === 'Grateful'
            ? '#BE185D'
            : emotion === 'Anxious' || emotion === 'Stressed'
            ? '#4F46E5'
            : '#6B7280',
      }))
      .sort((a, b) => b.count - a.count);

    const calculatedAvgIntensity =
      intensityCount > 0 ? Number((totalIntensity / intensityCount).toFixed(1)) : 3.0;

    // Format entry summaries for Gemini safely
    const entrySummaries = Array.isArray(entries)
      ? entries.slice(0, 15).map((e: any) => ({
          date: e.createdAt,
          category: e.category,
          mood: e.mood,
          title: e.title,
          summary: e.summary || e.initialText?.substring(0, 120),
          insights: e.keyInsights || [],
        }))
      : [];

    const ai = getAIClient();
    if (!ai || entrySummaries.length === 0) {
      // Return structured fallback analysis if offline or no entries
      res.json({
        dominantEmotions,
        averageIntensity: calculatedAvgIntensity,
        recurringThemes: ['Mindful Awareness', 'Daily Self-Reflection', 'Personal Growth'],
        positiveMoments: entrySummaries
          .filter((e) => ['peaceful', 'grateful', 'motivated', 'happy'].includes(e.mood?.toLowerCase()))
          .map((e) => ({
            title: e.title || 'Peaceful Moment',
            snippet: e.summary || 'A gentle reflection on gratitude and quiet mindfulness.',
            date: e.date,
          })),
        detectedPatterns: [
          'Consistent reflections recorded during morning and evening quiet hours.',
          'Gratitude and mindfulness themes correlate with lower self-reported tension.',
        ],
        supportiveSuggestions: {
          journalingPrompts: [
            'What is one small thing that brought an unexpected sense of ease today?',
            'When feeling overwhelmed, what ground beneath your feet can you notice?',
            'What permission can you give yourself this evening?',
          ],
          breathingExercise: {
            name: 'Box Breathing (4-4-4-4)',
            technique: 'Inhale 4s, Hold 4s, Exhale 4s, Hold 4s',
            instructions: 'Center your posture and follow the gentle rhythm to stabilize the autonomic nervous system.',
          },
          gratitudePrompts: [
            'Name three sensory experiences (a scent, sound, or warm beverage) you appreciate right now.',
            'Acknowledge one personal quality that supported you this week.',
          ],
          trustedContactReminder:
            'If you feel restless or burdened, consider sending a short text to a trusted friend or mentor simply saying: "Thinking of you, hoping you are having a peaceful day."',
        },
        aiSummary:
          'Your recent reflections demonstrate an active commitment to mindful self-observation. Notice the gentle shifts between periods of busy activity and grounding moments of gratitude.',
        analyzedEntriesCount: entrySummaries.length,
        generatedAt: new Date().toISOString(),
        disclaimer: DISCLAIMER_NOTE,
        modelUsed: 'local-heuristic',
      });
      return;
    }

    // Call Gemini with strict non-diagnostic instructions
    const prompt = `You are a supportive, mindful well-being analyst for personal journaling.
CRITICAL MEDICAL DIRECTIVE:
Your response is strictly for personal self-reflection, mindfulness, and well-being tracking.
It is NOT a medical diagnosis, clinical assessment, psychiatric evaluation, or therapy. Never use clinical diagnostic language (e.g. do not diagnose clinical depression, GAD, bipolar, PTSD, etc.). Use warm, supportive, non-judgmental, observational reflection.

User reflection data (${entrySummaries.length} entries):
${JSON.stringify(entrySummaries, null, 2)}

User check-in summary:
- Total check-ins: ${checkIns.length}
- Average intensity: ${calculatedAvgIntensity} / 5
- Emotion distribution: ${JSON.stringify(dominantEmotions)}

Instructions:
1. Identify 3-4 recurring positive or reflective themes across their entries (e.g., "Work-Life Boundaries", "Finding Calm in Nature", "Creative Momentum").
2. Extract 2-3 specific positive moments or breakthroughs mentioned in their journal.
3. Identify 2 gentle, helpful observational patterns (e.g., "Mornings focused on gratitude reported higher motivation", "Weekday transitions often trigger moments of restlessness").
4. Provide supportive, non-judgmental suggestions:
   - 3 personalized journaling prompts
   - 1 breathing exercise with name, technique, and short instruction
   - 2 gratitude prompts
   - 1 gentle reminder/suggestion regarding connecting with a trusted friend or supporter
5. Provide a 2-paragraph empathetic summary celebrating their self-awareness.
6. Return ONLY valid JSON matching this schema:
{
  "recurringThemes": ["string"],
  "positiveMoments": [{"title": "string", "snippet": "string", "date": "string"}],
  "detectedPatterns": ["string"],
  "supportiveSuggestions": {
    "journalingPrompts": ["string"],
    "breathingExercise": {
      "name": "string",
      "technique": "string",
      "instructions": "string"
    },
    "gratitudePrompts": ["string"],
    "trustedContactReminder": "string"
  },
  "aiSummary": "string"
}`;

    const customKey = extractCustomKeyFromRequest(req);
    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
      customKey,
    });

    let parsed: any;
    try {
      const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    res.json({
      dominantEmotions,
      averageIntensity: calculatedAvgIntensity,
      recurringThemes: parsed.recurringThemes || ['Self-Reflection', 'Emotional Balance'],
      positiveMoments: parsed.positiveMoments || [],
      detectedPatterns: parsed.detectedPatterns || ['Regular journaling supports grounding and self-clarity.'],
      supportiveSuggestions: parsed.supportiveSuggestions || {
        journalingPrompts: ['What moment today brought you a subtle feeling of calm?'],
        breathingExercise: {
          name: 'Box Breathing (4-4-4-4)',
          technique: 'Inhale 4s, Hold 4s, Exhale 4s, Hold 4s',
          instructions: 'Ground yourself with deep diaphragmatic breaths.',
        },
        gratitudePrompts: ['What is one simple comfort you are thankful for today?'],
        trustedContactReminder: 'Reaching out to a trusted companion can provide warm perspective.',
      },
      aiSummary: parsed.aiSummary || 'Your reflections highlight steady personal awareness and thoughtful self-inquiry.',
      analyzedEntriesCount: entrySummaries.length,
      generatedAt: new Date().toISOString(),
      disclaimer: DISCLAIMER_NOTE,
      modelUsed: result.modelUsed,
      usedPersonalKey: result.usedPersonalKey,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (error: any) {
    console.error('Error in /api/insights/analyze:', error);
    res.status(500).json({ error: error?.message || 'Failed to analyze well-being insights.' });
  }
});

// =======================================================
// FEATURE 6: Shareable Therapist Report Generation Endpoint
// =======================================================

const REPORT_DISCLAIMER =
  'This report is based on self-reported journal data and is not a clinical assessment.';

app.post('/api/reports/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      period = 'last_month',
      startDate,
      endDate,
      clientName = 'User',
      selectedEntries = [],
      checkIns = [],
      sleepEnergyNotes = '',
      customNotes = '',
    } = req.body;

    // Calculate quantitative metrics
    const emotionsCount: Record<string, number> = {};
    let totalIntensity = 0;
    let validIntensityCount = 0;

    checkIns.forEach((c: any) => {
      const m = c.mood || 'Neutral';
      emotionsCount[m] = (emotionsCount[m] || 0) + 1;
      if (typeof c.intensity === 'number') {
        totalIntensity += c.intensity;
        validIntensityCount++;
      }
    });

    selectedEntries.forEach((e: any) => {
      const m = e.mood ? e.mood.charAt(0).toUpperCase() + e.mood.slice(1) : 'Thoughtful';
      emotionsCount[m] = (emotionsCount[m] || 0) + 1;
    });

    const averageIntensity =
      validIntensityCount > 0 ? Number((totalIntensity / validIntensityCount).toFixed(1)) : 3.0;

    const dominantEmotions = Object.entries(emotionsCount)
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count);

    const entryExcerpts = selectedEntries.map((e: any) => ({
      id: e.id,
      title: e.title,
      date: e.createdAt,
      mood: e.mood,
      excerpt: e.summary || e.initialText?.substring(0, 140) || '',
    }));

    const ai = getAIClient();
    if (!ai) {
      // Fallback report structure if AI is offline
      res.json({
        title: `Self-Reported Well-Being Summary (${period.replace(/_/g, ' ')})`,
        clientName,
        period,
        startDate: startDate || new Date(Date.now() - 30 * 86400000).toISOString(),
        endDate: endDate || new Date().toISOString(),
        emotionalOverview: {
          averageIntensity,
          dominantEmotions,
          summaryText: `Across ${selectedEntries.length} selected reflection entries and ${checkIns.length} mood check-ins, dominant emotions included ${dominantEmotions.slice(0, 3).map((d) => d.emotion).join(', ') || 'calm and thoughtful'}. Average self-reported intensity was ${averageIntensity} / 5.`,
        },
        recurringThemes: [
          'Work-life balance and evening relaxation',
          'Mindful self-awareness and pause practices',
          'Navigating situational stress through journaling',
        ],
        positiveChanges: [
          'Increased consistency in documenting daily emotional states.',
          'Use of reflective pause before reacting to stressors.',
        ],
        difficultPeriods: [
          'Occasional mid-week feelings of restlessness or heightened intensity.',
        ],
        copingActivities: [
          'Mindful journaling and reflection',
          'Box breathing and quiet meditation',
          'Walks and outdoor time',
        ],
        sleepEnergyNotes: sleepEnergyNotes || 'User reported regular resting periods with variable energy levels.',
        discussionPrompts: [
          'How have recent work transitions influenced evening restlessness?',
          'What strategies felt most grounding when intensity reached higher levels?',
          'Exploring ways to reinforce positive momentum observed in self-care practices.',
        ],
        selectedReflections: entryExcerpts,
        customClinicianNotes: customNotes,
        disclaimer: REPORT_DISCLAIMER,
        modelUsed: 'local-template',
      });
      return;
    }

    const prompt = `You are an empathetic, clinical-collaborative assistant preparing a structured, user-approved summary report for a therapist or counselor.
CRITICAL ETHICAL & CLINICAL DIRECTIVES:
- This report is strictly based on self-reported journal data. It is NOT a clinical diagnosis or psychiatric assessment.
- Do NOT provide medical diagnoses or prescribe medication.
- Organize the user's authentic experiences clearly so they can have a fruitful, collaborative session with their therapist or counselor.
- Highlight resilience, coping activities, notable changes, and specific themes.

Data Provided:
- Period: ${period} (${startDate} to ${endDate})
- Client/User: ${clientName}
- Selected Reflections (${entryExcerpts.length}): ${JSON.stringify(entryExcerpts, null, 2)}
- Check-ins count: ${checkIns.length}, Average intensity: ${averageIntensity} / 5
- Dominant emotions: ${JSON.stringify(dominantEmotions)}
- Sleep/Energy self-notes: "${sleepEnergyNotes}"
- Custom notes from user: "${customNotes}"

Generate a concise, professional report matching this exact JSON format:
{
  "emotionalOverviewText": "2-3 sentences summarizing emotional patterns, intensity, and general tone without diagnosis",
  "recurringThemes": ["3-4 bullet points of recurring themes"],
  "positiveChanges": ["2-3 bullet points of positive shifts, wins, or breakthroughs"],
  "difficultPeriods": ["2-3 bullet points of difficult periods, stressors, or challenges noted"],
  "copingActivities": ["3-4 coping methods or positive activities observed or recommended based on their habits"],
  "discussionPrompts": ["3-4 collaborative questions or prompts for the upcoming therapy session"]
}`;

    const customKey = extractCustomKeyFromRequest(req);
    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.35,
      },
      customKey,
    });

    let parsed: any;
    try {
      const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    res.json({
      title: `Self-Reported Well-Being Summary (${period.replace(/_/g, ' ')})`,
      clientName,
      period,
      startDate: startDate || new Date(Date.now() - 30 * 86400000).toISOString(),
      endDate: endDate || new Date().toISOString(),
      emotionalOverview: {
        averageIntensity,
        dominantEmotions,
        summaryText:
          parsed.emotionalOverviewText ||
          `Across ${selectedEntries.length} reflections and ${checkIns.length} check-ins, self-reported average emotional intensity was ${averageIntensity}/5 with prominent feelings of ${dominantEmotions.slice(0, 3).map((d) => d.emotion).join(', ') || 'reflection'}.`,
      },
      recurringThemes: parsed.recurringThemes || ['Emotional self-awareness', 'Daily routine management'],
      positiveChanges: parsed.positiveChanges || ['Regular engagement with journaling and mindfulness.'],
      difficultPeriods: parsed.difficultPeriods || ['Periods of high workload or evening restlessness.'],
      copingActivities: parsed.copingActivities || ['Reflective journaling', 'Breathing exercises', 'Rest'],
      sleepEnergyNotes: sleepEnergyNotes || '',
      discussionPrompts: parsed.discussionPrompts || [
        'What coping strategies have felt most helpful during stressful moments?',
        'How can we continue supporting the positive shifts observed in recent weeks?',
      ],
      selectedReflections: entryExcerpts,
      customClinicianNotes: customNotes,
      disclaimer: REPORT_DISCLAIMER,
      modelUsed: result.modelUsed,
      usedPersonalKey: result.usedPersonalKey,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (error: any) {
    console.error('Error in /api/reports/generate:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate therapist report.' });
  }
});

// =======================================================
// FEATURE 6: Secure Share Link Server Store & Verification
// =======================================================

interface SharedReportRecord {
  token: string;
  reportId: string;
  userId: string;
  reportData: any;
  expiresAt: number;
  passwordHash?: string;
  isRevoked: boolean;
}

const sharedReportsStore = new Map<string, SharedReportRecord>();

// Helper to hash passwords with salt
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_mindful_salt_2026').digest('hex');
}

// Create or update share link
app.post('/api/reports/share', (req: Request, res: Response): void => {
  try {
    const { report, expiryHours = 72, password } = req.body;

    if (!report || !report.id || !report.userId) {
      res.status(400).json({ error: 'Valid report with ID and userId is required.' });
      return;
    }

    const shareToken = 'rep_' + crypto.randomBytes(20).toString('hex');
    const expiresAt = Date.now() + Number(expiryHours) * 3600 * 1000;
    const passwordHash = password && password.trim() ? hashPassword(password.trim()) : undefined;

    const record: SharedReportRecord = {
      token: shareToken,
      reportId: report.id,
      userId: report.userId,
      reportData: {
        ...report,
        shareToken,
        shareExpiry: new Date(expiresAt).toISOString(),
        isPasswordProtected: Boolean(passwordHash),
      },
      expiresAt,
      passwordHash,
      isRevoked: false,
    };

    sharedReportsStore.set(shareToken, record);

    res.json({
      shareToken,
      expiresAt: new Date(expiresAt).toISOString(),
      isPasswordProtected: Boolean(passwordHash),
      shareUrl: `/?sharedReport=${shareToken}`,
    });
  } catch (error: any) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate secure share link.' });
  }
});

// Fetch shared report for therapist / recipient
app.post('/api/reports/shared/:token', (req: Request, res: Response): void => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    const record = sharedReportsStore.get(token);
    if (!record) {
      res.status(404).json({ error: 'Report not found or link has expired.' });
      return;
    }

    if (record.isRevoked) {
      res.status(410).json({ error: 'Access to this report has been revoked by the author.' });
      return;
    }

    if (Date.now() > record.expiresAt) {
      sharedReportsStore.delete(token);
      res.status(410).json({ error: 'This share link has expired.' });
      return;
    }

    if (record.passwordHash) {
      if (!password) {
        res.status(401).json({
          error: 'This report is password protected. Please enter the passcode.',
          requiresPassword: true,
        });
        return;
      }
      const providedHash = hashPassword(password.trim());
      if (providedHash !== record.passwordHash) {
        res.status(403).json({
          error: 'Incorrect passcode. Please verify with the sender.',
          requiresPassword: true,
        });
        return;
      }
    }

    res.json({
      report: record.reportData,
      expiresAt: new Date(record.expiresAt).toISOString(),
      disclaimer: REPORT_DISCLAIMER,
    });
  } catch (error: any) {
    console.error('Error fetching shared report:', error);
    res.status(500).json({ error: error?.message || 'Failed to load report.' });
  }
});

// Revoke a share link
app.post('/api/reports/revoke', (req: Request, res: Response): void => {
  try {
    const { token, reportId } = req.body;
    let revokedCount = 0;

    for (const [key, item] of sharedReportsStore.entries()) {
      if ((token && key === token) || (reportId && item.reportId === reportId)) {
        item.isRevoked = true;
        revokedCount++;
      }
    }

    res.json({ success: true, revokedCount });
  } catch (error: any) {
    console.error('Error revoking share link:', error);
    res.status(500).json({ error: error?.message || 'Failed to revoke link.' });
  }
});


// Initialize Vite server or static file serving
async function startServer() {
  let viteMiddleware: ((req: any, res: any, next: any) => void) | null = null;
  let isViteReady = false;

  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      if (isViteReady && viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      // Wait for Vite to be ready
      const checkInterval = setInterval(() => {
        if (isViteReady && viteMiddleware) {
          clearInterval(checkInterval);
          viteMiddleware(req, res, next);
        }
      }, 50);

      // Timeout safety after 15s
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!res.headersSent) {
          next();
        }
      }, 15000);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind port 3000 immediately so container ingress & health probes connect without delay
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Mindful Reflections server active on http://0.0.0.0:${PORT}`);
  });

  // Initialize Vite in the background if in development
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      viteMiddleware = vite.middlewares;
      isViteReady = true;
      console.log('⚡ Vite dev middleware initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize Vite dev server:', err);
    }
  }
}

startServer();
