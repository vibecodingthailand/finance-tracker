import { useId } from "react";

type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  size?: LogoSize;
  showWordmark?: boolean;
  className?: string;
}

const ICON_SIZE: Record<LogoSize, number> = { sm: 24, md: 32, lg: 48 };
const WORDMARK_CLASS: Record<LogoSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

export function Logo({
  size = "md",
  showWordmark = true,
  className = "",
}: LogoProps) {
  const gradientId = useId();
  const iconSize = ICON_SIZE[size];
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#34d399" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="18"
          width="6"
          height="10"
          rx="2"
          fill={`url(#${gradientId})`}
          opacity="0.5"
        />
        <rect
          x="13"
          y="12"
          width="6"
          height="16"
          rx="2"
          fill={`url(#${gradientId})`}
          opacity="0.75"
        />
        <rect
          x="22"
          y="6"
          width="6"
          height="22"
          rx="2"
          fill={`url(#${gradientId})`}
        />
      </svg>
      {showWordmark ? (
        <span
          className={`bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text font-heading font-extrabold text-transparent ${WORDMARK_CLASS[size]}`}
        >
          Finance Tracker
        </span>
      ) : null}
    </div>
  );
}
