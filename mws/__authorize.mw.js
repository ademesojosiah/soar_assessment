/**
 * Authorization Middleware
 * Checks if authenticated user has required role
 * Gets required roles from req.requiredRoles (set by Api.manager)
 * Gets user role from previous middleware result or req.user
 *
 * Usage:
 * - Api.manager automatically injects this middleware if roles are required
 * - Sets req.requiredRoles before creating middleware stack
 */
module.exports = ({ meta, config, managers }) => {
  return ({ req, res, next, results }) => {

    // Get required roles from request (set by Api.manager)
    const requiredRoles = req.requiredRoles;

    // If no required roles, allow access (public method)
    if (!requiredRoles || requiredRoles.length === 0) {
      console.log("[AUTHZ] No role requirements - allowing access");
      next({});
      return;
    }

    // Get user info from previous middleware or req.user
    const userFromAuth = results.__authenticate; 
    const userRole = userFromAuth?.role || req.user?.role;

    // Check if user is authenticated
    if (!userRole) {
      console.log(
        "[AUTHZ] User role not found - authentication may have failed",
      );
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        message: "Authentication required",
        errors: ["User authentication failed or role missing"],
      });
    }

    // Check if user has required role
    const hasRequiredRole = requiredRoles.includes(userRole);

    if (!hasRequiredRole) {
      console.log(
        `[AUTHZ] User role "${userRole}" not in required roles:`,
        requiredRoles,
      );
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 403,
        message: "Insufficient permissions",
        errors: [`Only ${requiredRoles.join(", ")} can access this resource`],
      });
    }

    console.log(
      `[AUTHZ] User role "${userRole}" authorized for required roles:`,
      requiredRoles,
    );
    next({ role: userRole, authorized: true });
  };
};
