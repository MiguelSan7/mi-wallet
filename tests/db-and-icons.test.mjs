import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

globalThis.localStorage = createMemoryStorage();

test('icons.js define las 5 categorías del PDF con íconos SVG limpios y cero emojis', async () => {
  const rawSource = fs.readFileSync(path.join(process.cwd(), 'icons.js'), 'utf8');
  assert.equal(EMOJI_REGEX.test(rawSource), false, 'icons.js no debe contener ningún emoji');

  const { CATEGORIES, CATEGORY_MAP, ICONS, renderIcon } = await import('../icons.js');

  const expectedIds = ['Comida', 'Transporte', 'Servicios', 'Ocio', 'Otros'];
  assert.deepEqual(
    CATEGORIES.map((c) => c.id),
    expectedIds
  );

  for (const id of expectedIds) {
    assert.ok(CATEGORY_MAP[id], `Debe existir configuración para ${id}`);
    const svg = renderIcon(CATEGORY_MAP[id].icon);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), `Ícono de ${id} debe ser un SVG válido`);
    assert.equal(EMOJI_REGEX.test(svg), false);
  }

  for (const [key, svgBody] of Object.entries(ICONS)) {
    const rendered = renderIcon(key);
    assert.ok(rendered.includes('<svg'), `renderIcon(${key}) debe devolver un elemento <svg>`);
    assert.ok(svgBody.length > 10, `El ícono ${key} no debe estar vacío`);
  }
});

test('db.js registra, persiste, ordena del más reciente al más antiguo y suma sin errores de punto flotante', async () => {
  globalThis.localStorage.clear();
  const {
    initDB,
    addExpense,
    getAllExpenses,
    deleteExpense,
    restoreExpense,
    clearAllExpenses,
    calculateTotals,
  } = await import('../db.js');

  await initDB();
  await clearAllExpenses();

  const first = await addExpense({
    concept: 'Café de olla',
    amount: 45.5,
    category: 'Comida',
    createdAt: 1700000001000,
  });

  const second = await addExpense({
    concept: 'Taxis',
    amount: 150,
    category: 'Transporte',
    createdAt: 1700000005000,
  });

  assert.equal(first.concept, 'Café de olla');
  assert.equal(second.amount, 150);

  const list = await getAllExpenses();
  assert.equal(list.length, 2);
  assert.equal(list[0].concept, 'Taxis', 'El más reciente debe ir primero');
  assert.equal(list[1].concept, 'Café de olla', 'El más antiguo debe ir después');

  const summary = calculateTotals(list);
  assert.equal(summary.total, 195.5);
  assert.equal(summary.count, 2);
  assert.equal(summary.byCategory.Transporte.amount, 150);
  assert.equal(summary.byCategory.Comida.amount, 45.5);

  await deleteExpense(second.id);
  const afterDelete = await getAllExpenses();
  assert.equal(afterDelete.length, 1);
  assert.equal(afterDelete[0].id, first.id);

  await restoreExpense(second);
  const afterRestore = await getAllExpenses();
  assert.equal(afterRestore.length, 2);
  assert.equal(afterRestore[0].id, second.id);
});
