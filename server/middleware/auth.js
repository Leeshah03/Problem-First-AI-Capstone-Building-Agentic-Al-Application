import { clerkMiddleware, getAuth, verifyToken } from '@clerk/express';
import { config } from '../config.js';

// Initialize Clerk middleware
export const clerkAuth = config.clerkSecretKey
  ? clerkMiddleware({ secretKey: config.clerkSecretKey })
  : (req, res, next) => next(); // no-op when Clerk not configured

// Require authenticated user with active organization
export async function requireAuthenticated(req, res, next) {
  // Dev bypass: when no Clerk secret key, inject defaults
  if (!config.clerkSecretKey && config.nodeEnv === 'development') {
    req.orgId = config.defaultOrgId;
    req.userId = 'dev_user';
    req.userRole = 'org:admin';
    return next();
  }

  // SSE fallback: accept token from query param (EventSource doesn't support custom headers)
  if (req.query.token && !getAuth(req)?.userId) {
    try {
      const payload = await verifyToken(req.query.token, { secretKey: config.clerkSecretKey });
      if (payload?.sub && payload?.org_id) {
        req.orgId = payload.org_id;
        req.userId = payload.sub;
        req.userRole = payload.org_role || 'org:member';
        return next();
      }
    } catch { /* fall through to normal auth check */ }
  }

  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!auth.orgId) {
    return res.status(403).json({ error: 'No organization selected. Please select an organization.' });
  }

  req.orgId = auth.orgId;
  req.userId = auth.userId;
  req.userRole = auth.orgRole || 'org:member';
  next();
}

// Require specific role (admins always pass)
export function requireRole(role) {
  return (req, res, next) => {
    const requiredRole = `org:${role}`;
    if (req.userRole !== requiredRole && req.userRole !== 'org:admin') {
      return res.status(403).json({ error: `Role '${role}' required` });
    }
    next();
  };
}
