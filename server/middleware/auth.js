import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  const jwtSecret = process.env.JWT_SECRET;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token" });
  }

  if (!jwtSecret) {
    return res.status(500).json({ message: "Server auth configuration error" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = {
      id: decoded.id || decoded._id,
      role: decoded.role || "customer",
      email: decoded.email,
      emailVerified: Boolean(decoded.emailVerified),
    };

    if (!req.user.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
