export default async function handler(req, res) {
  const raw = Array.isArray(req.query?.domain) ? req.query.domain[0] : req.query?.domain;
  const domain = String(raw || '').trim().toLowerCase();

  if (!/^(?:[a-z0-9-]+\.)*[a-z0-9-]+\.vercel\.app$/.test(domain) && domain !== 'www.atmosferastudio.cl') {
    res.status(400).json({ error: 'Unsupported audit domain' });
    return;
  }

  try {
    const upstream = await fetch(`https://page-speed.dev/api/run/${encodeURIComponent(domain)}`, {
      headers: { accept: 'application/json', 'user-agent': 'Atmosfera AB performance audit' },
    });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(upstream.status).json({ domain, upstreamStatus: upstream.status, data });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
