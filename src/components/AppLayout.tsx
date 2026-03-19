import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AnimatePresence, motion } from 'framer-motion';

interface AppLayoutProps {
  children: ReactNode;
  locationKey?: string;
}

export default function AppLayout({ children, locationKey }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative bg-background overflow-hidden">
        {/* Global Abstract Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px]" />
        </div>

        <div className="z-10 flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center border-b border-white/5 bg-background/50 backdrop-blur-xl px-4 sticky top-0 z-20">
              <SidebarTrigger className="text-foreground/80 hover:text-foreground hover:bg-white/5" />
            </header>
            <main className="flex-1 p-6 overflow-auto relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={locationKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="h-full w-full max-w-7xl mx-auto"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
