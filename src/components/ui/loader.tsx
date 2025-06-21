import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Loader({ className, message }: { className?: string; message?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 text-accent", className)}>
      <div className="relative h-16 w-16">
        <Sparkles className="absolute h-16 w-16 animate-ping opacity-30" />
        <Sparkles className="absolute h-16 w-16 animate-pulse" />
      </div>
      <p className="font-headline text-xl text-glow text-center px-4">{message || "Vibin' with the void..."}</p>
    </div>
  );
}
