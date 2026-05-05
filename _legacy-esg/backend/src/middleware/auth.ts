/**
 * Authentication Middleware
 */
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: string;
  department: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const allowInsecureHeaderAuth =
  process.env.ALLOW_INSECURE_HEADER_AUTH === 'true';

/**
 * Autenticación para el servidor Express de referencia.
 *
 * Por defecto **rechaza** cualquier petición: el modo “cabeceras = identidad”
 * no es seguro en red. Solo para laboratorio local, establecer
 * `ALLOW_INSECURE_HEADER_AUTH=true`. En producción usar JWT verificado
 * (p. ej. Supabase) o no exponer este servicio.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  if (!allowInsecureHeaderAuth) {
    res.status(503).json({
      error:
        'Auth no habilitada: el API Express no está configurado para producción. ' +
        'Para pruebas locales con cabeceras, define ALLOW_INSECURE_HEADER_AUTH=true.'
    });
    return;
  }

  req.user = {
    id: (req.headers['x-user-id'] as string) || 'user1',
    organizationId: (req.headers['x-organization-id'] as string) || 'org1',
    email: (req.headers['x-user-email'] as string) || 'user@example.com',
    name: (req.headers['x-user-name'] as string) || 'Test User',
    role: (req.headers['x-user-role'] as string) || 'Sustainability Lead',
    department: (req.headers['x-user-department'] as string) || 'Sustainability Office'
  };

  next();
}

/**
 * Middleware opcional para desarrollo (permite requests sin auth)
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.headers.authorization) {
    authenticate(req, res, next);
    return;
  }
  if (allowInsecureHeaderAuth) {
    req.user = {
      id: 'dev-user',
      organizationId: 'dev-org',
      email: 'dev@example.com',
      name: 'Dev User',
      role: 'Sustainability Lead',
      department: 'Sustainability Office'
    };
    next();
    return;
  }
  res.status(503).json({
    error: 'Define ALLOW_INSECURE_HEADER_AUTH=true para usar optionalAuth sin JWT.'
  });
}
