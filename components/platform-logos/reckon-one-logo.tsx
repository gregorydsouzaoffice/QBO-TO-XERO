export function ReckonOneLogo({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size * 4, height: size }}>
      <svg viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size * 4} height={size}>
        {/* Reckon text in navy blue */}
        <text x="0" y="28" fill="#1B2A41" fontSize="24" fontFamily="Arial, sans-serif" fontWeight="bold">
          Reckon
        </text>
        {/* Red rounded square with white R */}
        <rect x="120" y="4" width="32" height="32" rx="8" fill="#FF5043" />
        <text
          x="136"
          y="26"
          fill="white"
          fontSize="20"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          textAnchor="middle"
        >
          R
        </text>
      </svg>
    </div>
  )
}
