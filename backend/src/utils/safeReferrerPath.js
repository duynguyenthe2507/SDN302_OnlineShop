module.exports = function safeReferrerPath(req, fallback = '/') {
  const referrer = req.get('Referrer');
  if (!referrer) return fallback;

  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const target = new URL(referrer, origin);
    if (target.origin !== origin) return fallback;
    return `${target.pathname}${target.search}`;
  } catch {
    return fallback;
  }
};
