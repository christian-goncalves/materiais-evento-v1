import {
  buildSaldos,
  loadCompanheirosMap,
  loadEstoqueRows,
  loadMateriaisMap,
  materialSaldoCompanheiro,
  materialSaldoGlobal,
  nextEstoqueIdFromSheet,
  nextFinanceiroIdFromSheet,
  normalizeCompanheiroId,
} from '../_inventory.js';
import { appendRows, nowIso, parseBody, sanitizeError } from '../_sheets.js';

function validate(body, materiais, companheiros) {
  const companheiroId = normalizeCompanheiroId(body.companheiro_id);
  const materialId = body.material_id ? String(body.material_id).trim() : '';
  const quantidade = Number(body.quantidade);

  if (!companheiroId) return 'companheiro_id obrigatorio';
  if (!materialId) return 'material_id obrigatorio';
  if (!Number.isInteger(quantidade) || quantidade <= 0) return 'quantidade invalida';
  if (!materiais.has(materialId)) return 'material_id invalido';
  if (!companheiros.has(companheiroId) || !companheiros.get(companheiroId).ativo) {
    return 'companheiro_id invalido';
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseBody(req);
    const [materiais, companheiros, estoqueRows] = await Promise.all([
      loadMateriaisMap(),
      loadCompanheirosMap(),
      loadEstoqueRows(),
    ]);

    const validationError = validate(body, materiais, companheiros);
    if (validationError) return res.status(400).json({ error: validationError });

    const companheiroId = normalizeCompanheiroId(body.companheiro_id);
    const materialId = String(body.material_id).trim();
    const quantidade = Number(body.quantidade);

    const saldos = buildSaldos(estoqueRows);
    const saldoCompanheiro = materialSaldoCompanheiro(saldos, companheiroId, materialId);
    if (saldoCompanheiro < quantidade) {
      return res.status(400).json({ error: 'Saldo do companheiro insuficiente' });
    }

    const saldoGlobal = materialSaldoGlobal(saldos, materialId);
    if (saldoGlobal < quantidade) {
      return res.status(400).json({ error: 'Estoque global insuficiente' });
    }

    const material = materiais.get(materialId);
    const valorUnitario = Number(body.valor_unitario ?? material.preco ?? 0);
    const valorTotal = quantidade * valorUnitario;
    const createdAt = nowIso();
    const origem = body.origem ? String(body.origem) : 'venda_companheiro';

    const [movimentoId, financeiroId] = await Promise.all([
      nextEstoqueIdFromSheet(),
      nextFinanceiroIdFromSheet(),
    ]);

    await appendRows('estoque!A2:H', [[
      movimentoId,
      materialId,
      'venda_companheiro',
      quantidade,
      origem,
      createdAt,
      companheiroId,
      'cliente_final',
    ]]);

    await appendRows('financeiro!A2:K', [[
      financeiroId,
      'receita_venda_companheiro',
      'estoque',
      movimentoId,
      companheiroId,
      materialId,
      quantidade,
      valorUnitario,
      valorTotal,
      'pendente',
      createdAt,
    ]]);

    return res.status(200).json({
      ok: true,
      movimento_id: movimentoId,
      financeiro_id: financeiroId,
      status_repasse: 'pendente',
    });
  } catch (err) {
    return res.status(500).json({ error: sanitizeError(err) });
  }
}
