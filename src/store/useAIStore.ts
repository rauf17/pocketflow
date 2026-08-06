import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIConversation } from './types';

interface AIState {
  conversations: AIConversation[];
  activeConversationId: string | null;
  
  // Actions
  addConversation: (conversation: Omit<AIConversation, 'id'>) => string;
  addMessage: (conversationId: string, role: 'user' | 'ai', content: string) => void;
  setActiveConversation: (id: string | null) => void;
  clearHistory: () => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      conversations: [],
      activeConversationId: null,

      addConversation: (data) => {
        const id = crypto.randomUUID();
        set((state) => ({
          conversations: [...state.conversations, { ...data, id }],
          activeConversationId: id
        }));
        return id;
      },

      addMessage: (conversationId, role, content) => set((state) => ({
        conversations: state.conversations.map(c => 
          c.id === conversationId 
            ? { ...c, messages: [...c.messages, { role, content, timestamp: new Date().toISOString() }] } 
            : c
        )
      })),

      setActiveConversation: (id) => set({ activeConversationId: id }),

      clearHistory: () => set({ conversations: [], activeConversationId: null })
    }),
    {
      name: 'pocketflow-ai-store-v1',
    }
  )
);
