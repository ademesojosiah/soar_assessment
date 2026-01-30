/**
 * Authentication Middleware
 * Extracts Bearer token from Authorization header
 * Verifies token and attaches user info to request
 */
module.exports = ({ meta, config, managers }) => {
  return ({ req, res, next }) => {
    const authHeader = req.headers.authorization || "";

    // Extract Bearer token
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      console.log("[AUTH] Token required but not found");
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        message: "Authorization token required",
        errors: ["Missing or invalid Authorization header"],
      });
    }

    // Verify token
    let decoded = null;
    try {
      decoded = managers.token.verifyShortToken({ token });

      if (!decoded) {
        console.log("[AUTH] Failed to decode token - no decoded result");
        return managers.responseDispatcher.dispatch(res, {
          ok: false,
          code: 401,
          message: "Invalid token",
          errors: ["Token verification failed"],
        });
      }

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
      };

      next(req.user);
    } catch (err) {
      console.log("[AUTH] Token verification error:", err.message);
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        message: "Invalid or expired token",
        errors: ["Token verification failed"],
      });
    }
  };
};
