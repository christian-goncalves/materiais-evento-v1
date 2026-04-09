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

const TIPOS_PERMITIDOS = new Set([
  'entrada',
  'ajuste',
  'transferencia_companheiro',
  'venda_companheiro',
]);
const DIRECOES_PERMITIDAS = new Set(['entrada', 'saida']);

function defaultOrigem(tipo) {
  if (tipo === 'entrada') return 'reposicao';
  if (tipo === 'ajuste') return 'ajuste_manual';
  if (tipo === 'transferencia_companheiro') return 'transferencia_manual';
  if (tipo === 'venda_companheiro') return 'venda_companheiro';
  return 'manual';
}

function defaultDestinoTipo(tipo) {
  if (tipo === 'transferencia_companheiro') return 'companheiro';
  if (tipo === 'venda_companheiro') return 'cliente_final';
  return '';
}

function resolveMovimento(body) {
  const direcaoRaw = body.tipo_movimento ? String(body.tipo_movimento).trim().toLowerCase() : '';
  const quantidadeBase = Number(body.quantidade);

  if (direcaoRaw && DIRECOES_PERMITIDAS.has(direcaoRaw)) {
    const absQtd = Math.abs(quantidadeBase);
    return {
      direcao: direcaoRaw,
      tipo: 'ajuste',
      quantidade: direcaoRaw === 'entrada' ? absQtd : -absQtd,
      origem: direcaoRaw === 'entrada' ? 'entrada_companheiro' : 'saida_companheiro',
      destinoTipo: 'companheiro',
      fromDirecao: true,
    };
  }

  const tipoRaw = body.tipo ? String(body.tipo).trim().toLowerCase() : '';
  if (tipoRaw && TIPOS_PERMITIDOS.has(tipoRaw)) {
    return {
      direcao: '',
      tipo: tipoRaw,
      quantidade: quantidadeBase,
      origem: '',
      destinoTipo: '',
      fromDirecao: false,
    };
  }

  return {
    direcao: '',
    tipo: '',
    quantidade: quantidadeBase,
    origem: '',
    destinoTipo: '',
    fromDirecao: false,
  };
}

function validarBody(body, materiais, companheiros, movimento, companheiroId) {
  const materialId = body.material_id ? String(body.material_id).trim() : '';
  const quantidadeOriginal = Number(body.quantidade);
  const quantidade = movimento.quantidade;
  const tipo = movimento.tipo;

  if (!materialId) return 'material_id obrigatorio';
  if (!materiais.has(materialId)) return 'material_id invalido';
  if (!tipo || !TIPOS_PERMITIDOS.has(tipo)) return 'tipo invalido';

  if (movimento.fromDirecao) {
    if (!movimento.direcao || !DIRECOES_PERMITIDAS.has(movimento.direcao)) return 'tipo_movimento invalido';
    if (!Number.isInteger(quantidadeOriginal) || quantidadeOriginal <= 0) return 'quantidade invalida';
    if (!companheiroId) return 'companheiro_id obrigatorio';
  }

  if (tipo === 'transferencia_companheiro' || tipo === 'venda_companheiro') {
    if (!companheiroId) return 'companheiro_id obrigatorio para saida';
  }

  if (companheiroId && (!companheiros.has(companheiroId) || !companheiros.get(companheiroId).ativo)) {
    return 'companheiro_id invalido';
  }

  if (tipo === 'ajuste') {
    if (!Number.isInteger(quantidade) || quantidade === 0) return 'quantidade invalida';
  } else if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return 'quantidade invalida';
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

    const movimento = resolveMovimento(body);
    const tipo = movimento.tipo;
    const companheiroId = normalizeCompanheiroId(body.companheiro_id);
    const erroValidacao = validarBody(body, materiais, companheiros, movimento, companheiroId);
    if (erroValidacao) return res.status(400).json({ error: erroValidacao });

    const materialId = String(body.material_id).trim();
    const quantidade = movimento.quantidade;
    const origem = body.origem
      ? String(body.origem).trim()
      : (movimento.fromDirecao ? movimento.origem : defaultOrigem(tipo));
    const destinoTipo = body.destino_tipo
      ? String(body.destino_tipo).trim()
      : (movimento.fromDirecao ? movimento.destinoTipo : defaultDestinoTipo(tipo));
    const createdAt = nowIso();
    const absQuantidade = Math.abs(quantidade);

    const saldos = buildSaldos(estoqueRows);
    if (tipo === 'transferencia_companheiro' || tipo === 'venda_companheiro') {
      const saldoGlobal = materialSaldoGlobal(saldos, materialId);
      if (saldoGlobal < absQuantidade) {
        return res.status(400).json({ error: 'Estoque global insuficiente' });
      }
    }

    if (tipo === 'ajuste' && quantidade < 0) {
      const saldoGlobal = materialSaldoGlobal(saldos, materialId);
      if (saldoGlobal < absQuantidade) {
        return res.status(400).json({ error: 'Estoque global insuficiente' });
      }
      if (companheiroId) {
        const saldoCompanheiro = materialSaldoCompanheiro(saldos, companheiroId, materialId);
        if (saldoCompanheiro < absQuantidade) {
          return res.status(400).json({ error: 'Saldo do companheiro insuficiente' });
        }
      }
    }

    if (tipo === 'venda_companheiro' && companheiroId) {
      const saldoCompanheiro = materialSaldoCompanheiro(saldos, companheiroId, materialId);
      if (saldoCompanheiro < absQuantidade) {
        return res.status(400).json({ error: 'Saldo do companheiro insuficiente' });
      }
    }

    const movimentoId = await nextEstoqueIdFromSheet();
    await appendRows('estoque!A2:H', [[
      movimentoId,
      materialId,
      tipo,
      quantidade,
      origem,
      createdAt,
      companheiroId,
      destinoTipo,
    ]]);

    if (tipo !== 'venda_companheiro') {
      return res.status(200).json({
        ok: true,
        movimento: {
          id: movimentoId,
          material_id: materialId,
          tipo,
          quantidade,
          origem,
          created_at: createdAt,
          companheiro_id: companheiroId,
          destino_tipo: destinoTipo,
        },
      });
    }

    const material = materiais.get(materialId);
    const valorUnitario = Number(body.valor_unitario ?? material.preco ?? 0);
    const valorTotal = absQuantidade * valorUnitario;
    const financeiroId = await nextFinanceiroIdFromSheet();
    await appendRows('financeiro!A2:K', [[
      financeiroId,
      'receita_venda_companheiro',
      'estoque',
      movimentoId,
      companheiroId,
      materialId,
      absQuantidade,
      valorUnitario,
      valorTotal,
      'pendente',
      createdAt,
    ]]);

    return res.status(200).json({
      ok: true,
      movimento: {
        id: movimentoId,
        material_id: materialId,
        tipo,
        quantidade,
        origem,
        created_at: createdAt,
        companheiro_id: companheiroId,
        destino_tipo: destinoTipo,
      },
      financeiro: {
        id: financeiroId,
        status_repasse: 'pendente',
      },
    });
  } catch (err) {
    return res.status(500).json({ error: sanitizeError(err) });
  }
}
