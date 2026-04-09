import { readRange, sanitizeError, toNumber } from './_sheets.js';

function mapFinanceiroRow(row) {
  return {
    id: toNumber(row[0], 0),
    tipo: row[1] ? String(row[1]) : '',
    origem_tipo: row[2] ? String(row[2]) : '',
    origem_id: toNumber(row[3], 0),
    companheiro_id: row[4] ? String(row[4]).trim() : '',
    material_id: row[5] ? String(row[5]).trim() : '',
    quantidade: toNumber(row[6], 0),
    valor_unitario: toNumber(row[7], 0),
    valor_total: toNumber(row[8], 0),
    status_repasse: row[9] ? String(row[9]).trim().toLowerCase() : '',
    created_at: row[10] ? String(row[10]) : '',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const companheiroId = req.query?.companheiro_id ? String(req.query.companheiro_id).trim() : '';
    const statusRepasse = req.query?.status_repasse ? String(req.query.status_repasse).trim().toLowerCase() : '';
    const rows = await readRange('financeiro!A2:K');
    const itens = rows.map(mapFinanceiroRow).filter((item) => item.id > 0);

    const filtered = itens.filter((item) => {
      if (companheiroId && item.companheiro_id !== companheiroId) return false;
      if (statusRepasse && item.status_repasse !== statusRepasse) return false;
      return true;
    });

    return res.status(200).json({ financeiro: filtered });
  } catch (err) {
    return res.status(500).json({ error: sanitizeError(err) });
  }
}
