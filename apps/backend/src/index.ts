import 'dotenv/config';
import express from 'express';
import internalRoutes from './routes/internal';
// import v1Routes from './routes/v1';

const app = express();
app.use(express.json()); // Щоб Express розумів JSON з req.body

// Внутрішнє API для взаємодії з дашбордом
app.use('/api/internal', internalRoutes);

// Зовнішнє API для використання користувачами (через API-ключі)
// app.use('/api/v1', v1Routes);

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
