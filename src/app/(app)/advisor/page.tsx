"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { useAIStore } from "@/store/useAIStore";
import { useUserStore } from "@/store/useUserStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { differenceInDays, startOfDay, isBefore, isEqual } from "date-fns";

export default function AdvisorPage() {
  const { conversations, addConversation, addMessage, activeConversationId } = useAIStore();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Auto-create a conversation if none exists
  if (conversations.length === 0 && !activeConversationId) {
    addConversation({ messages: [], contextUsed: {} });
  }

  const activeChat = conversations.find(c => c.id === activeConversationId) || conversations[0];

  const { user, income } = useUserStore();
  const { recurringBudgets } = useBudgetStore();
  const { expenses } = useExpenseStore();

  const generateContext = () => {
    if (!user || !income) return {};
    
    const today = startOfDay(new Date());
    const incomeDate = startOfDay(new Date(income.nextDate));
    const daysUntilIncome = Math.max(0, differenceInDays(incomeDate, today));

    let upcomingBillsTotal = 0;
    recurringBudgets.forEach(bill => {
      const billDate = startOfDay(new Date(bill.nextDueDate));
      if (isBefore(billDate, incomeDate) || isEqual(billDate, incomeDate)) {
        upcomingBillsTotal += bill.amount;
      }
    });

    const safeBalance = Math.max(0, user.balance - upcomingBillsTotal);
    const safeLimit = daysUntilIncome === 0 ? safeBalance : safeBalance / daysUntilIncome;
    
    const expensesToday = expenses
      .filter(e => startOfDay(new Date(e.date)).getTime() === today.getTime())
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      currentBalance: user.balance,
      daysUntilIncome,
      upcomingBillsTotal,
      safeDailyLimit: safeLimit,
      spentToday: expensesToday,
      remainingToday: safeLimit - expensesToday,
    };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;

    const userMsg = input;
    addMessage(activeChat.id, "user", userMsg);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: generateContext(),
          history: activeChat.messages
        })
      });

      const data = await res.json();
      
      if (data.error) {
        addMessage(activeChat.id, "ai", data.error);
      } else {
        addMessage(activeChat.id, "ai", data.response);
      }
    } catch {
      addMessage(activeChat.id, "ai", "Connection error. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto pt-4 px-4 pb-20 md:pb-4 relative">
      
      {/* Decorative Glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-2xl h-[40vh] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <header className="w-full flex items-center justify-center py-4 border-b border-white/5 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-medium tracking-tight text-foreground/90">PocketFlow Advisor</h2>
        </div>
      </header>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 p-4">
        {activeChat?.messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 mt-10">
            <Bot className="w-16 h-16 mb-4 stroke-1" />
            <h3 className="text-2xl font-light mb-2">How can I help you?</h3>
            <div className="flex flex-col gap-2 mt-4 text-sm text-muted-foreground w-full max-w-xs">
              <Button variant="glass" className="justify-start whitespace-normal h-auto py-3 text-left" onClick={() => setInput("Can I afford a $150 jacket right now?")}>
                &quot;Can I afford a $150 jacket right now?&quot;
              </Button>
              <Button variant="glass" className="justify-start whitespace-normal h-auto py-3 text-left" onClick={() => setInput("What happens if my salary is delayed by 3 days?")}>
                &quot;What happens if my salary is delayed by 3 days?&quot;
              </Button>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {activeChat?.messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-foreground text-background" : "bg-indigo-500/20 text-indigo-400"
                }`}>
                  {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={`flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-5 py-3.5 rounded-3xl ${
                    msg.role === "user" 
                      ? "bg-white/10 text-foreground rounded-tr-sm" 
                      : "bg-indigo-500/10 border border-indigo-500/20 text-foreground/90 font-light leading-relaxed rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-indigo-500/20 text-indigo-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="px-5 py-4 rounded-3xl rounded-tl-sm bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-1.5">
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-indigo-400" />
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 rounded-full bg-indigo-400" />
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 rounded-full bg-indigo-400" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/80 backdrop-blur-3xl shrink-0 border-t border-white/5 rounded-t-3xl md:rounded-3xl md:border mb-2 relative z-10">
        <form onSubmit={handleSend} className="relative flex items-center">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your financial momentum..."
            className="w-full h-14 pl-6 pr-14 rounded-full bg-card/50 border-white/10 text-base"
          />
          <Button 
            type="submit"
            disabled={!input.trim() || isTyping}
            size="icon" 
            className="absolute right-2 w-10 h-10 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-500/20"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>
      
    </div>
  );
}
