import { CATEGORIES, CATEGORY_MAP } from './icons.js';

const DB_NAME = 'mi_billetera_lite_db';
const DB_VERSION = 1;
const STORE_NAME = 'expenses';
const STORAGE_KEY = 'mi_billetera_lite_expenses';

let dbInstance = null;

function readMirror() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMirror(expenses) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    return;
  }
}

function sortExpensesDescending(expenses) {
  return [...expenses].sort((a, b) => {
    if (b.createdAt !== a.createdAt) {
      return b.createdAt - a.createdAt;
    }
    return String(b.id).localeCompare(String(a.id));
  });
}

export function initDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (typeof globalThis.indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getAllExpenses() {
  const db = await initDB();
  const mirror = readMirror();

  if (!db) {
    return sortExpensesDescending(mirror);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = Array.isArray(req.result) ? req.result : [];
        if (items.length === 0 && mirror.length > 0) {
          const seedTx = db.transaction(STORE_NAME, 'readwrite');
          const seedStore = seedTx.objectStore(STORE_NAME);
          for (const item of mirror) {
            seedStore.put(item);
          }
          resolve(sortExpensesDescending(mirror));
          return;
        }
        const sorted = sortExpensesDescending(items);
        writeMirror(sorted);
        resolve(sorted);
      };

      req.onerror = () => resolve(sortExpensesDescending(mirror));
    } catch {
      resolve(sortExpensesDescending(mirror));
    }
  });
}

export function normalizeExpenseInput({ concept, amount, category, createdAt, id }) {
  const trimmedConcept = String(concept ?? '').trim();
  if (!trimmedConcept) {
    throw new Error('Ingresa un concepto para el gasto.');
  }

  const parsedAmount = Number(String(amount).replace(',', '.'));
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Ingresa un monto numérico mayor a cero.');
  }

  const cents = Math.round(parsedAmount * 100);
  if (cents <= 0) {
    throw new Error('El monto mínimo permitido es 0.01.');
  }

  const validCategory = CATEGORY_MAP[category] ? category : 'Otros';
  const timestamp = Number.isFinite(createdAt) ? createdAt : Date.now();
  const expenseId =
    id ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `exp_${timestamp}_${Math.random().toString(36).slice(2, 9)}`);

  return {
    id: expenseId,
    concept: trimmedConcept.slice(0, 120),
    amount: cents / 100,
    category: validCategory,
    createdAt: timestamp,
  };
}

export async function addExpense(input) {
  const record = normalizeExpenseInput(input);
  const current = await getAllExpenses();
  const updated = sortExpensesDescending([record, ...current.filter((item) => item.id !== record.id)]);
  writeMirror(updated);

  const db = await initDB();
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  return record;
}

export async function restoreExpense(expense) {
  return addExpense(expense);
}

export async function deleteExpense(id) {
  const current = await getAllExpenses();
  const updated = current.filter((item) => item.id !== id);
  writeMirror(updated);

  const db = await initDB();
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  return updated;
}

export async function replaceAllExpenses(records) {
  const normalized = sortExpensesDescending(records.map((item) => normalizeExpenseInput(item)));
  writeMirror(normalized);

  const db = await initDB();
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        for (const item of normalized) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  return normalized;
}

export async function clearAllExpenses() {
  writeMirror([]);
  const db = await initDB();
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export function calculateTotals(expenses = []) {
  const byCategoryCents = Object.fromEntries(CATEGORIES.map((c) => [c.id, { cents: 0, count: 0 }]));
  let totalCents = 0;

  for (const item of expenses) {
    const cents = Math.round((Number(item.amount) || 0) * 100);
    totalCents += cents;
    const cat = byCategoryCents[item.category] ? item.category : 'Otros';
    byCategoryCents[cat].cents += cents;
    byCategoryCents[cat].count += 1;
  }

  const byCategory = {};
  for (const [id, data] of Object.entries(byCategoryCents)) {
    byCategory[id] = {
      amount: data.cents / 100,
      count: data.count,
      percentage: totalCents > 0 ? Number(((data.cents / totalCents) * 100).toFixed(1)) : 0,
    };
  }

  return {
    total: totalCents / 100,
    count: expenses.length,
    byCategory,
  };
}
