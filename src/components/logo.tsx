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
        <path d="M10 5L2 12l8 7" />
        <path d="M14 5l8 7-8 7" />
        <path d="M7 8l-1.5-1.5" />
        <path d="M17 8l1.5-1.5" />
    </svg>
  );
  
