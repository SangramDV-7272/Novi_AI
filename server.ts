import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Mount middleware
app.use(express.json({ limit: '2mb' }));

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
  'gemini-2.5-flash',
  'gemini-3.7-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro',
];

// Helper to execute generation with automatic model fallback
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getAIClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      const responseText = response.text || '';
      if (responseText) {
        return { text: responseText, modelUsed: model };
      }
    } catch (error: any) {
      console.warn(`Attempt with model "${model}" failed:`, error?.message || error);
      lastError = error;
      // If error is recoverable (rate limit, unavailable, etc.), continue to next model in ladder
      const statusCode = error?.status || error?.statusCode || 0;
      if ([404, 429, 500, 503].includes(statusCode) || error?.message?.includes('not found') || error?.message?.includes('quota')) {
        continue;
      }
      // If client key error or forbidden, throw immediately
      if (statusCode === 401 || statusCode === 403) {
        throw error;
      }
    }
  }

  throw lastError || new Error('All fallback models failed to generate a response.');
}

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

    const result = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.75,
        maxOutputTokens: 1024,
      },
    });

    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
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

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
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

    const result = await generateContentWithFallback({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
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

// Initialize Vite server or static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Mindful Reflections server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
