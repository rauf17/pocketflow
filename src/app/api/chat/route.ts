import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
You are the PocketFlow AI Advisor, a calm, analytical, and highly intelligent financial operating system assistant.
Your goal is to help the user answer the question: "Can I afford this today?"

You will receive a snapshot of the user's current financial context in JSON format.
Analyze their balance, safe spending limit, upcoming bills, and velocity to give a concise, confident answer.
Do not use conversational filler (e.g., "Hi there!", "I'd be happy to help!"). 
Deliver precise, direct insights. Be brief. Maximum 3-4 sentences.
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

    // Combine history for context
    const chatHistory = history.map((msg: { role: string; content: string }) => ({
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
