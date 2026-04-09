import {
  buildSaldos,
  loadCompanheirosMap,
  loadEstoqueRows,
  materialSaldoCompanheiro,
  normalizeCompanheiroId,
} from './_inventory.js';
import {
  clearRanges,
  normalizeDateToBr,
  normalizePago,
  nowIso,
  parseBody,
  readRange,
  sanitizeError,
  toNumber,
  writeRange,
} from './_sheets.js';

function buildCompanheiroMapFromSaidas(estoqueRows) {
  const map = new Map();
  for (const row of estoqueRows) {
    const tipo = row[2] ? String(row[2]).trim().toLowerCase() : '';
    if (tipo !== 'saida_pedido') continue;

    const materialId = row[1] ? String(row[1]).trim() : '';
    const origem = row[4] ? String(row[4]).trim() : '';
    const companheiroId = normalizeCompanheiroId(row[6]);
    if (!materialId || !origem || !origem.startsWith('pedido:')) continue;

    const pedidoId = toNumber(origem.slice('pedido:'.length), NaN);
    if (!Number.isFinite(pedidoId)) continue;

    if (!map.has(pedidoId)) map.set(pedidoId, {});
    if (companheiroId) map.get(pedidoId)[materialId] = companheiroId;
  }
  return map;
}

function buildPedidosFromSheets(pedidosRows, itensRows, estoqueRows) {
  const itemsByPedidoId = new Map();
  for (const row of itensRows) {
    const [, pedidoIdRaw, materialIdRaw, quantidadeRaw] = row;
    const pedidoId = toNumber(pedidoIdRaw, NaN);
    const materialId = materialIdRaw ? String(materialIdRaw).trim() : '';
    const quantidade = toNumber(quantidadeRaw, 0);
    if (!Number.isFinite(pedidoId) || !materialId || quantidade <= 0) continue;
    if (!itemsByPedidoId.has(pedidoId)) itemsByPedidoId.set(pedidoId, {});
    itemsByPedidoId.get(pedidoId)[materialId] = quantidade;
  }

  const companheirosByPedidoId = buildCompanheiroMapFromSaidas(estoqueRows);
  const pedidos = [];
  for (const row of pedidosRows) {
    const [idRaw, nomeRaw, telefoneRaw, statusPagamentoRaw, createdAtRaw] = row;
    const id = toNumber(idRaw, NaN);
    const nome = nomeRaw ? String(nomeRaw).trim() : '';
    if (!Number.isFinite(id) || !nome) continue;
    pedidos.push({
      id,
      nome,
      data: normalizeDateToBr(createdAtRaw),
      tel: telefoneRaw ? String(telefoneRaw) : '',
      itens: itemsByPedidoId.get(id) || {},
      companheiro_por_item: companheirosByPedidoId.get(id) || {},
      pago: normalizePago(statusPagamentoRaw) === 'Sim' ? 'Sim' : 'Não',
      pagData: '',
    });
  }

  return { pedidos };
}

async function loadMaterialIds() {
  const rows = await readRange('materiais!A2:A');
  return new Set(
    rows
      .map((r) => (r[0] ? String(r[0]).trim() : ''))
      .filter(Boolean)
  );
}

async function loadExistingPedidoIds() {
  const rows = await readRange('pedidos!A2:A');
  return new Set(rows.map((r) => toNumber(r[0], NaN)).filter(Number.isFinite));
}

function parseCompanheiroPorItem(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const parsed = {};
  for (const [materialId, companheiroIdRaw] of Object.entries(raw)) {
    const companheiroId = normalizeCompanheiroId(companheiroIdRaw);
    if (!companheiroId) continue;
    parsed[String(materialId).trim()] = companheiroId;
  }
  return parsed;
}

function validatePedidosPayload(payload, materialIds, companheiros, existingPedidoIds) {
  if (!payload || !Array.isArray(payload.pedidos)) return 'Campo "pedidos" deve ser array';

  for (const p of payload.pedidos) {
    const pedidoId = Number(p.id);
    if (!Number.isFinite(pedidoId)) return 'Pedido com id invalido';
    if (!p.nome || !String(p.nome).trim()) return 'Pedido com nome obrigatorio';
    if (!p.itens || typeof p.itens !== 'object' || Array.isArray(p.itens)) {
      return 'Pedido com itens invalidos';
    }

    const pago = String(p.pago || '');
    if (!['Sim', 'Não', 'Nao'].includes(pago)) return 'Pedido com status de pagamento invalido';

    const companheiroPorItem = parseCompanheiroPorItem(p.companheiro_por_item);
    const isLegacy = existingPedidoIds.has(pedidoId);

    for (const [materialId, quantidade] of Object.entries(p.itens)) {
      if (!materialIds.has(materialId)) return `Material invalido: ${materialId}`;
      if (!Number.isInteger(Number(quantidade)) || Number(quantidade) <= 0) {
        return `Quantidade invalida para material: ${materialId}`;
      }
      const companheiroId = companheiroPorItem[materialId] || '';
      if (!companheiroId) {
        if (!isLegacy) return `companheiro_id obrigatorio para material: ${materialId}`;
        continue;
      }
      if (!companheiros.has(companheiroId) || !companheiros.get(companheiroId).ativo) {
        return `companheiro_id invalido para material: ${materialId}`;
      }
    }
  }

  return null;
}

function mapPedidosRows(pedidos) {
  return pedidos.map((p) => [
    Number(p.id),
    String(p.nome || '').trim(),
    String(p.tel || '').trim(),
    normalizePago(p.pago),
    p.data ? normalizeDateToBr(p.data) : normalizeDateToBr(nowIso()),
  ]);
}

function mapPedidoItensRows(pedidos) {
  const rows = [];
  let itemId = 1;
  for (const p of pedidos) {
    const pedidoId = Number(p.id);
    for (const [materialId, quantidadeRaw] of Object.entries(p.itens || {})) {
      const quantidade = Number(quantidadeRaw);
      if (!Number.isFinite(quantidade) || quantidade <= 0) continue;
      rows.push([itemId++, pedidoId, materialId, quantidade, '']);
    }
  }
  return rows;
}

function validarSaldoCompanheiroParaPedidos(pedidos, estoqueRows) {
  const semSaidaPedido = estoqueRows.filter((row) => row.tipo !== 'saida_pedido');
  const saldos = buildSaldos(semSaidaPedido);
  const consumo = new Map();

  for (const p of pedidos) {
    const companheiroPorItem = parseCompanheiroPorItem(p.companheiro_por_item);
    for (const [materialId, quantidadeRaw] of Object.entries(p.itens || {})) {
      const companheiroId = companheiroPorItem[materialId] || '';
      if (!companheiroId) continue;
      const quantidade = Number(quantidadeRaw);
      if (!Number.isFinite(quantidade) || quantidade <= 0) continue;
      const key = `${companheiroId}::${materialId}`;
      consumo.set(key, (consumo.get(key) || 0) + quantidade);
    }
  }

  for (const [key, quantidade] of consumo.entries()) {
    const [companheiroId, materialId] = key.split('::');
    const saldoCompanheiro = materialSaldoCompanheiro(saldos, companheiroId, materialId);
    if (saldoCompanheiro < quantidade) {
      return `Saldo insuficiente para ${companheiroId} em ${materialId}`;
    }
  }

  return null;
}

function rebuildEstoqueRows(pedidos, existingEstoqueRows) {
  const existing = existingEstoqueRows.map((row) => [
    row.id,
    row.material_id,
    row.tipo,
    row.quantidade,
    row.origem,
    row.created_at,
    row.companheiro_id,
    row.destino_tipo,
  ]);
  const kept = existing.filter((row) => {
    const tipo = row[2] ? String(row[2]).trim().toLowerCase() : '';
    return tipo !== 'saida_pedido';
  });

  let nextId = 1;
  for (const row of kept) {
    nextId = Math.max(nextId, toNumber(row[0], 0) + 1);
  }

  const saidas = [];
  const createdAt = nowIso();
  for (const p of pedidos) {
    const companheiroPorItem = parseCompanheiroPorItem(p.companheiro_por_item);
    for (const [materialId, quantidadeRaw] of Object.entries(p.itens || {})) {
      const quantidade = Number(quantidadeRaw);
      if (!Number.isFinite(quantidade) || quantidade <= 0) continue;
      const companheiroId = companheiroPorItem[materialId] || '';
      saidas.push([nextId++, materialId, 'saida_pedido', quantidade, `pedido:${p.id}`, createdAt, companheiroId, 'pedido']);
    }
  }

  return [...kept, ...saidas];
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const [pedidosRows, itensRows, estoqueRows] = await Promise.all([
        readRange('pedidos!A2:E'),
        readRange('pedido_itens!A2:E'),
        readRange('estoque!A2:H'),
      ]);
      return res.status(200).json(buildPedidosFromSheets(pedidosRows, itensRows, estoqueRows));
    } catch (err) {
      return res.status(500).json({ error: sanitizeError(err) });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = parseBody(req);
      const [materialIds, companheiros, existingPedidoIds, estoqueRows] = await Promise.all([
        loadMaterialIds(),
        loadCompanheirosMap(),
        loadExistingPedidoIds(),
        loadEstoqueRows(),
      ]);

      const validationError = validatePedidosPayload(body, materialIds, companheiros, existingPedidoIds);
      if (validationError) return res.status(400).json({ error: validationError });

      const pedidos = body.pedidos;
      const erroSaldo = validarSaldoCompanheiroParaPedidos(pedidos, estoqueRows);
      if (erroSaldo) return res.status(400).json({ error: erroSaldo });

      const pedidosRows = mapPedidosRows(pedidos);
      const pedidoItensRows = mapPedidoItensRows(pedidos);
      const estoqueRowsMerged = rebuildEstoqueRows(pedidos, estoqueRows);

      await clearRanges(['pedidos!A2:E', 'pedido_itens!A2:E', 'estoque!A2:H']);

      if (pedidosRows.length) await writeRange('pedidos!A2:E', pedidosRows);
      if (pedidoItensRows.length) await writeRange('pedido_itens!A2:E', pedidoItensRows);
      if (estoqueRowsMerged.length) await writeRange('estoque!A2:H', estoqueRowsMerged);

      return res.status(200).json({ ok: true, updated_at: nowIso() });
    } catch (err) {
      return res.status(500).json({ error: sanitizeError(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
