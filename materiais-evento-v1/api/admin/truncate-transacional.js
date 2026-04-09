import { clearRanges, readRange, sanitizeError } from '../_sheets.js';

const RANGES = {
  pedidos: 'pedidos!A2:E',
  pedido_itens: 'pedido_itens!A2:E',
  estoque: 'estoque!A2:H',
  financeiro: 'financeiro!A2:K',
};

function countNonEmptyRows(rows) {
  return (rows || []).filter((row) =>
    (row || []).some((cell) => String(cell ?? '').trim() !== '')
  ).length;
}

async function buildSnapshot() {
  const [pedidos, pedidoItens, estoque, financeiro] = await Promise.all([
    readRange(RANGES.pedidos),
    readRange(RANGES.pedido_itens),
    readRange(RANGES.estoque),
    readRange(RANGES.financeiro),
  ]);

  const saidaPedidoCount = estoque.filter((row) => String(row[2] || '').trim().toLowerCase() === 'saida_pedido').length;

  return {
    pedidos: countNonEmptyRows(pedidos),
    pedido_itens: countNonEmptyRows(pedidoItens),
    estoque: countNonEmptyRows(estoque),
    estoque_saida_pedido: saidaPedidoCount,
    financeiro: countNonEmptyRows(financeiro),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dryRun = String(req.query?.dry_run || '').toLowerCase() === 'true';
    const before = await buildSnapshot();

    if (!dryRun) {
      await clearRanges(Object.values(RANGES));
    }

    const after = await buildSnapshot();
    return res.status(200).json({
      ok: true,
      dry_run: dryRun,
      before,
      after,
      ranges: Object.values(RANGES),
    });
  } catch (err) {
    return res.status(500).json({ error: sanitizeError(err) });
  }
}
