import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
You are the PocketFlow AI Advisor — a calm, analytical, and highly intelligent financial operating system.
Your role is to answer the question: "Can I afford this today?" while protecting the user's financial goals.

You will receive a JSON snapshot of the user's finances including:
- balance, income, recent expenses
- goals[] — each goal has: name, priority (critical/important/planned/nice-to-have), status (on-track/behind/at-risk), targetAmount, currentSaved, monthlyContribution
- weeklyPlan and dayProfiles

Rules:
1. ALWAYS reference specific goals by name when evaluating purchases.
2. ALWAYS state the impact on each affected goal. Example: "Your Ireland Trip will be delayed by approximately 12 days."
3. NEVER answer using only balance. Goals are the primary lens.
4. Higher-priority goals (critical) should always be protected first.
5. If a purchase puts a critical goal at risk, warn the user explicitly.
6. Be direct and brief — maximum 4 sentences. No filler phrases.
7. End every response with one concrete suggestion if the answer is negative.
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

    // Combine history for context (default to empty if missing)
    const chatHistory = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Inject system instructions and financial context into the user's message
    const augmentedMessage = `
[FINANCIAL CONTEXT SNAPSHOT]
${JSON.stringify(context, null, 2)}
[/FINANCIAL CONTEXT SNAPSHOT]

User Request: ${message}
`;

    // Actually, passing history is supported in ai.chats.create({ history: chatHistory })
    const chatWithHistory = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
      },
      history: chatHistory,
    });

    const response = await chatWithHistory.sendMessage({
      message: augmentedMessage
    });

    return NextResponse.json({ response: response.text });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while communicating with the AI.' },
      { status: 500 }
    );
  }
}
