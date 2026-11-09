import { CATEGORIES, CATEGORY_MAP, renderIcon } from './icons.js';
import {
  initDB,
  getAllExpenses,
  addExpense,
  deleteExpense,
  restoreExpense,
  calculateTotals,
} from './db.js';

export const WORST_CASE_EXPENSES = [
  {
    id: 'worst_1',
    concept:
      'Reembolso extraordinario de transporte rural cooperativa San Juan Bautista — referencia #TX-99481029384756102938',
    amount: 148950.75,
    category: 'Transporte',
    createdAt: Date.now() - 120000,
  },
  {
    id: 'worst_2',
    concept: 'factura.electrica.trimestral.industrial@cfe-suministrador-basico-nacional.gob.mx',
    amount: 9840.0,
    category: 'Servicios',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'worst_3',
    concept: 'T',
    amount: 0.05,
    category: 'Comida',
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'worst_4',
    concept: 'Suscripción anual plataforma cultural y cine independiente latinoamericano',
    amount: 1299.99,
    category: 'Ocio',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'worst_5',
    concept: 'Ferretería y herramientas de emergencia en carretera federal tramo 14',
    amount: 645.3,
    category: 'Otros',
    createdAt: Date.now() - 172800000,
  },
];

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatCurrency(value) {
  const num = Number(value);
  return currencyFormatter.format(Number.isFinite(num) ? num : 0);
}

export function formatTimestamp(ts) {
  try {
    return dateTimeFormatter.format(new Date(ts));
  } catch {
    return '';
  }
}

export function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const state = {
  expenses: [],
  activeCategoryFilter: 'Todas',
  selectedCategory: 'Comida',
  datasetMode: 'live',
  lastDeleted: null,
  toastTimer: null,
  deferredInstallPrompt: null,
  theme: 'auto',
};

function getDisplayedExpenses() {
  const source = state.datasetMode === 'worst' ? WORST_CASE_EXPENSES : state.expenses;
  if (state.activeCategoryFilter === 'Todas') {
    return source;
  }
  return source.filter((item) => item.category === state.activeCategoryFilter);
}

function getActiveSourceExpenses() {
  return state.datasetMode === 'worst' ? WORST_CASE_EXPENSES : state.expenses;
}

function renderStaticIcons() {
  const brandIcon = document.getElementById('brand-icon');
  const installIcon = document.getElementById('install-icon');
  const submitIcon = document.getElementById('submit-icon');
  const emptyIcon = document.getElementById('empty-icon');
  const undoIcon = document.getElementById('undo-icon');

  if (brandIcon) brandIcon.innerHTML = renderIcon('wallet');
  if (installIcon) installIcon.innerHTML = renderIcon('download');
  if (submitIcon) submitIcon.innerHTML = renderIcon('plus');
  if (emptyIcon) emptyIcon.innerHTML = renderIcon('empty');
  if (undoIcon) undoIcon.innerHTML = renderIcon('undo');
}

function updateNetworkBadge() {
  const badge = document.getElementById('network-status');
  const iconEl = document.getElementById('network-icon');
  const labelEl = document.getElementById('network-label');
  if (!badge || !iconEl || !labelEl) return;

  const isOnline = navigator.onLine !== false;
  badge.dataset.offline = isOnline ? 'false' : 'true';
  iconEl.innerHTML = renderIcon(isOnline ? 'online' : 'offline');
  labelEl.textContent = isOnline ? 'Online' : 'Modo Offline';
}

function applyTheme(theme) {
  state.theme = theme;
  const root = document.documentElement;
  if (theme === 'dark' || theme === 'light') {
    root.dataset.theme = theme;
  } else {
    delete root.dataset.theme;
  }

  const isDark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.innerHTML = renderIcon(isDark ? 'sun' : 'moon');
  }
}

function renderCategorySelectorPills() {
  const container = document.getElementById('category-pills');
  const selectEl = document.getElementById('category');
  if (!container) return;

  if (selectEl && selectEl.value !== state.selectedCategory) {
    selectEl.value = state.selectedCategory;
  }

  container.innerHTML = CATEGORIES.map((cat) => {
    const checked = cat.id === state.selectedCategory;
    return `
      <button
        type="button"
        class="category-pill"
        role="radio"
        aria-checked="${checked}"
        data-category="${cat.id}"
      >
        <span style="color: ${cat.color}">${renderIcon(cat.icon)}</span>
        <span>${cat.label}</span>
      </button>
    `;
  }).join('');
}

function renderLedgerSummary() {
  const allSource = getActiveSourceExpenses();
  const summary = calculateTotals(allSource);

  const totalEl = document.getElementById('total-amount');
  const countEl = document.getElementById('expense-count');
  const barEl = document.getElementById('distribution-bar');
  const legendEl = document.getElementById('distribution-legend');

  if (totalEl) {
    totalEl.textContent = formatCurrency(summary.total);
    totalEl.dataset.pulse = 'true';
    setTimeout(() => {
      totalEl.dataset.pulse = 'false';
    }, 180);
  }

  if (countEl) {
    countEl.textContent =
      summary.count === 1 ? '1 movimiento' : `${summary.count} movimientos`;
  }

  if (barEl && legendEl) {
    if (summary.total <= 0) {
      barEl.innerHTML = '';
      legendEl.innerHTML = '';
      return;
    }

    const activeCategories = CATEGORIES.filter(
      (cat) => summary.byCategory[cat.id]?.amount > 0
    );

    barEl.innerHTML = activeCategories
      .map((cat) => {
        const pct = Math.max(summary.byCategory[cat.id].percentage, 3);
        return `<div class="distribution-segment" style="flex: ${pct}; background: ${cat.color}"></div>`;
      })
      .join('');

    legendEl.innerHTML = activeCategories
      .map((cat) => {
        const info = summary.byCategory[cat.id];
        return `
          <span class="legend-item">
            <span class="legend-dot" style="background: ${cat.color}"></span>
            <span>${cat.label} ${info.percentage}%</span>
          </span>
        `;
      })
      .join('');
  }
}

function renderFilterBar() {
  const filterBar = document.getElementById('filter-bar');
  if (!filterBar) return;

  const source = getActiveSourceExpenses();
  const summary = calculateTotals(source);

  const tabs = [
    { id: 'Todas', label: 'Todas', count: summary.count },
    ...CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      count: summary.byCategory[cat.id]?.count || 0,
    })),
  ];

  filterBar.innerHTML = tabs
    .map((tab) => {
      const selected = state.activeCategoryFilter === tab.id;
      return `
        <button
          type="button"
          class="filter-chip"
          role="tab"
          aria-selected="${selected}"
          data-filter="${tab.id}"
        >
          <span>${tab.label}</span>
          <span class="filter-count">${tab.count}</span>
        </button>
      `;
    })
    .join('');
}

function renderExpenseList() {
  const listEl = document.getElementById('expense-list');
  const emptyEl = document.getElementById('empty-state');
  if (!listEl || !emptyEl) return;

  const filtered = getDisplayedExpenses();

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  listEl.innerHTML = filtered
    .map((item) => {
      const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.Otros;
      const deleteButtonHTML =
        state.datasetMode === 'live'
          ? `
            <button
              type="button"
              class="hold-delete-btn"
              data-delete-id="${escapeHTML(item.id)}"
              aria-label="Mantén presionado para eliminar ${escapeHTML(item.concept)}"
              title="Mantén presionado para eliminar"
            >
              ${renderIcon('trash')}
              <span class="hold-delete-fill" aria-hidden="true">${renderIcon('trash')}</span>
            </button>
          `
          : '';

      return `
        <li class="expense-item" data-id="${escapeHTML(item.id)}">
          <div class="expense-left">
            <div class="expense-cat-badge" style="color: ${cat.color}">
              ${renderIcon(cat.icon)}
            </div>
            <div class="expense-details">
              <p class="expense-concept">${escapeHTML(item.concept)}</p>
              <div class="expense-meta">
                <span class="expense-cat-tag">${escapeHTML(cat.label)}</span>
                <time class="expense-time">${escapeHTML(formatTimestamp(item.createdAt))}</time>
              </div>
            </div>
          </div>
          <div class="expense-right">
            <span class="expense-amount">$${formatCurrency(item.amount)}</span>
            ${deleteButtonHTML}
          </div>
        </li>
      `;
    })
    .join('');
}

function renderAll() {
  renderCategorySelectorPills();
  renderLedgerSummary();
  renderFilterBar();
  renderExpenseList();
}

function showUndoToast(expense) {
  state.lastDeleted = expense;
  const toast = document.getElementById('undo-toast');
  const msg = document.getElementById('toast-message');
  if (!toast || !msg) return;

  msg.textContent = `Eliminado: ${expense.concept}`;
  toast.dataset.visible = 'true';

  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }
  state.toastTimer = setTimeout(() => {
    toast.dataset.visible = 'false';
    state.lastDeleted = null;
  }, 4500);
}

async function handleDeleteExpense(id) {
  const target = state.expenses.find((item) => item.id === id);
  if (!target) return;

  state.expenses = await deleteExpense(id);
  renderAll();
  showUndoToast(target);
}

function setupHoldToDelete(listEl) {
  let holdTimer = null;
  let activeBtn = null;

  const cancelHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    if (activeBtn) {
      activeBtn.dataset.holding = 'false';
      activeBtn = null;
    }
  };

  listEl.addEventListener('pointerdown', (event) => {
    const btn = event.target.closest('.hold-delete-btn');
    if (!btn) return;

    const id = btn.dataset.deleteId;
    if (!id) return;

    cancelHold();
    activeBtn = btn;
    btn.dataset.holding = 'true';

    holdTimer = setTimeout(() => {
      btn.dataset.holding = 'false';
      activeBtn = null;
      holdTimer = null;
      handleDeleteExpense(id);
    }, 750);
  });

  listEl.addEventListener('pointerup', cancelHold);
  listEl.addEventListener('pointercancel', cancelHold);
  listEl.addEventListener('pointerleave', (event) => {
    if (activeBtn && event.target.closest('.hold-delete-btn') === activeBtn) {
      cancelHold();
    }
  });

  listEl.addEventListener('keydown', (event) => {
    const btn = event.target.closest('.hold-delete-btn');
    if (!btn) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDeleteExpense(btn.dataset.deleteId);
    }
  });
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js', { scope: './' });
    } catch {
      return;
    }
  }
}

export async function bootstrapApp() {
  if (typeof document === 'undefined') return;

  renderStaticIcons();
  updateNetworkBadge();

  const savedTheme = localStorage.getItem('mi_billetera_theme') || 'auto';
  applyTheme(savedTheme);

  await initDB();
  state.expenses = await getAllExpenses();
  renderAll();

  window.addEventListener('online', updateNetworkBadge);
  window.addEventListener('offline', updateNetworkBadge);

  const form = document.getElementById('expense-form');
  const conceptInput = document.getElementById('concept');
  const amountInput = document.getElementById('amount');
  const categorySelect = document.getElementById('category');
  const categoryPills = document.getElementById('category-pills');
  const errorEl = document.getElementById('form-error');
  const filterBar = document.getElementById('filter-bar');
  const expenseList = document.getElementById('expense-list');
  const themeBtn = document.getElementById('theme-toggle');
  const installBtn = document.getElementById('install-btn');
  const undoBtn = document.getElementById('toast-undo-btn');
  const modeLiveBtn = document.getElementById('mode-live-btn');
  const modeWorstBtn = document.getElementById('mode-worst-btn');

  categorySelect?.addEventListener('change', (event) => {
    state.selectedCategory = event.target.value;
    renderCategorySelectorPills();
  });

  categoryPills?.addEventListener('click', (event) => {
    const pill = event.target.closest('.category-pill');
    if (!pill) return;
    state.selectedCategory = pill.dataset.category;
    if (categorySelect) {
      categorySelect.value = state.selectedCategory;
    }
    renderCategorySelectorPills();
  });

  filterBar?.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    state.activeCategoryFilter = chip.dataset.filter;
    renderFilterBar();
    renderExpenseList();
  });

  if (expenseList) {
    setupHoldToDelete(expenseList);
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (errorEl) errorEl.hidden = true;

    try {
      const category = categorySelect ? categorySelect.value : state.selectedCategory;
      await addExpense({
        concept: conceptInput?.value,
        amount: amountInput?.value,
        category,
      });

      if (state.datasetMode !== 'live') {
        state.datasetMode = 'live';
        modeLiveBtn?.classList.add('is-active');
        modeWorstBtn?.classList.remove('is-active');
      }

      state.expenses = await getAllExpenses();
      if (conceptInput) conceptInput.value = '';
      if (amountInput) amountInput.value = '';
      conceptInput?.focus();
      renderAll();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Verifica los datos ingresados.';
        errorEl.hidden = false;
      }
    }
  });

  undoBtn?.addEventListener('click', async () => {
    if (!state.lastDeleted) return;
    const toRestore = state.lastDeleted;
    state.lastDeleted = null;
    const toast = document.getElementById('undo-toast');
    if (toast) toast.dataset.visible = 'false';

    await restoreExpense(toRestore);
    state.expenses = await getAllExpenses();
    renderAll();
  });

  themeBtn?.addEventListener('click', () => {
    const isCurrentlyDark =
      state.theme === 'dark' ||
      (state.theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const nextTheme = isCurrentlyDark ? 'light' : 'dark';
    localStorage.setItem('mi_billetera_theme', nextTheme);
    applyTheme(nextTheme);
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    if (installBtn) installBtn.hidden = false;
  });

  installBtn?.addEventListener('click', async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    installBtn.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    state.deferredInstallPrompt = null;
    if (installBtn) installBtn.hidden = true;
  });

  const setDatasetMode = (mode) => {
    state.datasetMode = mode;
    modeLiveBtn?.classList.toggle('is-active', mode === 'live');
    modeWorstBtn?.classList.toggle('is-active', mode === 'worst');
    renderAll();
  };

  modeLiveBtn?.addEventListener('click', () => setDatasetMode('live'));
  modeWorstBtn?.addEventListener('click', () => setDatasetMode('worst'));

  await registerServiceWorker();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    bootstrapApp();
  }
}
