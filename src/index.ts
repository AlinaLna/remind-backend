import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { connectDB } from './config/db';
import adminRoutes from './routes/admin.routes';
import forumRoutes from './routes/forum.routes';
import authRoutes from './routes/auth.routes';

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors());
app.use(express.json());

void connectDB();

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'ReMind API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/forums', forumRoutes);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
