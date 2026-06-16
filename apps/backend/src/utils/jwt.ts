import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

export const generateToken = (userId: string, workspaceId: string) => {
  return jwt.sign({ userId, workspaceId }, JWT_SECRET, { expiresIn: '14d' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { userId: string; workspaceId: string };
};