export default async function handler(_req, res) {
  const url = 'https://registry.npmjs.org/@fontsource-variable%2fbricolage-grotesque/5.3.0';
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const data = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(response.status).json({
      name: data.name,
      version: data.version,
      license: data.license,
      dist: data.dist,
      funding: data.funding,
    });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
