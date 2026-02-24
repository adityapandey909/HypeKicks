import User from "../models/User.js";

export default function verifiedEmail(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.emailVerified) {
    return next();
  }

  return User.findById(req.user.id)
    .select("emailVerified")
    .then((user) => {
      if (!user?.emailVerified) {
        return res.status(403).json({
          message: "Please verify your email before continuing",
        });
      }

      req.user.emailVerified = true;
      return next();
    })
    .catch(() =>
      res.status(500).json({ message: "Failed to validate email verification status" })
    );
}
