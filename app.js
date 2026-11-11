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

function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

const state = {
  expenses: [],
  activeCategoryFilter: 'Todas',
  selectedCategory: 'Comida',
  datasetMode: 'live',
  variant: 'tactile',
  lastDeleted: null,
  toastTimer: null,
  deferredInstallPrompt: null,
  theme: 'auto',
};

function getActiveSourceExpenses() {
  return state.datasetMode === 'worst' ? WORST_CASE_EXPENSES : state.expenses;
}

function getDisplayedExpenses() {
  const source = getActiveSourceExpenses();
  if (state.activeCategoryFilter === 'Todas') {
    return source;
  }
  return source.filter((item) => item.category === state.activeCategoryFilter);
}

function renderStaticIcons() {
  const brandIcon = document.getElementById('brand-icon');
  const installIcon = document.getElementById('install-icon');
  const submitIcon = document.getElementById('submit-icon');
  const emptyIcon = document.getElementById('empty-icon');
  const undoIcon = document.getElementById('undo-icon');
  const dateLabel = document.getElementById('current-date-label');

  if (brandIcon) brandIcon.innerHTML = renderIcon('wallet');
  if (installIcon) installIcon.innerHTML = renderIcon('download');
  if (submitIcon) submitIcon.innerHTML = renderIcon('plus');
  if (emptyIcon) emptyIcon.innerHTML = renderIcon('empty');
  if (undoIcon) undoIcon.innerHTML = renderIcon('undo');

  if (dateLabel) {
    const today = new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
      .format(new Date())
      .toUpperCase();
    dateLabel.textContent = `${today} · LOCAL`;
  }
}

function updateNetworkBadge() {
  const badge = document.getElementById('network-status');
  const iconEl = document.getElementById('network-icon');
  const labelEl = document.getElementById('network-label');
  if (!badge || !iconEl || !labelEl) return;

  const isOnline = navigator.onLine !== false;
  badge.dataset.offline = isOnline ? 'false' : 'true';
  iconEl.innerHTML = renderIcon(isOnline ? 'online' : 'offline');
  labelEl.textContent = isOnline ? 'ONLINE' : 'MODO AVIÓN';
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

function renderPresetChips() {
  const container = document.getElementById('preset-chips');
  if (!container) return;

  const currentCat = CATEGORY_MAP[state.selectedCategory] || CATEGORY_MAP.Comida;
  const presets = currentCat.presets || [];

  container.innerHTML = presets
    .map(
      (preset) =>
        `<button type="button" class="preset-chip" data-preset="${escapeHTML(preset)}">${escapeHTML(preset)}</button>`
    )
    .join('');
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
        <span class="category-pill-dot" style="background: ${cat.color}"></span>
        <span style="color: ${cat.color}">${renderIcon(cat.icon)}</span>
        <span>${cat.label}</span>
      </button>
    `;
  }).join('');

  renderPresetChips();
}

function renderLedgerSummary() {
  const allSource = getActiveSourceExpenses();
  const summary = calculateTotals(allSource);

  const totalEl = document.getElementById('total-amount');
  const countEl = document.getElementById('expense-count');
  const barEl = document.getElementById('distribution-bar');
  const legendEl = document.getElementById('distribution-legend');

  if (totalEl) {
    const formatted = formatCurrency(summary.total);
    const [whole, cents = '00'] = formatted.split('.');
    totalEl.innerHTML = `${escapeHTML(whole)}<span class="total-cents">.${escapeHTML(cents)}</span>`;
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
        const pct = Math.max(summary.byCategory[cat.id].percentage, 4);
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

function updateClipFilterPosition() {
  const baseBar = document.getElementById('filter-bar');
  const clippedBar = document.getElementById('filter-bar-clipped');
  if (!baseBar || !clippedBar) return;

  const activeBtn = baseBar.querySelector('[aria-selected="true"]');
  if (!activeBtn) return;

  const totalWidth = baseBar.scrollWidth || baseBar.offsetWidth || 1;
  const left = activeBtn.offsetLeft;
  const right = Math.max(0, totalWidth - (left + activeBtn.offsetWidth));

  const leftPct = ((left / totalWidth) * 100).toFixed(2);
  const rightPct = ((right / totalWidth) * 100).toFixed(2);
  clippedBar.style.clipPath = `inset(0 ${rightPct}% 0 ${leftPct}% round 999px)`;
}

function renderFilterBar() {
  const filterBar = document.getElementById('filter-bar');
  const clippedBar = document.getElementById('filter-bar-clipped');
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

  const html = tabs
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

  filterBar.innerHTML = html;
  if (clippedBar) {
    clippedBar.innerHTML = html.replace(/role="tab"/g, 'tabindex="-1"');
    requestAnimationFrame(updateClipFilterPosition);
  }
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
        <li class="expense-row-shell" data-id="${escapeHTML(item.id)}">
          <div class="swipe-delete-Clean" aria-hidden="true">
            ${renderIcon('trash')}
            <span>ELIMINAR</span>
          </div>
          <div class="expense-item" data-swipe-id="${escapeHTML(item.id)}">
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

  toast.style.transform = '';
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

  const listEl = document.getElementById('expense-list');
  const rowEl = listEl?.querySelector(`.expense-row-shell[data-id="${CSS.escape(id)}"]`);

  const firstRects = new Map();
  if (listEl) {
    for (const child of listEl.children) {
      if (child !== rowEl) {
        firstRects.set(child.dataset.id, child.getBoundingClientRect());
      }
    }
  }

  if (rowEl && listEl) {
    const rect = rowEl.getBoundingClientRect();
    const listRect = listEl.getBoundingClientRect();
    rowEl.style.position = 'absolute';
    rowEl.style.top = `${rect.top - listRect.top}px`;
    rowEl.style.left = '0';
    rowEl.style.width = `${rect.width}px`;
    rowEl.dataset.exiting = 'true';
  }

  state.expenses = await deleteExpense(id);

  setTimeout(() => {
    renderLedgerSummary();
    renderFilterBar();
    renderExpenseList();

    if (listEl && firstRects.size > 0) {
      for (const child of listEl.children) {
        const prev = firstRects.get(child.dataset.id);
        if (!prev) continue;
        const next = child.getBoundingClientRect();
        const deltaY = prev.top - next.top;
        if (Math.abs(deltaY) > 1) {
          child.animate(
            [{ transform: `translateY(${deltaY}px)` }, { transform: 'translateY(0)' }],
            { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
          );
        }
      }
    }
  }, 160);

  showUndoToast(target);
}

function setupRowGesturesAndHoldDelete(listEl) {
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

  let dragTarget = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let currentX = 0;
  let axisLocked = null;
  let activePointerId = null;

  listEl.addEventListener('pointerdown', (event) => {
    const holdBtn = event.target.closest('.hold-delete-btn');
    if (holdBtn) {
      const id = holdBtn.dataset.deleteId;
      if (!id) return;
      cancelHold();
      activeBtn = holdBtn;
      holdBtn.dataset.holding = 'true';
      holdTimer = setTimeout(() => {
        holdBtn.dataset.holding = 'false';
        activeBtn = null;
        holdTimer = null;
        handleDeleteExpense(id);
      }, 750);
      return;
    }

    if (state.datasetMode !== 'live') return;
    const card = event.target.closest('.expense-item');
    if (!card || activePointerId !== null) return;

    activePointerId = event.pointerId;
    dragTarget = card;
    startX = event.clientX;
    startY = event.clientY;
    startTime = Date.now();
    currentX = 0;
    axisLocked = null;
  });

  listEl.addEventListener('pointermove', (event) => {
    if (!dragTarget || event.pointerId !== activePointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!axisLocked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisLocked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axisLocked === 'x') {
        dragTarget.dataset.dragging = 'true';
        try {
          dragTarget.setPointerCapture(event.pointerId);
        } catch {
          return;
        }
      } else {
        dragTarget = null;
        activePointerId = null;
        return;
      }
    }

    if (axisLocked === 'x') {
      if (dx > 0) {
        currentX = rubberband(dx, 120, 0.25);
      } else {
        const limit = -110;
        currentX =
          dx < limit ? limit - rubberband(Math.abs(dx - limit), 160, 0.4) : dx;
      }
      dragTarget.style.transform = `translateX(${currentX}px)`;
    }
  });

  const endSwipe = (event) => {
    cancelHold();
    if (!dragTarget || (event && event.pointerId !== activePointerId)) return;

    const card = dragTarget;
    const id = card.dataset.swipeId;
    const elapsed = Math.max(1, Date.now() - startTime);
    const velocity = Math.abs(currentX) / elapsed;

    card.dataset.dragging = 'false';
    dragTarget = null;
    activePointerId = null;
    axisLocked = null;

    if (currentX < -72 || (currentX < -28 && velocity > 0.35)) {
      card.style.transform = 'translateX(-105%)';
      handleDeleteExpense(id);
    } else {
      card.style.transform = 'translateX(0)';
    }
  };

  listEl.addEventListener('pointerup', endSwipe);
  listEl.addEventListener('pointercancel', endSwipe);

  listEl.addEventListener('keydown', (event) => {
    const btn = event.target.closest('.hold-delete-btn');
    if (!btn) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDeleteExpense(btn.dataset.deleteId);
    }
  });
}

function setupToastSwipeDismiss() {
  const toast = document.getElementById('undo-toast');
  if (!toast) return;

  let startY = 0;
  let startTime = 0;
  let dy = 0;
  let dragging = false;

  toast.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.toast-action')) return;
    dragging = true;
    startY = event.clientY;
    startTime = Date.now();
    dy = 0;
    try {
      toast.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
  });

  toast.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const rawDy = event.clientY - startY;
    dy = rawDy < 0 ? rubberband(rawDy, 60, 0.25) : rawDy;
    toast.style.transform = `translateY(${dy}px)`;
  });

  const finish = () => {
    if (!dragging) return;
    dragging = false;
    const elapsed = Math.max(1, Date.now() - startTime);
    const velocity = Math.abs(dy) / elapsed;
    if (dy > 32 || (dy > 10 && velocity > 0.11)) {
      toast.dataset.visible = 'false';
      toast.style.transform = '';
      state.lastDeleted = null;
    } else {
      toast.style.transform = '';
    }
  };

  toast.addEventListener('pointerup', finish);
  toast.addEventListener('pointercancel', finish);
}

function setupPrototypePicker() {
  const picker = document.querySelector('.proto-picker');
  const highlight = document.getElementById('picker-highlight');
  const variantButtons = [...document.querySelectorAll('[data-variant-btn]')];
  if (!picker || !highlight || variantButtons.length === 0) return;

  const moveHighlight = () => {
    const active = variantButtons.find((btn) => btn.hasAttribute('data-active')) || variantButtons[0];
    if (!active) return;
    highlight.style.width = `${active.offsetWidth}px`;
    highlight.style.transform = `translateX(${active.offsetLeft}px)`;
  };

  const setVariant = (variantName) => {
    state.variant = variantName;
    document.documentElement.dataset.variant = variantName;
    variantButtons.forEach((btn) => {
      const isMatch = btn.dataset.variantBtn === variantName;
      btn.toggleAttribute('data-active', isMatch);
      if (isMatch) {
        btn.setAttribute('aria-current', 'true');
      } else {
        btn.removeAttribute('aria-current');
      }
    });
    moveHighlight();
    requestAnimationFrame(updateClipFilterPosition);
  };

  variantButtons.forEach((btn) => {
    btn.addEventListener('click', () => setVariant(btn.dataset.variantBtn));
  });

  window.addEventListener('resize', () => {
    moveHighlight();
    updateClipFilterPosition();
  });

  document.addEventListener('keydown', (event) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const idx = parseInt(event.key, 10) - 1;
    if (idx >= 0 && idx < variantButtons.length) {
      setVariant(variantButtons[idx].dataset.variantBtn);
    }
  });

  requestAnimationFrame(() => {
    moveHighlight();
    requestAnimationFrame(() => picker.setAttribute('data-ready', ''));
  });
}

function morphSubmitButton() {
  const content = document.getElementById('submit-content');
  const iconEl = document.getElementById('submit-icon');
  const labelEl = document.getElementById('submit-label');
  if (!content || !iconEl || !labelEl) return;

  content.dataset.morphing = 'true';
  iconEl.innerHTML = renderIcon('check');
  labelEl.textContent = 'Gasto guardado';

  setTimeout(() => {
    content.dataset.morphing = 'false';
  }, 150);

  setTimeout(() => {
    content.dataset.morphing = 'true';
    iconEl.innerHTML = renderIcon('plus');
    labelEl.textContent = 'Guardar gasto';
    setTimeout(() => {
      content.dataset.morphing = 'false';
    }, 150);
  }, 1150);
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
  setupPrototypePicker();
  setupToastSwipeDismiss();

  window.addEventListener('online', updateNetworkBadge);
  window.addEventListener('offline', updateNetworkBadge);

  const form = document.getElementById('expense-form');
  const conceptInput = document.getElementById('concept');
  const amountInput = document.getElementById('amount');
  const categorySelect = document.getElementById('category');
  const categoryPills = document.getElementById('category-pills');
  const presetChips = document.getElementById('preset-chips');
  const denomRow = document.querySelector('.quick-denom-row');
  const errorEl = document.getElementById('form-error');
  const filterBar = document.getElementById('filter-bar');
  const expenseList = document.getElementById('expense-list');
  const themeBtn = document.getElementById('theme-toggle');
  const installBtn = document.getElementById('install-btn');
  const undoBtn = document.getElementById('toast-undo-btn');
  const modeLiveBtn = document.getElementById('mode-live-btn');
  const modeWorstBtn = document.getElementById('mode-worst-btn');

  denomRow?.addEventListener('click', (event) => {
    const btn = event.target.closest('.denom-key');
    if (!btn || !amountInput) return;
    if (btn.dataset.clearAmount === 'true') {
      amountInput.value = '';
      amountInput.focus();
      return;
    }
    const delta = Number(btn.dataset.addAmount) || 0;
    const current = Number(amountInput.value) || 0;
    amountInput.value = (current + delta).toFixed(2).replace(/\.00$/, '');
  });

  presetChips?.addEventListener('click', (event) => {
    const chip = event.target.closest('.preset-chip');
    if (!chip || !conceptInput) return;
    conceptInput.value = chip.dataset.preset || '';
    if (amountInput && !amountInput.value) {
      amountInput.focus();
    }
  });

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
    setupRowGesturesAndHoldDelete(expenseList);
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
        if (modeWorstBtn) {
          modeWorstBtn.dataset.stressActive = 'false';
          modeWorstBtn.textContent = 'Estrés UI';
        }
      }

      state.expenses = await getAllExpenses();
      if (conceptInput) conceptInput.value = '';
      if (amountInput) amountInput.value = '';
      morphSubmitButton();
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
    if (modeWorstBtn) {
      const isWorst = mode === 'worst';
      modeWorstBtn.dataset.stressActive = isWorst ? 'true' : 'false';
      modeWorstBtn.textContent = isWorst ? 'Datos reales' : 'Estrés UI';
    }
    renderAll();
  };

  modeLiveBtn?.addEventListener('click', () => setDatasetMode('live'));
  modeWorstBtn?.addEventListener('click', () =>
    setDatasetMode(state.datasetMode === 'worst' ? 'live' : 'worst')
  );

  await registerServiceWorker();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    bootstrapApp();
  }
}
