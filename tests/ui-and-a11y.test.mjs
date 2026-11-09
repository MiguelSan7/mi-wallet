import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

test('index.html cumple con requerimientos funcionales del PDF y reglas mobile-native', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  assert.equal(EMOJI_REGEX.test(html), false, 'index.html no debe contener emojis');
  assert.ok(html.includes('rel="manifest"'), 'Debe enlazar manifest.json');
  assert.ok(html.includes('viewport-fit=cover'), 'Debe incluir viewport-fit=cover');
  assert.equal(
    /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(html),
    false,
    'Nunca debe deshabilitar el zoom del usuario (mobile-native rule 4)'
  );

  const themeColorMatches = html.match(/<meta\s+name="theme-color"/g) || [];
  assert.ok(themeColorMatches.length >= 2, 'Debe incluir theme-color para light y dark scheme');

  for (const cat of ['Comida', 'Transporte', 'Servicios', 'Ocio', 'Otros']) {
    assert.ok(html.includes(`value="${cat}"`), `El selector debe incluir la categoría ${cat}`);
  }

  assert.ok(html.includes('inputmode="decimal"'), 'El campo de monto debe usar inputmode="decimal"');
  assert.ok(html.includes('id="total-amount"'), 'Debe existir el indicador visual del totalizador');
  assert.ok(html.includes('id="expense-form"'), 'Debe existir el formulario de registro');
  assert.ok(html.includes('id="expense-list"'), 'Debe existir la lista de historial de gastos');
});

test('styles.css cumple con las 10 reglas de review-animations, emil-design-eng, mobile-native y break-ui', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

  assert.equal(EMOJI_REGEX.test(css), false, 'styles.css no debe contener emojis');
  assert.equal(/transition\s*:[^;]*\ball\b/i.test(css), false, 'Prohibido usar transition: all');
  assert.equal(/scale\(\s*0\s*\)/i.test(css), false, 'Prohibido animar desde scale(0)');
  assert.equal(
    /:\s*[^;]*\bease-in\b(?!-out)/i.test(css),
    false,
    'Prohibido usar ease-in en elementos de interfaz'
  );

  assert.ok(
    css.includes('cubic-bezier(0.23, 1, 0.32, 1)'),
    'Debe definir la curva --ease-out de Emil Kowalski'
  );
  assert.ok(
    css.includes('@media (hover: hover) and (pointer: fine)'),
    'Los estados :hover deben estar protegidos por @media (hover: hover) and (pointer: fine)'
  );
  assert.ok(
    css.includes('@media (prefers-reduced-motion: reduce)'),
    'Debe incluir soporte para prefers-reduced-motion: reduce'
  );
  assert.ok(
    css.includes('-webkit-tap-highlight-color: transparent'),
    'Debe eliminar el flash gris de tap en móvil'
  );
  assert.ok(
    css.includes('touch-action: manipulation'),
    'Debe incluir touch-action: manipulation en controles'
  );
  assert.ok(
    css.includes('tabular-nums'),
    'Debe usar font-variant-numeric: tabular-nums para montos y números'
  );
  assert.ok(
    css.includes('clip-path: inset('),
    'Debe implementar hold-to-delete con clip-path: inset()'
  );
});

test('app.js no contiene emojis y expone las utilidades de formateo y datasets de break-ui', async () => {
  const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  assert.equal(EMOJI_REGEX.test(js), false, 'app.js no debe contener emojis');

  const { formatCurrency, WORST_CASE_EXPENSES } = await import('../app.js');
  assert.equal(typeof formatCurrency, 'function');
  assert.ok(formatCurrency(150).includes('150.00'));
  assert.ok(Array.isArray(WORST_CASE_EXPENSES) && WORST_CASE_EXPENSES.length >= 4);
});
