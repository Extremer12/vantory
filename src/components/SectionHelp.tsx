import { HelpCircle, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';

interface HelpStep {
  title: string;
  description: string;
  icon?: any;
}

interface SectionHelpProps {
  title: string;
  description: string;
  steps: HelpStep[];
}

export function SectionHelp({ title, description, steps }: SectionHelpProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
        >
          <HelpCircle size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-white/10 bg-background/80 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Info className="text-primary" size={24} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 mt-1">
                {step.icon ? (
                  <step.icon className="text-primary" size={20} />
                ) : (
                  <CheckCircle2 className="text-primary" size={20} />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">{step.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 flex justify-end">
          <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
