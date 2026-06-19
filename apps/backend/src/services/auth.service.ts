import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { findUserByEmail, createUserWithWorkspace, updateUserVerification } from '../repositories/user.repository';
import { generateToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service';

const generateVerificationCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const registerUser = async (email: string, passwordRaw: string, name: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(passwordRaw, salt);

  const verificationCode = generateVerificationCode();
  const verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  const user = await createUserWithWorkspace(email, passwordHash, name, verificationCode, verificationCodeExpiry);

  // Send verification email asynchronously
  sendVerificationEmail(email, verificationCode).catch(console.error);

  return { user, requiresVerification: true };
};

export const loginUser = async (email: string, passwordRaw: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(passwordRaw, user.passwordHash || '');
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  if (!user.emailVerified) {
    return { user, requiresVerification: true };
  }

  const token = generateToken(user.id, user.workspaceId);

  return { user, token };
};

export const verifyEmail = async (email: string, code: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.emailVerified) {
    throw new Error('Email is already verified');
  }

  if (user.verificationCode !== code) {
    throw new Error('Invalid verification code');
  }

  if (user.verificationCodeExpiry && user.verificationCodeExpiry < new Date()) {
    throw new Error('Verification code expired');
  }

  await updateUserVerification(user.id);
  
  const token = generateToken(user.id, user.workspaceId);
  return { user, token };
};

export const resendVerificationEmail = async (email: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }
  
  if (user.emailVerified) {
    throw new Error('Email is already verified');
  }

  const verificationCode = generateVerificationCode();
  const verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  // Update user with new code (Requires new repository function or direct prisma access.
  // For simplicity, we can do it via a quick repository function, but let's add it to user.repository or do it via prisma here)
  const { prisma } = require('../config/prisma');
  await prisma.user.update({
    where: { id: user.id },
    data: { verificationCode, verificationCodeExpiry }
  });

  await sendVerificationEmail(email, verificationCode);
  return true;
};

export const forgotPassword = async (email: string, baseUrl: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    // Return true even if user not found to prevent email enumeration
    return true;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const { prisma } = require('../config/prisma');
  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken, resetPasswordExpiry }
  });

  const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(email, resetLink);
  return true;
};

export const resetPassword = async (token: string, newPasswordRaw: string) => {
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  const { prisma } = require('../config/prisma');
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken,
      resetPasswordExpiry: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    throw new Error('Invalid or expired password reset token');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPasswordRaw, salt);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpiry: null
    }
  });

  return true;
};