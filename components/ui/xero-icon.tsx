export function XeroIcon({ size = 14, className = '', tooltip = '从 Xero 导入' }: { size?: number; className?: string; tooltip?: string }) {
  return (
    <span className="relative group inline-flex items-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label={tooltip}
      >
        <circle cx="12" cy="12" r="12" fill="#00B5D8" />
        <path
          d="M7.5 8L12 12.5L7.5 17M16.5 8L12 12.5L16.5 17"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 z-50">
        {tooltip}
      </span>
    </span>
  )
}
