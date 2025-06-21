import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-16 h-16", className)}
    >
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 2a10 10 0 1 0-7.54 16.09" />
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <path d="m5.64 5.64 12.72 12.72" />
      <path d="m5.64 18.36 12.72-12.72" />
    </svg>
  );
  
