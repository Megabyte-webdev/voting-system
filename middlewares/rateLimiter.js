import rateLimit from "express-rate-limit";

export const voteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: "Too many voting attempts. Try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
