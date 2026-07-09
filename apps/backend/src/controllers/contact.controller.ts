import { Request, Response } from 'express';
import { sendContactFormEmail } from '../services/email.service';

export const handlePublicContactForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, topic, message } = req.body;

    if (!name || !email || !topic || !message) {
      res.status(400).json({ error: 'All fields (name, email, topic, message) are required' });
      return;
    }

    const emailSent = await sendContactFormEmail({ name, email, topic, message });

    if (!emailSent) {
      res.status(500).json({ error: 'Failed to dispatch email notification' });
      return;
    }

    res.json({
      success: true,
      message: 'Inquiry dispatched successfully'
    });
  } catch (error: any) {
    console.error('handlePublicContactForm error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
