import {
  nextNumericId,
  parseBoolean,
  readRange,
  toNumber,
  writeRange,
} from './_sheets.js';

const COMPANHEIROS_SEED = [
  ['hugo', 'Hugo', 'true', '2026-04-03T00:00:00.000Z'],
  ['turco', 'Turco', 'true', '2026-04-03T00:00:00.000Z'],
  ['leandro-csa-guarulhos', 'Leandro CSA Garulho', 'true', '2026-04-03T00:00:00.000Z'],
];

const COMPANHEIRO_ID_ALIASES = {
  hu: 'hugo',
  hugo: 'hugo',
  tu: 'turco',
  turco: 'turco',
  le: 'leandro-csa-guarulhos',
  'leandro-csa-guarulhos': 'leandro-csa-guarulhos',
};

export function normalizeCompanheiroId(value) {
  const raw = value ? String(value).trim().toLowerCase() : '';
  if (!raw) return '';
  return COMPANHEIRO_ID_ALIASES[raw] || raw;
}

export async function loadMateriaisMap() {
  const rows = await readRange('materiais!A2:F');
  const map = new Map();
  for (const row of rows) {
    const id = row[0] ? String(row[0]).trim() : '';
    if (!id) continue;
    map.set(id, {
      id,
      nome: row[1] ? String(row[1]).trim() : '',
      emoji: row[2] ? String(row[2]) : '',
      preco: toNumber(row[3], 0),
      ativo: parseBoolean(row[4], true),
      estoque_minimo: toNumber(row[5], 0),
    });
  }
  return map;
}

export async function ensureCompanheirosSeed() {
  const existing = await readRange('companheiros!A2:D');
  if (!existing.length) {
    await writeRange('companheiros!A2:D', COMPANHEIROS_SEED);
    return COMPANHEIROS_SEED.map((row) => ({
      id: normalizeCompanheiroId(row[0]),
      nome: row[1],
      ativo: true,
      created_at: row[3],
    }));
  }

  return existing
    .map((row) => ({
      id: normalizeCompanheiroId(row[0]),
      nome: row[1] ? String(row[1]).trim() : '',
      ativo: parseBoolean(row[2], true),
      created_at: row[3] ? String(row[3]) : '',
    }))
    .filter((c) => c.id && c.nome);
}

export async function loadCompanheirosMap() {
  const list = await ensureCompanheirosSeed();
  const map = new Map();
  for (const c of list) map.set(c.id, c);
  return map;
}

export function normalizeEstoqueRow(row) {
  return {
    id: toNumber(row[0], 0),
    material_id: row[1] ? String(row[1]).trim() : '',
    tipo: row[2] ? String(row[2]).trim().toLowerCase() : '',
    quantidade: toNumber(row[3], 0),
    origem: row[4] ? String(row[4]) : '',
    created_at: row[5] ? String(row[5]) : '',
    companheiro_id: normalizeCompanheiroId(row[6]),
    destino_tipo: row[7] ? String(row[7]).trim().toLowerCase() : '',
  };
}

export async function loadEstoqueRows() {
  const rows = await readRange('estoque!A2:H');
  return rows.map(normalizeEstoqueRow).filter((r) => r.material_id && r.tipo);
}

function globalDelta(mov) {
  if (mov.tipo === 'entrada') return Math.abs(mov.quantidade);
  if (mov.tipo === 'ajuste') return mov.quantidade;
  if (mov.tipo === 'saida_pedido') return -Math.abs(mov.quantidade);
  if (mov.tipo === 'transferencia_companheiro') return -Math.abs(mov.quantidade);
  if (mov.tipo === 'venda_companheiro') return -Math.abs(mov.quantidade);
  return mov.quantidade;
}

function companionDelta(mov) {
  if (!mov.companheiro_id) return 0;
  if (mov.tipo === 'transferencia_companheiro') return Math.abs(mov.quantidade);
  if (mov.tipo === 'venda_companheiro') return -Math.abs(mov.quantidade);
  if (mov.tipo === 'saida_pedido') return -Math.abs(mov.quantidade);
  if (mov.tipo === 'ajuste') return mov.quantidade;
  return 0;
}

export function buildSaldos(estoqueRows) {
  const global = {};
  const companheiros = {};

  for (const mov of estoqueRows) {
    if (!global[mov.material_id]) global[mov.material_id] = 0;
    global[mov.material_id] += globalDelta(mov);

    if (mov.companheiro_id) {
      if (!companheiros[mov.companheiro_id]) companheiros[mov.companheiro_id] = {};
      if (!companheiros[mov.companheiro_id][mov.material_id]) companheiros[mov.companheiro_id][mov.material_id] = 0;
      companheiros[mov.companheiro_id][mov.material_id] += companionDelta(mov);
    }
  }

  return { global, companheiros };
}

export function materialSaldoGlobal(saldos, materialId) {
  return toNumber(saldos.global[materialId], 0);
}

export function materialSaldoCompanheiro(saldos, companheiroId, materialId) {
  return toNumber((saldos.companheiros[companheiroId] || {})[materialId], 0);
}

export async function nextEstoqueIdFromSheet() {
  const rows = await readRange('estoque!A2:A');
  return nextNumericId(rows, 0);
}

export async function nextFinanceiroIdFromSheet() {
  const rows = await readRange('financeiro!A2:A');
  return nextNumericId(rows, 0);
}
