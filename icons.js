export const ICONS = {
  wallet: `<path d="M19 7V5.5A2.5 2.5 0 0 0 16.5 3h-11A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21h13a2.5 2.5 0 0 0 2.5-2.5V9.5A2.5 2.5 0 0 0 18.5 7H5"/><path d="M16 12.5h5v3h-5a1.5 1.5 0 0 1 0-3z"/><circle cx="17.5" cy="14" r="0.6" fill="currentColor"/>`,
  food: `<path d="M4 3v6a3 3 0 0 0 3 3v9"/><path d="M7 3v6"/><path d="M10 3v6"/><path d="M15 3c2.8 0 4 2.2 4 5.5V14h-3v7h-2V3h1z"/>`,
  transport: `<rect x="4" y="4" width="16" height="12" rx="3"/><path d="M4 10.5h16"/><path d="M7 16v3"/><path d="M17 16v3"/><circle cx="7.5" cy="13.2" r="1" fill="currentColor"/><circle cx="16.5" cy="13.2" r="1" fill="currentColor"/>`,
  services: `<path d="M13 2L4.5 13.5h6.5L10 22l9.5-12H13l0-8z"/>`,
  leisure: `<rect x="2.5" y="6" width="19" height="12" rx="3.5"/><path d="M6.5 12h4"/><path d="M8.5 10v4"/><circle cx="15" cy="11" r="1" fill="currentColor"/><circle cx="17.2" cy="13" r="1" fill="currentColor"/>`,
  other: `<path d="M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5L12 2.5z"/><path d="M12 12l8.5-4.75"/><path d="M12 12v9.5"/><path d="M12 12L3.5 7.25"/>`,
  plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
  trash: `<path d="M3.5 6h17"/><path d="M8.5 6V4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2"/><path d="M18.5 6l-1 13a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2l-1-13"/><path d="M10 10.5v6"/><path d="M14 10.5v6"/>`,
  online: `<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="19.5" r="1.25" fill="currentColor"/>`,
  offline: `<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 5.2-2.4"/><path d="M14.8 10.4A10 10 0 0 1 19 12.5"/><circle cx="12" cy="19.5" r="1.25" fill="currentColor"/>`,
  download: `<path d="M12 3.5v11.5"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2"/><path d="M12 19.5v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2.5 12h2"/><path d="M19.5 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/>`,
  moon: `<path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7z"/>`,
  undo: `<path d="M8.5 14L3.5 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>`,
  empty: `<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 8.5h8"/><path d="M8 12.5h5"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/>`,
  check: `<path d="M20 6.5L9.5 17l-5-5"/>`,
  spark: `<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M5.6 5.6l2.8 2.8"/><path d="M15.6 15.6l2.8 2.8"/><path d="M18.4 5.6l-2.8 2.8"/><path d="M8.4 15.6l-2.8 2.8"/>`,
};

export const CATEGORIES = [
  {
    id: 'Comida',
    label: 'Comida',
    icon: 'food',
    color: 'var(--cat-food)',
    presets: ['Café', 'Mercado', 'Comida corrida', 'Despensa'],
  },
  {
    id: 'Transporte',
    label: 'Transporte',
    icon: 'transport',
    color: 'var(--cat-transport)',
    presets: ['Taxis', 'Colectivo', 'Metro', 'Gasolina'],
  },
  {
    id: 'Servicios',
    label: 'Servicios',
    icon: 'services',
    color: 'var(--cat-services)',
    presets: ['Recarga móvil', 'Luz CFE', 'Agua', 'Internet'],
  },
  {
    id: 'Ocio',
    label: 'Ocio',
    icon: 'leisure',
    color: 'var(--cat-leisure)',
    presets: ['Cine', 'Salida', 'Concierto', 'Libros'],
  },
  {
    id: 'Otros',
    label: 'Otros',
    icon: 'other',
    color: 'var(--cat-other)',
    presets: ['Farmacia', 'Ferretería', 'Papelería', 'Imprevisto'],
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
);

export function renderIcon(name, className = 'icon') {
  const paths = ICONS[name] || ICONS.other;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}
