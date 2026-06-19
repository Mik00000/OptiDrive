import { Request, Response } from 'express';
import { registerUser, loginUser, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } from '../services/auth.service';

const handleError = (error: any, res: Response, defaultStatus = 400) => {
  const msg = error?.message || '';
  if (msg.includes("Can't reach database server") || msg.includes('ETIMEDOUT') || error?.code === 'P1001' || msg.includes('timeout')) {
    return res.status(503).json({ error: 'Connection error. The server is waking up, please try again in a few seconds.' });
  }
  return res.status(defaultStatus).json({ error: msg || 'An error occurred' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Please provide email, password, and name' });
      return;
    }

    const { user, requiresVerification } = await registerUser(email, password, name);

    // Віддаємо успішну відповідь, але не повертаємо хеш пароля
    res.status(201).json({
      success: true,
      requiresVerification,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        workspaceId: user.workspaceId
      }
    });
  } catch (error: any) {
    handleError(error, res, 400);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please provide email and password' });
      return;
    }

    const { user, token, requiresVerification } = await loginUser(email, password);

    res.status(200).json({
      success: true,
      token,
      requiresVerification,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        workspaceId: user.workspaceId
      }
    });
  } catch (error: any) {
    handleError(error, res, 401);
  }
};

export const verifyEmailController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: 'Please provide email and code' });
      return;
    }

    const { user, token } = await verifyEmail(email, code);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        workspaceId: user.workspaceId
      }
    });
  } catch (error: any) {
    handleError(error, res, 400);
  }
};

export const resendVerificationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Please provide an email' });
      return;
    }

    await resendVerificationEmail(email);

    res.status(200).json({ success: true, message: 'Verification email resent' });
  } catch (error: any) {
    handleError(error, res, 400);
  }
};

export const forgotPasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Please provide an email' });
      return;
    }

    // Determine base URL (e.g., http://localhost:3000) for the reset link
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['origin'] || req.headers['host'] || 'http://localhost:3000';
    const baseUrl = host.toString().startsWith('http') ? host : `${protocol}://${host}`;

    await forgotPassword(email, baseUrl.toString());

    res.status(200).json({ success: true, message: 'Password reset link sent' });
  } catch (error: any) {
    handleError(error, res, 400);
  }
};

export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Please provide token and new password' });
      return;
    }

    await resetPassword(token, newPassword);

    res.status(200).json({ success: true, message: 'Password has been reset' });
  } catch (error: any) {
    handleError(error, res, 400);
  }
};