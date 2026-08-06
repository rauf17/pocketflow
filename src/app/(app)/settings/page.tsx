"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/store/useUserStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smartphone, Moon, Sun, Trash2, Download, CheckCircle2, Wallet, Shield, Settings2, Map, Plus, Edit2, Check } from "lucide-react";
import { getCurrencySymbol } from "@/lib/utils";

export default function SettingsPage() {
  const { user, income, setUser, setIncome } = useUserStore();
  const { profiles, addProfile, deleteProfile, updateProfile } = useProfileStore();
  const activeCurrencySymbol = getCurrencySymbol(user?.currency);

  const [activeTab, setActiveTab] = useState<"general" | "financial" | "profiles" | "data">("general");

  const [balance, setBalance] = useState(user?.balance?.toString() || "");
  const [currency, setCurrency] = useState(user?.currency || "PKR");
  const [theme, setTheme] = useState(user?.theme || "dark");
  const [incomeAmount, setIncomeAmount] = useState(income?.amount?.toString() || "");
  const [incomeDate, setIncomeDate] = useState(income?.nextDate ? new Date(income.nextDate).toISOString().split('T')[0] : "");
  
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileSpend, setEditProfileSpend] = useState("");

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    if (user) {
      setUser({
        ...user,
        balance: Number(balance),
        currency: currency as "PKR" | "USD" | "EUR" | "GBP",
        theme: theme as "dark" | "light" | "system",
      });
    }
    if (income) {
      setIncome({
        ...income,
        amount: Number(incomeAmount),
        nextDate: new Date(incomeDate).toISOString(),
      });
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleFactoryReset = () => {
    if (window.confirm("Are you sure? This will delete all your data and cannot be undone.")) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Settings2 },
    { id: "financial", label: "Financial", icon: Wallet },
    { id: "profiles", label: "Day Profiles", icon: Map },
    { id: "data", label: "Data & Privacy", icon: Shield },
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto pt-16 px-6 pb-32">
      
      <header className="w-full flex justify-between items-end mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-3xl font-light tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground mt-2">Manage your preferences and data.</p>
        </motion.div>
      </header>

      <div className="w-full flex flex-col md:flex-row gap-8">
        
        {/* Vertical Tabs */}
        <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "general" | "financial" | "profiles" | "data")}
              className={`flex items-center gap-3 px-4 py-3 rounded-[1.25rem] transition-all text-sm font-medium ${
                activeTab === tab.id 
                  ? "bg-foreground text-background shadow-lg" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full bg-card/20 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-8 shadow-2xl min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {activeTab === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-8"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-medium text-foreground/90">Appearance</h3>
                  <p className="text-sm text-muted-foreground">Select your preferred theme.</p>
                </div>

                <div className="grid grid-cols-3 gap-4 max-w-sm">
                  <Button 
                    variant="glass" 
                    onClick={() => setTheme("system")}
                    className={`h-24 rounded-2xl flex flex-col gap-2 ${theme === 'system' ? 'bg-white/5 ring-2 ring-foreground' : 'hover:bg-white/10 ring-1 ring-white/10'}`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs">System</span>
                  </Button>
                  <Button 
                    variant="glass" 
                    onClick={() => setTheme("light")}
                    className={`h-24 rounded-2xl flex flex-col gap-2 ${theme === 'light' ? 'bg-white/5 ring-2 ring-foreground' : 'hover:bg-white/10 ring-1 ring-white/10'}`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="text-xs">Light</span>
                  </Button>
                  <Button 
                    variant="glass" 
                    onClick={() => setTheme("dark")}
                    className={`h-24 rounded-2xl flex flex-col gap-2 ${theme === 'dark' ? 'bg-white/5 ring-2 ring-foreground' : 'hover:bg-white/10 ring-1 ring-white/10'}`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="text-xs">Dark</span>
                  </Button>
                </div>

                <Button 
                  onClick={handleSave} 
                  disabled={isSaved}
                  className="rounded-full px-6 transition-all min-w-[120px] mt-4 max-w-[200px]"
                >
                  {isSaved ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </motion.div>
            )}

            {activeTab === "financial" && (
              <motion.div
                key="financial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-8"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-medium text-foreground/90">Financial Configuration</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">Update your balance and income schedule. This directly affects your daily safe limit calculation.</p>
                  </div>
                  
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaved}
                    className="rounded-full px-6 transition-all min-w-[120px]"
                  >
                    {isSaved ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Current Balance</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors">{activeCurrencySymbol}</span>
                      <Input 
                        type="number"
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        className="pl-12 h-14 rounded-[1.25rem] bg-white/[0.02] border-white/10 focus-visible:bg-white/[0.05]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Base Currency</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-14 rounded-[1.25rem] bg-white/[0.02] border-white/10 text-foreground px-4 appearance-none focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                    >
                      <option value="PKR">PKR (Rs)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Next Payday Amount</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors">{activeCurrencySymbol}</span>
                      <Input 
                        type="number"
                        value={incomeAmount}
                        onChange={(e) => setIncomeAmount(e.target.value)}
                        className="pl-12 h-14 rounded-[1.25rem] bg-white/[0.02] border-white/10 focus-visible:bg-white/[0.05]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground ml-2">Next Payday Date</label>
                    <Input 
                      type="date"
                      value={incomeDate}
                      onChange={(e) => setIncomeDate(e.target.value)}
                      className="h-14 rounded-[1.25rem] bg-white/[0.02] border-white/10 focus-visible:bg-white/[0.05] px-4"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4 pt-8 border-t border-white/5">
                  <h3 className="text-lg font-medium text-foreground/90">Financial Goals</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Manage your savings goals, contributions, and priorities in Mission Control.
                  </p>
                  <a href="/goals" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground underline underline-offset-4 transition-colors">
                    Open Mission Control →
                  </a>
                </div>
              </motion.div>
            )}


            {activeTab === "profiles" && (
              <motion.div
                key="profiles"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-8"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-medium text-foreground/90">Day Profiles</h3>
                    <p className="text-sm text-muted-foreground">Manage your custom spending profiles for the Weekly Planner.</p>
                  </div>
                  <Button variant="glass" onClick={() => {
                    addProfile({ name: "New Profile", type: "custom", expectedSpend: 0, icon: "Zap", color: "blue" });
                  }} className="rounded-full gap-2">
                    <Plus className="w-4 h-4" /> Add Profile
                  </Button>
                </div>

                <div className="flex flex-col gap-3">
                  {profiles.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                      {editingProfileId === p.id ? (
                        <div className="flex items-center gap-4 w-full">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                            <Map className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col gap-2 w-full">
                            <Input 
                              value={editProfileName} 
                              onChange={(e) => setEditProfileName(e.target.value)} 
                              placeholder="Profile Name"
                              className="h-8 text-sm bg-black/20"
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{activeCurrencySymbol}</span>
                              <Input 
                                type="number" 
                                value={editProfileSpend} 
                                onChange={(e) => setEditProfileSpend(e.target.value)} 
                                placeholder="Expected Spend"
                                className="h-8 text-sm bg-black/20"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="glass" 
                              size="icon" 
                              onClick={() => {
                                updateProfile(p.id, { name: editProfileName || p.name, expectedSpend: Number(editProfileSpend) || 0 });
                                setEditingProfileId(null);
                              }} 
                              className="text-flow-emerald rounded-xl"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                              <Map className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground">Expected: {activeCurrencySymbol}{p.expectedSpend.toFixed(0)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setEditingProfileId(p.id);
                                setEditProfileName(p.name);
                                setEditProfileSpend(p.expectedSpend.toString());
                              }} 
                              className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-xl"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {p.type === 'custom' && (
                              <Button variant="ghost" size="icon" onClick={() => deleteProfile(p.id)} className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-xl">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "data" && (
              <motion.div
                key="data"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-8"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-medium text-foreground/90">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">Manage your local data.</p>
                </div>

                <div className="flex flex-col gap-4 max-w-sm">
                  <Button variant="glass" className="h-14 rounded-xl justify-start px-6">
                    <Download className="w-4 h-4 mr-3 text-muted-foreground" />
                    Export Data (CSV)
                  </Button>
                  
                  <Button 
                    variant="glass" 
                    className="h-14 rounded-xl justify-start px-6 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    onClick={handleFactoryReset}
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    Factory Reset
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
