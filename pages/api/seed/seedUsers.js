export default async function handler(req, res) {
  const expectedSecret = process.env.SECRET_SEED_TOKEN;

  const urlSecret = req.query.secret;

  if (urlSecret !== expectedSecret) {
    return res.status(401).json({
      ok: false,
      debug: { urlSecret, envSecret: expectedSecret }
    });
  }

  // Continue with seeding...
}
