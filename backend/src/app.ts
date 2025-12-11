import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { notesRouter } from './routes/notes';
import { errorHandler } from './middleware/error';

dotenv.config();

export const app = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/auth', authRouter);
app.use('/notes', notesRouter);

app.use(errorHandler);


