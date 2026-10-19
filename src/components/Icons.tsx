import type { ReactNode } from 'react';

export type IconName =
  | 'home'
  | 'users'
  | 'calendar'
  | 'wallet'
  | 'file'
  | 'settings'
  | 'plus'
  | 'info'
  | 'chevron'
  | 'piggy'
  | 'case'
  | 'target'
  | 'swim'
  | 'medical'
  | 'school'
  | 'cake'
  | 'shield'
  | 'palm'
  | 'cap'
  | 'heart'
  | 'house'
  | 'car'
  | 'bell'
  | 'lock'
  | 'check';

const glyphs: Record<IconName, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1z" />,
  users: (
    <>
      <path d="M16 20v-1.2A3.2 3.2 0 0 0 12.8 15H7.2A3.2 3.2 0 0 0 4 18.8V20" />
      <circle cx="10" cy="8" r="3" />
      <path d="M20 20v-1.1A2.8 2.8 0 0 0 17.6 16" />
      <path d="M16.2 5.2a2.6 2.6 0 0 1 0 5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  file: (
    <>
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M14 3.5V8h4M8.5 13h7M8.5 16.5h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3V20.5M4.8 6.8l1.6 1.6M17.6 15.6l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.2l1.6-1.6M17.6 8.4l1.6-1.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  piggy: (
    <>
      <path d="M5 11c0-3 2.8-5 7-5 2.4 0 4 .8 5.2 2H19a2 2 0 0 1 2 2v1.2a2 2 0 0 1-1.2 1.8L19 16.5V19h-3l-1 1.5h-2L12 19H9.2L8 17.2C6.2 16.4 5 14.8 5 12.8V11z" />
      <circle cx="9" cy="11" r=".7" fill="currentColor" stroke="none" />
      <path d="M4 12.5H2.5" />
    </>
  ),
  case: (
    <>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M8 7V5.8A1.8 1.8 0 0 1 9.8 4h4.4A1.8 1.8 0 0 1 16 5.8V7M3 12h18" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  swim: <path d="M3 15c1.5 1.2 2.5 1.2 4 0s2.5-1.2 4 0 2.5 1.2 4 0 2.5-1.2 4 0M7 8.5 9.5 6l2 2 3-3M14 5.2l1.2 1.4" />,
  medical: (
    <>
      <path d="M12 7v10M8 9.5h8" />
      <rect x="5" y="4" width="14" height="16" rx="3" />
    </>
  ),
  school: (
    <>
      <path d="M3 10 12 5l9 5-9 5z" />
      <path d="M7 12.2V16c1.6 1.3 3.2 2 5 2s3.4-.7 5-2v-3.8" />
    </>
  ),
  cake: (
    <>
      <path d="M4 13h16v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 16h16M8 13v-2a2 2 0 1 1 4 0v2M12 13V9.5" />
      <path d="M12 7.2c.4-.8.4-1.4 0-2.2" />
    </>
  ),
  shield: <path d="M12 3.5 19 6v6.2c0 3.6-2.7 6.2-7 7.8-4.3-1.6-7-4.2-7-7.8V6z" />,
  palm: (
    <>
      <path d="M12 21V12" />
      <path d="M12 12c0-4 2.2-7 2.2-7M12 13c2 0 5-1 6-3.5M12 13c-2.2 0-5-.6-6.2-3M12 14.5c1.8.4 4 2 4.5 4M12 14.5C10 15 8 16.5 7.5 18.5" />
    </>
  ),
  cap: (
    <>
      <path d="M3 10.5 12 6l9 4.5-9 4.5z" />
      <path d="M7.5 12.8V16c1.4 1.2 2.9 1.8 4.5 1.8s3.1-.6 4.5-1.8v-3.2" />
    </>
  ),
  heart: <path d="M12 19s-7-4.2-7-8.2A3.6 3.6 0 0 1 12 8a3.6 3.6 0 0 1 7 2.8C19 14.8 12 19 12 19z" />,
  house: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  car: (
    <>
      <path d="M4 15v2M20 15v2" />
      <path d="M3 15h18v-2.2L18.2 8H6.2L3 12.8z" />
      <circle cx="7.5" cy="15.5" r="1.2" />
      <circle cx="16.5" cy="15.5" r="1.2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
    </>
  ),
  check: <path d="M5 12.5 9.2 17 19 7" />,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {glyphs[name]}
    </svg>
  );
}
