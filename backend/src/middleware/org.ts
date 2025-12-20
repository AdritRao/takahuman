import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function requireOrgContext(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.header('X-Org-Id');
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const orgId = header ? Number(header) : NaN;

    const membership = await prisma.membership.findFirst({
      where: header ? { userId, organizationId: orgId } : { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) return res.status(403).json({ error: 'No organization access' });
    req.org = membership.organization;
    req.membership = { role: membership.role, organizationId: membership.organizationId };
    next();
  } catch {
    return res.status(500).json({ error: 'Failed to determine organization' });
  }
}

export function requireRole(roles: Array<'OWNER' | 'ADMIN' | 'MEMBER'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.membership?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}


