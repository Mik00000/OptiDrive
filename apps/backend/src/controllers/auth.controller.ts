import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/auth.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Please provide email, password, and name' });
      return;
    }

    const { user, token } = await registerUser(email, password, name);

    // Віддаємо успішну відповідь, але не повертаємо хеш пароля
    res.status(201).json({
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
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please provide email and password' });
      return;
    }

    const { user, token } = await loginUser(email, password);

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
    res.status(401).json({ error: error.message });
  }
};