function requireAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ error: 'غير مصرح - تحتاج دخول الأدمن' });
  }
  next();
}

module.exports = { requireAdmin };