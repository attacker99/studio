import { cn } from "@/lib/utils";
import { PawPrint } from 'lucide-react';

export const Logo = ({ className }: { className?: string }) => (
    <PawPrint className={cn("w-16 h-16 text-primary", className)} />
  );
  