export default async function handler(req, res) {
  const urlSecret = req.query.secret;
  const envSecret = process.env.SECRET_SEED_TOKEN;

  return res.status(200).json({
    ok: false,
    debug: {
      urlSecret,
      envSecret
    }
  });
}
