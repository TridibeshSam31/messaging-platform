interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  layout?: "horizontal" | "vertical"
  customText?: string
}

export function Logo({
  size = "md",
  showText = true,
  layout = "horizontal",
  customText = "VEYRA",
}: LogoProps) {
  const isVertical = layout === "vertical"

  const iconDimensions = {
    sm: "w-7 h-7",
    md: "w-10 h-10",
    lg: "w-20 h-20",
    xl: "w-36 h-36",
  }

  const fontSizes = {
    sm: "text-xs font-bold tracking-[0.15em]",
    md: "text-base font-extrabold tracking-[0.18em]",
    lg: "text-3xl font-extrabold tracking-[0.22em]",
    xl: "text-4xl font-extrabold tracking-[0.25em]",
  }

  return (
    <div
      className={`inline-flex items-center select-none ${
        isVertical ? "flex-col justify-center gap-3" : "flex-row gap-2.5"
      }`}
    >
      {/* VEYRA Gold Heart Emblem SVG matching reference screenshots */}
      <div className={`${iconDimensions[size]} relative flex items-center justify-center shrink-0`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(245,158,11,0.35)]"
        >
          <defs>
            <linearGradient id="veyraGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          {/* Outer Gold Heart Loop */}
          <path
            d="M 50 88 C 20 62 10 40 22 24 C 32 10 48 18 50 28 C 52 18 68 10 78 24 C 90 40 80 62 50 88 Z"
            stroke="url(#veyraGold)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Inner Loop forming Stylized V/E Motif */}
          <path
            d="M 36 34 C 44 42 48 54 50 66 C 54 48 64 36 64 36"
            stroke="url(#veyraGold)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Flame Accents at top */}
          <path
            d="M 24 16 C 24 16 22 10 26 8 C 28 12 26 14 26 14"
            stroke="url(#veyraGold)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 76 16 C 76 16 78 10 74 8 C 72 12 74 14 74 14"
            stroke="url(#veyraGold)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* VEYRA Brand Text */}
      {showText && (
        <span
          className={`font-sans uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#D97706] ${fontSizes[size]}`}
        >
          {customText}
        </span>
      )}
    </div>
  )
}
