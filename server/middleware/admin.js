import User from "../models/User.js";

export default async function admin(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role === "admin") {
    return next();
  }

  const user = await User.findById(req.user.id).select("role");
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  req.user.role = user.role;
  next();
}
