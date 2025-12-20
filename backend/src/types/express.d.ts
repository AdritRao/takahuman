import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      email: string;
    };
    org?: {
      id: number;
      name: string;
    };
    membership?: {
      organizationId: number;
      role: 'OWNER' | 'ADMIN' | 'MEMBER';
    };
  }
}


