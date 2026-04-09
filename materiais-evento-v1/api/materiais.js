import { parseBoolean, readRange, sanitizeError, toNumber } from './_sheets.js';

function rowToMaterial(row) {
  const [id, nome, emoji, preco, ativo, estoqueMinimo] = row;
  if (!id || !nome) return null;
  return {
    id: String(id).trim(),
    nome: String(nome).trim(),
    emoji: emoji ? String(emoji) : '',
    preco: toNumber(preco, 0),
    ativo: parseBoolean(ativo, true),
    estoque_minimo: toNumber(estoqueMinimo, 0),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rows = await readRange('materiais!A2:F');
    const materiais = rows.map(rowToMaterial).filter(Boolean);
    return res.status(200).json(materiais);
  } catch (err) {
    return res.status(500).json({ error: sanitizeError(err) });
  }
}
