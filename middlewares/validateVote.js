const MATRIC_REGEX = /^[A-Z]{3}\/\d{2}\/\d{2}\/\d{4}$/;

export function validateVotePayload(req, res, next) {
  const {
    matricNo,
    biometricType,
    biometricPayload,
    deviceId,
    positionId,
    candidateId,
  } = req.body;

  if (!matricNo || !positionId || !candidateId) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (!MATRIC_REGEX.test(matricNo)) {
    return res.status(400).json({ error: "Invalid matric format." });
  }

  if (!["face", "fingerprint", "none"].includes(biometricType)) {
    return res.status(400).json({ error: "Invalid biometric type." });
  }

  if (biometricType !== "none" && !biometricPayload) {
    return res.status(400).json({ error: "Biometric payload is required." });
  }

  if (biometricType === "none" && !deviceId) {
    return res
      .status(400)
      .json({ error: "Device ID required without biometrics." });
  }

  next();
}
