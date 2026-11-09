/* One consistent line-icon set (24px grid, 1.8 stroke) instead of emojis. */

type P = { className?: string; strokeWidth?: number };

function I({ className = "size-5", strokeWidth = 1.8, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  Compass: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </I>
  ),
  Calendar: (p: P) => (
    <I {...p}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </I>
  ),
  Pin: (p: P) => (
    <I {...p}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </I>
  ),
  Bed: (p: P) => (
    <I {...p}>
      <path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
      <circle cx="7" cy="11" r="1.6" />
    </I>
  ),
  Bus: (p: P) => (
    <I {...p}>
      <rect x="4" y="3" width="16" height="15" rx="3" />
      <path d="M4 11h16M8 18v2M16 18v2" />
      <path d="M8 14.5h.01M16 14.5h.01" strokeWidth={2.6} />
    </I>
  ),
  Plane: (p: P) => (
    <I {...p}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z" />
    </I>
  ),
  Utensils: (p: P) => (
    <I {...p}>
      <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2.5 1-4 3.5-4 7v3h4" />
    </I>
  ),
  Ticket: (p: P) => (
    <I {...p}>
      <path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1a2 2 0 0 1 0-4 2 2 0 0 1 0-4V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v1Z" transform="translate(0 -.5)" />
      <path d="M14 5v2M14 11v2M14 17v2" />
    </I>
  ),
  Bag: (p: P) => (
    <I {...p}>
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </I>
  ),
  Dot: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="3.5" />
    </I>
  ),
  Wallet: (p: P) => (
    <I {...p}>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M16.5 14h.01" strokeWidth={2.6} />
    </I>
  ),
  Users: (p: P) => (
    <I {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </I>
  ),
  Home: (p: P) => (
    <I {...p}>
      <path d="M3 11 12 4l9 7M5 10v10h14V10" />
    </I>
  ),
  Printer: (p: P) => (
    <I {...p}>
      <path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <rect x="7" y="14" width="10" height="7" rx="1" />
    </I>
  ),
  Share: (p: P) => (
    <I {...p}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
    </I>
  ),
  Plus: (p: P) => (
    <I {...p}>
      <path d="M12 5v14M5 12h14" />
    </I>
  ),
  Heart: ({ filled, ...p }: P & { filled?: boolean }) => (
    <I {...p}>
      <path
        d="M12 20s-7.5-4.6-9.2-9.3A5 5 0 0 1 12 6.6a5 5 0 0 1 9.2 4.1C19.5 15.4 12 20 12 20Z"
        fill={filled ? "currentColor" : "none"}
      />
    </I>
  ),
  Pencil: (p: P) => (
    <I {...p}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </I>
  ),
  Trash: (p: P) => (
    <I {...p}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </I>
  ),
  ArrowLeft: (p: P) => (
    <I {...p}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </I>
  ),
  ArrowRight: (p: P) => (
    <I {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </I>
  ),
  External: (p: P) => (
    <I {...p}>
      <path d="M14 4h6v6M20 4 11 13M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </I>
  ),
  ChevronUp: (p: P) => (
    <I {...p}>
      <path d="m6 15 6-6 6 6" />
    </I>
  ),
  ChevronDown: (p: P) => (
    <I {...p}>
      <path d="m6 9 6 6 6-6" />
    </I>
  ),
  Check: (p: P) => (
    <I {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </I>
  ),
  X: (p: P) => (
    <I {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </I>
  ),
  Search: (p: P) => (
    <I {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </I>
  ),
  Copy: (p: P) => (
    <I {...p}>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </I>
  ),
  Download: (p: P) => (
    <I {...p}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </I>
  ),
  Alert: (p: P) => (
    <I {...p}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </I>
  ),
  Sparkle: (p: P) => (
    <I {...p}>
      <path d="M12 3c.5 4.5 2 6 6.5 6.5-4.5.5-6 2-6.5 6.5-.5-4.5-2-6-6.5-6.5C10 9 11.5 7.5 12 3ZM19 15c.2 1.8.8 2.5 2.5 2.7-1.7.2-2.3.9-2.5 2.6-.2-1.7-.8-2.4-2.5-2.6 1.7-.2 2.3-.9 2.5-2.7Z" />
    </I>
  ),
  Clock: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </I>
  ),
  Link: (p: P) => (
    <I {...p}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.8M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
    </I>
  ),
  Eye: (p: P) => (
    <I {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </I>
  ),
  Suitcase: (p: P) => (
    <I {...p}>
      <rect x="4" y="7" width="16" height="13" rx="2.5" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M9 11v5M15 11v5" />
    </I>
  ),
  Route: (p: P) => (
    <I {...p}>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
    </I>
  ),
  /* weather */
  Sun: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </I>
  ),
  CloudSun: (p: P) => (
    <I {...p}>
      <path d="M12 2.5v1.5M5.6 5.1l1 1M19.4 5.1l-1 1M21 11.5h-1.5M8.3 11a4 4 0 0 1 7.6-1.5" />
      <path d="M17 21H8a4 4 0 1 1 .9-7.9A5 5 0 0 1 18 15a3 3 0 0 1-1 6Z" transform="translate(-1 -1)" />
    </I>
  ),
  Cloud: (p: P) => (
    <I {...p}>
      <path d="M17.5 19H7a5 5 0 1 1 1.3-9.8A6 6 0 0 1 19.5 12a3.5 3.5 0 0 1-2 7Z" />
    </I>
  ),
  Rain: (p: P) => (
    <I {...p}>
      <path d="M17.5 15H7a5 5 0 1 1 1.3-9.8A6 6 0 0 1 19.5 8a3.5 3.5 0 0 1-2 7Z" />
      <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
    </I>
  ),
  Snow: (p: P) => (
    <I {...p}>
      <path d="M17.5 14H7a5 5 0 1 1 1.3-9.8A6 6 0 0 1 19.5 7a3.5 3.5 0 0 1-2 7Z" />
      <path d="M8 18h.01M12 18h.01M16 18h.01M10 21h.01M14 21h.01" strokeWidth={2.6} />
    </I>
  ),
  Storm: (p: P) => (
    <I {...p}>
      <path d="M17.5 14H7a5 5 0 1 1 1.3-9.8A6 6 0 0 1 19.5 7a3.5 3.5 0 0 1-2 7Z" />
      <path d="m13 14-3 4h4l-3 4" />
    </I>
  ),
  Fog: (p: P) => (
    <I {...p}>
      <path d="M4 9h16M3 13h18M5 17h14" />
    </I>
  ),
};

export type IconName = keyof typeof Icon;
