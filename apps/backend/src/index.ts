import 'dotenv/config';
import express from 'express';
import internalRoutes from './routes/internal';
import v1Routes from './routes/v1';
import { prisma } from './config/prisma';

const app = express();
app.use(express.json()); // Щоб Express розумів JSON з req.body

// Внутрішнє API для взаємодії з дашбордом
app.use('/api/internal', internalRoutes);

// Зовнішнє API для використання користувачами (через API-ключі)
app.use('/api/v1', v1Routes);

// Функція-костиль (keep-alive) для NeonDB, щоб він не засинав
const keepNeonAwake = () => {
  // Робимо простий запит кожні 2 хвилини
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Keep-alive ping sent to NeonDB');
    } catch (err) {
      console.error('NeonDB keep-alive failed:', err);
    }
  }, 2 * 60 * 1000); // 2 хвилини (Neon засинає через 5)
};

app.listen(3001, () => {
  console.log('Server is running on port 3001');
  keepNeonAwake(); // Запускаємо пінгування після старту сервера
});
