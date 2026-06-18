import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const prisma = new PrismaClient();

// Ці значення треба прописати в .env файлі бекенду
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

import { generateToken } from '../utils/jwt';

export const googleAuth = (req: Request, res: Response) => {
  const redirectUri = `${BACKEND_URL}/api/internal/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=email profile`;
  res.redirect(url);
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.query;
  const redirectUri = `${BACKEND_URL}/api/internal/auth/google/callback`;

  try {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    const profile = userInfoResponse.data;
    
    let user = await prisma.user.findUnique({ where: { email: profile.email } });
    
    if (!user) {
      const workspace = await prisma.workspace.create({
        data: { name: `${profile.name || 'User'}'s Workspace`, slug: `ws-${Date.now()}` }
      });

      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.picture,
          googleId: profile.id,
          workspaceId: workspace.id,
        }
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id }
      });
    }

    const token = generateToken(user.id, user.workspaceId);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      workspaceId: user.workspaceId,
    };
    const userBase64 = Buffer.from(JSON.stringify(safeUser)).toString('base64');
    res.redirect(`${FRONTEND_URL}/login?token=${token}&user=${encodeURIComponent(userBase64)}`);
  } catch (error) {
    console.error(error);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
};

export const githubAuth = (req: Request, res: Response) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email`;
  res.redirect(url);
};

export const githubCallback = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.query;

  try {
    const { data } = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' }
    });

    const userInfoResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    
    const emailsResponse = await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    const profile = userInfoResponse.data;
    const primaryEmail = emailsResponse.data.find((e: any) => e.primary)?.email || emailsResponse.data[0]?.email;

    let user = await prisma.user.findUnique({ where: { email: primaryEmail } });
    
    if (!user) {
      const workspace = await prisma.workspace.create({
        data: { name: `${profile.name || profile.login}'s Workspace`, slug: `ws-${Date.now()}` }
      });

      user = await prisma.user.create({
        data: {
          email: primaryEmail,
          name: profile.name || profile.login,
          avatarUrl: profile.avatar_url,
          githubId: String(profile.id),
          workspaceId: workspace.id,
        }
      });
    } else if (!user.githubId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { githubId: String(profile.id) }
      });
    }

    const token = generateToken(user.id, user.workspaceId);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      workspaceId: user.workspaceId,
    };
    const userBase64 = Buffer.from(JSON.stringify(safeUser)).toString('base64');
    res.redirect(`${FRONTEND_URL}/login?token=${token}&user=${encodeURIComponent(userBase64)}`);
  } catch (error) {
    console.error(error);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
};
