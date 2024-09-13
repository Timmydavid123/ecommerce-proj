import express from 'express';
import mongoose from 'mongoose';
import amqp from 'amqplib';
import dotenv from 'dotenv';
import { authMiddleware } from '../common/middleware/authMiddleware';

dotenv.config();

const app = express();
app.use(express.json());

let channel;

const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue('orderQueue', { durable: true });
  } catch (err) {
    console.error('Failed to connect to RabbitMQ', err);
  }
};

connectRabbitMQ();

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

const paymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'success' },
  createdAt: { type: Date, default: Date.now },
});

const Payment = mongoose.model('Payment', paymentSchema);

app.post('/payments', authMiddleware, async (req, res) => {
  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ message: 'OrderId and amount are required' });
  }

  try {
    const payment = new Payment({ orderId, amount });
    await payment.save();
    
    res.status(200).json({ message: 'Payment processed successfully', payment });
  } catch (err) {
    console.error('Payment processing error:', err);
    res.status(500).json({ message: 'Failed to process payment' });
  }
});

app.listen(3004, () => console.log('Payment Service running on port 3004'));
