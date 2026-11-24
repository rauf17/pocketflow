import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { checkRateLimit } from '@/lib/rateLimit';

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
- Goals are OPTIONAL context. Reason from available context snapshot numbers (balances, spendingLimits, recurringBills, goals, configuredProfiles, next14DaysPlan, recentExpenses, monthlyAggregates, etc.).
- EVERY number, fact, and calculation MUST come directly from the provided financial context snapshot — NEVER fabricate, estimate, or extrapolate numbers.
- IF a question asks about specific details NOT provided in the financial context snapshot, explicitly state that you do not have that specific information rather than guessing.
- Never say "please create a goal" or "I am just an AI". Always provide a direct, concise decision based on the available data.
- Use the currency symbol from the userSettings in context (e.g. "Rs" for PKR).
`;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check (before req.json() and before any Gemini call)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.headers.get('x-real-ip') || 'unknown');

    const { ok, retryAfter } = await checkRateLimit(ip);
    if (!ok) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${retryAfter} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    // 2. Body Parsing & Input Validation
    let body: { message?: unknown; context?: unknown; history?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const { message, context, history } = body || {};

    if (typeof message !== 'string' || message.trim().length < 1 || message.trim().length > 500) {
      return NextResponse.json(
        { error: 'Message must be a non-empty string under 500 characters.' },
        { status: 400 }
      );
    }

    if (context && JSON.stringify(context).length > 30000) {
      return NextResponse.json(
        { error: 'Context payload too large.' },
        { status: 413 }
      );
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'INSERT_YOUR_GEMINI_API_KEY_HERE') {
      return NextResponse.json(
        { error: 'Missing Gemini API Key. Please add it to your environment variables.' },
        { status: 500 }
      );
    }

    // Sanitize and cap conversation history (last 6 items, max 1000 chars per item)
    const safeHistory = Array.isArray(history) ? history.slice(-6) : [];
    const chatHistory = safeHistory.map((msg: { role?: string; content?: string }) => ({
      role: msg?.role === 'ai' ? 'model' : 'user',
      parts: [{ text: typeof msg?.content === 'string' ? msg.content.slice(0, 1000) : '' }],
    }));

    const augmentedMessage = `
[FINANCIAL CONTEXT SNAPSHOT]
${JSON.stringify(context, null, 2)}
[/FINANCIAL CONTEXT SNAPSHOT]

User Question: ${message.trim()}

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
      { error: 'An error occurred while communicating with the AI co-pilot.' },
      { status: 500 }
    );
  }
}
