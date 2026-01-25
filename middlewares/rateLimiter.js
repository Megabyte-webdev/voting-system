import rateLimit from "express-rate-limit";

// Rate limiter for voting attempts
export const voteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // max 3 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const biometricUsed = req.body?.biometricType && req.body?.biometricPayload;
    if (biometricUsed) {
      return res.status(429).json({
        error:
          "You cannot use the same fingerprint to vote again in this election. Please use a different biometric or wait for the voting window to reset.",
      });
    }

    return res.status(429).json({
      error:
        "Too many voting attempts. Please try again later or ensure your biometric/matric is correct.",
    });
  },
});
