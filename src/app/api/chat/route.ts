import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
You are PocketFlow AI — a precise financial co-pilot. Your job is to interpret pre-calculated financial data and return a structured decision.

The user's financial context is already fully computed by PocketFlow's deterministic budget engine. You do NOT need to recalculate any numbers — they are given to you in the context snapshot. Your job is to interpret them and provide a concise, human-readable decision.

RESPONSE FORMAT:
You MUST respond with valid JSON only. No markdown fences. No extra text outside the JSON object.

{
  "verdict": "positive" | "negative" | "neutral",
  "assessment": "<One direct sentence answering the question. Start with an emoji: ✅ for positive, ⚠️ for caution, ❌ for negative>",
  "metrics": [
    { "label": "<short label>", "value": "<formatted value with currency symbol if applicable>" }
  ],
  "recommendation": "<One concise, actionable sentence>",
  "context": "<Optional: one additional sentence of relevant context, or null if not needed>"
}

RULES:
- "assessment": 1 sentence max. Direct answer first. Use emojis ✅ ⚠️ ❌.
- "metrics": 3–5 of the MOST RELEVANT numbers to the question. Use the pre-calculated values from the context snapshot — never invent numbers.
- "recommendation": 1 sentence. Specific and actionable (e.g. a specific amount or action).
- "context": null unless it materially adds to the answer. Never repeat metrics already shown.
- "verdict": "positive" = user can proceed comfortably, "negative" = user should not or it's risky, "neutral" = it depends / borderline.
- Keep the total word count between 40–100 words across all fields.
- Goals are OPTIONAL context. If goals[] is empty, reason from balance, todayBudget, todayRemaining, and daysUntilIncome only.
- Never say "I can't answer" or "please create a goal". Always provide a useful answer.
- Use the currency symbol from the context (e.g. "Rs" for PKR).
`;

export async function POST(req: NextRequest) {
  try {
    const { message, context, history } = await req.json();

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'INSERT_YOUR_GEMINI_API_KEY_HERE') {
      return NextResponse.json(
        { error: 'Missing Gemini API Key. Please add it to your .env.local file.' },
        { status: 500 }
      );
    }

    const chatHistory = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const augmentedMessage = `
[FINANCIAL CONTEXT SNAPSHOT]
${JSON.stringify(context, null, 2)}
[/FINANCIAL CONTEXT SNAPSHOT]

User Question: ${message}

Respond with valid JSON only.
`;

    const chatWithHistory = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
      history: chatHistory,
    });

    const response = await chatWithHistory.sendMessage({ message: augmentedMessage });

    // Parse structured JSON response
    let parsed: {
      verdict: 'positive' | 'negative' | 'neutral';
      assessment: string;
      metrics: { label: string; value: string }[];
      recommendation: string;
      context: string | null;
    } | null = null;

    try {
      const rawText = response.text ?? '';
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: return raw text as a neutral response
      return NextResponse.json({
        response: {
          verdict: 'neutral',
          assessment: response.text ?? 'Unable to parse response.',
          metrics: [],
          recommendation: '',
          context: null,
        }
      });
    }

    return NextResponse.json({ response: parsed });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while communicating with the AI.' },
      { status: 500 }
    );
  }
}
