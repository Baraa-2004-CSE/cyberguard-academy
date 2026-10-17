
import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const token = req.cookies?.cg_token;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: Number(payload.sub),
      role: payload.role,
    };

    return next();
  } catch {
    return res.status(401).json({
      message: "Session expired or invalid. Please log in again.",
    });
  }
}