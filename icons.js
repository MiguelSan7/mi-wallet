export const ICONS = {
  wallet: `<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M3 7h18v12H3z"/><path d="M16 13h5v4h-5a2 2 0 0 1 0-4z"/><circle cx="17.5" cy="15" r="0.75" fill="currentColor"/>`,
  food: `<path d="M4 3v7a3 3 0 0 0 3 3v8"/><path d="M7 3v7"/><path d="M10 3v7"/><path d="M16 3c2.5 0 4 2.2 4 5.5V14h-3v7h-2V3h1z"/>`,
  transport: `<rect x="4" y="4" width="16" height="12" rx="3"/><path d="M4 11h16"/><path d="M7 16v3"/><path d="M17 16v3"/><circle cx="7.5" cy="13.5" r="1" fill="currentColor"/><circle cx="16.5" cy="13.5" r="1" fill="currentColor"/>`,
  services: `<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>`,
  leisure: `<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 12h4"/><path d="M8 10v4"/><circle cx="15.5" cy="11" r="1" fill="currentColor"/><circle cx="17.5" cy="13" r="1" fill="currentColor"/>`,
  other: `<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M12 12L4 7.5"/>`,
  plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
  trash: `<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>`,
  online: `<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="19.5" r="1.25" fill="currentColor"/>`,
  offline: `<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 5.2-2.4"/><path d="M14.8 10.4A10 10 0 0 1 19 12.5"/><circle cx="12" cy="19.5" r="1.25" fill="currentColor"/>`,
  download: `<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/>`,
  moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,
  undo: `<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>`,
  empty: `<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8"/><path d="M8 13h5"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/>`,
  check: `<path d="M20 6L9 17l-5-5"/>`,
};

export const CATEGORIES = [
  { id: 'Comida', label: 'Comida', icon: 'food', color: 'var(--cat-food)' },
  { id: 'Transporte', label: 'Transporte', icon: 'transport', color: 'var(--cat-transport)' },
  { id: 'Servicios', label: 'Servicios', icon: 'services', color: 'var(--cat-services)' },
  { id: 'Ocio', label: 'Ocio', icon: 'leisure', color: 'var(--cat-leisure)' },
  { id: 'Otros', label: 'Otros', icon: 'other', color: 'var(--cat-other)' },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
);

export function renderIcon(name, className = 'icon') {
  const paths = ICONS[name] || ICONS.other;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
