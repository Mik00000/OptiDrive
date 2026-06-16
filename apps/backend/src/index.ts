import express from 'express';
import authRoutes from './routes/internal';

const app = express();
app.use(express.json()); // Щоб Express розумів JSON з req.body

app.use('/api/auth', authRoutes);

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});
