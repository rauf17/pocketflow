"use client";

import { useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smartphone, Moon, Sun, Trash2, Database, Download, CheckCircle2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/utils";

export default function SettingsPage() {
  const { user, income, setUser, setIncome } = useUserStore();
  const activeCurrencySymbol = getCurrencySymbol(user?.currency);

  const [balance, setBalance] = useState(user?.balance?.toString() || "");
  const [currency, setCurrency] = useState(user?.currency || "PKR");
  const [incomeDate, setIncomeDate] = useState(income?.nextDate?.split('T')[0] || "");
  const [incomeAmount, setIncomeAmount] = useState(income?.amount?.toString() || "");
  const [theme, setTheme] = useState(user?.theme || "dark");
  const [isSaved, setIsSaved] = useState(false);

  if (!user || !income) return null;

  const handleSave = () => {
    setUser({
      balance: Number(balance),
      currency: currency,
      theme: theme as 'dark' | 'light' | 'system',
    });
    setIncome({
      amount: Number(incomeAmount),
      nextDate: new Date(incomeDate).toISOString(),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto pt-12 px-6 pb-32">
      
      <header className="w-full flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-light tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure your financial operating system.</p>
        </div>
      </header>

      <div className="w-full space-y-12">
        
        {/* Core Financials */}
        <section className="space-y-6">
          <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Core Financials</h3>
          
          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-sm text-foreground ml-1">Current Balance</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{activeCurrencySymbol}</span>
                  <Input 
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-background/50 border-white/10 text-lg"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm text-foreground ml-1">Currency</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-12 rounded-xl bg-background/50 border border-white/10 text-lg px-4 appearance-none outline-none focus:ring-1 focus:ring-white/20 uppercase"
                >
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="w-full h-[1px] bg-white/5" />

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-sm text-foreground ml-1">Next Payday Date</label>
                <Input 
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="h-12 rounded-xl bg-background/50 border-white/10 text-lg"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm text-foreground ml-1">Payday Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{activeCurrencySymbol}</span>
                  <Input 
                    type="number"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-background/50 border-white/10 text-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="space-y-6">
          <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Preferences</h3>
          
          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 space-y-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-sm text-foreground ml-1 mb-2 block">Theme</label>
              <div className="flex p-1 bg-background/50 rounded-2xl border border-white/5">
                <Button variant={theme === 'dark' ? 'default' : 'ghost'} onClick={() => setTheme('dark')} className="flex-1 rounded-xl">
                  <Moon className="w-4 h-4 mr-2" /> Dark
                </Button>
                <Button variant={theme === 'light' ? 'default' : 'ghost'} onClick={() => setTheme('light')} className="flex-1 rounded-xl">
                  <Sun className="w-4 h-4 mr-2" /> Light
                </Button>
                <Button variant={theme === 'system' ? 'default' : 'ghost'} onClick={() => setTheme('system')} className="flex-1 rounded-xl">
                  <Smartphone className="w-4 h-4 mr-2" /> Auto
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full flex justify-end">
          <Button size="lg" className="rounded-full px-8" onClick={handleSave}>
            {isSaved ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2 text-white" />
                Saved
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>

        {/* Data Management */}
        <section className="space-y-6">
          <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Data Management</h3>
          
          <div className="bg-card/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 space-y-4">
            <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-white/10 gap-3 text-foreground font-normal">
              <Download className="w-5 h-5 text-muted-foreground" />
              Export Data (JSON)
            </Button>
            <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-white/10 gap-3 text-foreground font-normal">
              <Database className="w-5 h-5 text-muted-foreground" />
              Import Data
            </Button>
            
            <div className="w-full h-[1px] bg-white/5 my-4" />
            
            <Button 
              variant="ghost" 
              className="w-full justify-start h-14 rounded-2xl gap-3 text-destructive hover:bg-destructive/10 font-normal"
              onClick={() => {
                if(confirm("Are you sure? This will wipe all data and return you to onboarding.")) {
                  localStorage.clear();
                  window.location.href = '/';
                }
              }}
            >
              <Trash2 className="w-5 h-5" />
              Reset All Data
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}
