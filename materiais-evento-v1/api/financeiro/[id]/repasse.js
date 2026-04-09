import { readRange, sanitizeError, writeRange } from '../../_sheets.js';

function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = parseId(req.query?.id);
    if (!id) return res.status(400).json({ error: 'id invalido' });

    const rows = await readRange('financeiro!A2:K');
    const index = rows.findIndex((row) => Number(row[0]) === id);
    if (index < 0) return res.status(404).json({ error: 'Lancamento financeiro nao encontrado' });

    const row = rows[index];
    row[9] = 'repassado';
    const sheetRowNumber = index + 2;
    await writeRange(`financeiro!A${sheetRowNumber}:K${sheetRowNumber}`, [row]);

    return res.status(200).json({ ok: true, id, status_repasse: 'repassado' });
  } catch (err) {
    return res.status(500).json({ error: sanitizeError(err) });
  }
}
