import {
  buildSaldos,
  loadCompanheirosMap,
  loadEstoqueRows,
  loadMateriaisMap,
} from '../_inventory.js';
import { sanitizeError } from '../_sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const companheiroId = req.query?.companheiro_id ? String(req.query.companheiro_id).trim() : '';
    const [materiais, companheirosMap, estoqueRows] = await Promise.all([
      loadMateriaisMap(),
      loadCompanheirosMap(),
      loadEstoqueRows(),
    ]);

    const saldos = buildSaldos(estoqueRows);
    const materiaisAtivos = Array.from(materiais.values()).map((m) => m.id);

    const global = materiaisAtivos.map((materialId) => ({
      material_id: materialId,
      saldo: Number(saldos.global[materialId] || 0),
    }));

    const companheiros = Array.from(companheirosMap.values())
      .filter((c) => !companheiroId || c.id === companheiroId)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        ativo: c.ativo,
        saldos: materiaisAtivos.map((materialId) => ({
          material_id: materialId,
          saldo: Number((saldos.companheiros[c.id] || {})[materialId] || 0),
        })),
      }));

    return res.status(200).json({ global, companheiros });
  } catch (err) {
    return res.status(500).json({ error: sanitizeError(err) });
  }
}
