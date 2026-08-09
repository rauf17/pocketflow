import { Sidebar, BottomNav } from "@/components/Navigation";
import { LivingFlow } from "@/components/LivingFlow";
import { Gatekeeper, MobileHeader } from "@/components/Gatekeeper";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Gatekeeper>
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
        {/* Mobile Header with Wave P Logo */}
        <MobileHeader />

        {/* Decorative background glow */}
        <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-flow-emerald/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="fixed bottom-[20%] right-[-10%] w-[40vw] h-[40vw] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Global Background FlowPath */}
        <div className="fixed inset-0 pointer-events-none -z-10 opacity-30">
          <LivingFlow />
        </div>

        <Sidebar />
        
        <main className="flex-1 md:ml-64 w-full pb-24 md:pb-0 min-h-screen">
          {children}
        </main>

        <BottomNav />
      </div>
    </Gatekeeper>
  );
}

