import type { SVGProps } from 'react';

// Lucide-derived 24x24 stroke paths. One consistent set, sized with w-*/h-*.
const PATHS: Record<string, string> = {
  dashboard: 'M4 13h6V4H4v9Zm10 7h6V10h-6v10ZM4 20h6v-5H4v5Zm10-13h6V4h-6v3Z',
  building:
    'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 22H2M6 22h12m6 0h-6M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 22v-4a2 2 0 0 1 4 0v4',
  inbox:
    'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M16 13H8M16 17H8M10 9H8',
  wallet:
    'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
  wrench:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z',
  sparkles:
    'm12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3ZM5 3v4M19 17v4M3 5h4M17 19h4',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  alert:
    'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01',
  broom: 'M19.4 20 9.6 10.2M13 5l6 6M17 3l4 4-8 3-3-3 7-4ZM3 21l4.5-4.5M3 21c1.5-3 3-4.5 4.5-4.5M7.5 16.5C6 18 4.5 19.5 3 21',
  home: 'M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z',
  search: 'm21 21-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  chevronRight: 'm9 18 6-6-6-6',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm18 15-6-6-6 6',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3Z',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  arrowUpRight: 'M7 17 17 7M7 7h10v10',
  info: 'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  camera:
    'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
  key: 'm21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777Zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4',
  menu: 'M4 6h16M4 12h16M4 18h16',
  // AI assistant — bot head with a sparkle (matches the Roomora assistant mark)
  bot:
    'M12 2v3M7 6h7a3 3 0 0 1 3 3v3.5M6 18a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3M6 18h6M6 18a3 3 0 0 0 0 0M9 12h.01M13 12h.01M19 14l1.2 3.2L23.5 18l-3.3 1.2L19 22l-1.2-2.8L14.5 18l3.3-.8L19 14Z',
  // ── extra property-themed glyphs, used by the decorative gutters ──
  bed: 'M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  door: 'M13 4h3a2 2 0 0 1 2 2v14M2 20h20M13 20V4a1 1 0 0 0-1.25-.97L6.75 4.28A1 1 0 0 0 6 5.25V20M11 12h.01',
  lamp: 'M8 2h8l4 10H4L8 2ZM12 12v8M8 22h8',
  sofa: 'M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2M4 9a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2H6v-2a2 2 0 0 0-2-2ZM6 18v2M18 18v2',
  plant: 'M12 22v-8M12 14c0-3 2-5 5-5 0 3-2 5-5 5ZM12 14c0-4-3-6-6-6 0 4 3 6 6 6ZM9 22h6',
  mapPin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  fence: 'M4 4 3 8v13h4V8L6 4H4ZM18 4l-1 4v13h4V8l-1-4h-2ZM11 4l-1 4v13h4V8l-1-4h-2M3 12h18M3 16h18',
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: keyof typeof PATHS;
  size?: number;
}

export function Icon({ name, size = 18, className = '', ...rest }: IconProps) {
  const d = PATHS[name] ?? PATHS.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
    </svg>
  );
}

export type IconName = keyof typeof PATHS;
