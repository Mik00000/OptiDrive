import bcrypt from 'bcryptjs';
import { findUserByEmail, createUserWithWorkspace } from '../repositories/user.repository';
import { generateToken } from '../utils/jwt';

export const registerUser = async (email: string, passwordRaw: string, name: string) => {
  // 1. Перевіряємо, чи немає вже такого юзера
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // 2. Хешуємо пароль (ніколи не зберігай паролі в чистому вигляді!)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(passwordRaw, salt);

  // 3. Створюємо юзера в БД
  const user = await createUserWithWorkspace(email, passwordHash, name);

  // 4. Генеруємо токен
  const token = generateToken(user.id, user.workspaceId);

  return { user, token };
};

export const loginUser = async (email: string, passwordRaw: string) => {
  // 1. Шукаємо юзера
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // 2. Порівнюємо паролі
  const isMatch = await bcrypt.compare(passwordRaw, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  // 3. Генеруємо токен
  const token = generateToken(user.id, user.workspaceId);

  return { user, token };
};