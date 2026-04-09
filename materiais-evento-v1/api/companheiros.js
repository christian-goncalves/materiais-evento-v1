import { ensureCompanheirosSeed } from './_inventory.js';
import { sanitizeError } from './_sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const companheiros = await ensureCompanheirosSeed();
    return res.status(200).json({ companheiros });
  } catch (err) {
    return res.status(500).json({ error: sanitizeError(err) });
  }
}
