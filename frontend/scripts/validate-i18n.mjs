#!/usr/bin/env node
/**
 * validate-i18n.mjs
 *
 * Carga cada JSON de src/assets/i18n/*.json y verifica que:
 *   1) Sea JSON parseable.
 *   2) No contenga U+FFFD (carácter de reemplazo, síntoma típico de
 *      mojibake cuando un archivo UTF-8 se leyó como cp1252 o latin1).
 *   3) No contenga bytes de control no imprimibles (0x00-0x08, 0x0B-0x1F, 0x7F).
 *
 * Sale con código 0 si todo OK, código 1 si encuentra algún problema.
 *
 * Uso:  node scripts/validate-i18n.mjs
 *       npm run validate:i18n
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CANDIDATES = ['src/assets/i18n', 'frontend/src/assets/i18n'];
const I18N_DIR = CANDIDATES.find((c) => existsSync(c)) ?? CANDIDATES[0];
const ALLOWED = /\.(json)$/i;

const fail = (msg) => {
  console.error(`\u2717 ${msg}`);
  return false;
};
const ok = (msg) => {
  console.log(`\u2713 ${msg}`);
  return true;
};

const findJson = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      out.push(...findJson(p));
    } else if (ALLOWED.test(entry)) {
      out.push(p);
    }
  }
  return out;
};

const files = findJson(I18N_DIR);
if (files.length === 0) {
  console.error(`No i18n JSON files found under ${I18N_DIR}`);
  process.exit(2);
}

let allOk = true;
for (const file of files) {
  const raw = readFileSync(file, 'utf8');

  if (raw.includes('\uFFFD')) {
    allOk = false;
    if (!fail(`${file}: contiene U+FFFD (replacement char) — encoding probablemente corrupto (UTF-8 leido como cp1252/latin1). Regenera con Set-Content -Encoding utf8NoBOM.`)) {}
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    allOk = false;
    if (!fail(`${file}: JSON inválido — ${e.message}`)) {}
    continue;
  }

  const walk = (node, path) => {
    if (typeof node === 'string') {
      for (let i = 0; i < node.length; i++) {
        const c = node.charCodeAt(i);
        if (
          (c >= 0x00 && c <= 0x08) ||
          (c >= 0x0b && c <= 0x1f) ||
          c === 0x7f
        ) {
          allOk = false;
          if (!fail(`${file} :: ${path.join('.')} :: byte de control 0x${c.toString(16)}`)) {}
          return;
        }
      }
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        walk(v, [...path, k]);
      }
    }
  };
  walk(parsed, []);

  if (allOk) ok(file);
}

if (!allOk) {
  console.error('\nvalidate:i18n FAILED');
  process.exit(1);
}
console.log('\nvalidate:i18n OK');
