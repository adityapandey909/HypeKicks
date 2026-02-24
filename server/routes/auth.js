import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import { buildTokenExpiry, generateRandomToken, hashToken } from "../utils/token.js";
import { isValidEmail, normalizeEmail, sanitizeText, validatePassword } from "../utils/validators.js";
import {
  buildPasswordResetEmail,
  buildVerificationEmail,
  sendEmail,
} from "../utils/email.js";

const router = express.Router();
const isProd = process.env.NODE_ENV === "production";

function createAuthToken(user) {
  return jwt.sign(
    {
      id: String(user._id),
      role: user.role,
      email: user.email,
      emailVerified: user.emailVerified,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const cleanName = sanitizeText(name);
    const cleanEmail = normalizeEmail(email);

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const exists = await User.findOne({ email: cleanEmail });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(verificationToken);
    const shouldBeAdmin = (await User.countDocuments()) === 0;

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashed,
      role: shouldBeAdmin ? "admin" : "customer",
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpiresAt: buildTokenExpiry(60 * 24),
    });

    const token = createAuthToken(user);
    const verifyLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${verificationToken}`;
    const verificationEmail = buildVerificationEmail({
      name: user.name,
      verifyLink,
    });
    const emailResult = await sendEmail({
      to: user.email,
      ...verificationEmail,
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: serializeUser(user),
      ...(isProd ? {} : { dev: { verifyLink, verificationToken, emailResult } }),
    });
  } catch (err) {
    console.error("Auth register error:", err);
    if (err?.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }

    res.status(500).json({
      message: "Registration failed",
      ...(process.env.NODE_ENV === "production" ? {} : { error: err?.message }),
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    user.lastLoginAt = new Date();
    await user.save();

    const token = createAuthToken(user);

    res.json({
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    console.error("Auth login error:", err);
    res.status(500).json({
      message: "Login failed",
      ...(process.env.NODE_ENV === "production" ? {} : { error: err?.message }),
    });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user: serializeUser(user) });
  } catch {
    console.error("Auth me error");
    return res.status(500).json({ message: "Failed to load user profile" });
  }
});

router.post("/logout", auth, (_req, res) => {
  res.json({ message: "Logged out" });
});

router.post("/forgot-password", async (req, res) => {
  try {
    const cleanEmail = normalizeEmail(req.body?.email);
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.json({
        message: "If that email exists, a reset link has been generated",
      });
    }

    const resetToken = generateRandomToken(32);
    const resetTokenHash = hashToken(resetToken);

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpiresAt = buildTokenExpiry(30);
    await user.save();

    const resetLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
    const resetEmail = buildPasswordResetEmail({
      name: user.name,
      resetLink,
    });
    const emailResult = await sendEmail({
      to: user.email,
      ...resetEmail,
    });

    return res.json({
      message: "Password reset link generated",
      ...(isProd ? {} : { dev: { resetLink, resetToken, emailResult } }),
    });
  } catch {
    console.error("Auth forgot-password error");
    return res.status(500).json({ message: "Failed to generate password reset link" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    const rawToken = sanitizeText(token);

    if (!rawToken || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch {
    console.error("Auth reset-password error");
    return res.status(500).json({ message: "Failed to reset password" });
  }
});

router.post("/send-verification", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.emailVerified) {
      return res.json({ message: "Email is already verified" });
    }

    const verificationToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(verificationToken);

    user.emailVerificationToken = verificationTokenHash;
    user.emailVerificationExpiresAt = buildTokenExpiry(60 * 24);
    await user.save();

    const verifyLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email?token=${verificationToken}`;
    const verificationEmail = buildVerificationEmail({
      name: user.name,
      verifyLink,
    });
    const emailResult = await sendEmail({
      to: user.email,
      ...verificationEmail,
    });

    return res.json({
      message: "Verification link generated",
      ...(isProd ? {} : { dev: { verifyLink, verificationToken, emailResult } }),
    });
  } catch {
    console.error("Auth send-verification error");
    return res.status(500).json({ message: "Failed to generate verification link" });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const rawToken = sanitizeText(req.body?.token);
    if (!rawToken) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired verification token" });

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return res.json({ message: "Email verified successfully" });
  } catch {
    console.error("Auth verify-email error");
    return res.status(500).json({ message: "Failed to verify email" });
  }
});

export default router;
