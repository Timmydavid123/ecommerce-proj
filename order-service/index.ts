import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

let channel: amqp.Channel | null = null; 

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

const publishToQueue = (queue: string, message: string | Buffer) => { // Restrict message to string or Buffer
  if (!channel) {
    console.error('RabbitMQ channel is not established');
    return;
  }
  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
};

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

const orderSchema = new mongoose.Schema({
  productId: String,
  userId: String,
  quantity: Number,
  status: String,
});

const Order = mongoose.model('Order', orderSchema);

app.post('/orders', async (req, res) => {
  const { productId, userId, quantity } = req.body;

  try {
    const product = await axios.get(`http://localhost:3002/products/${productId}`);
    if (!product.data) return res.status(404).json({ message: 'Product not found' });

    const order = new Order({ productId, userId, quantity, status: 'pending' });
    await order.save();
    
    // Publish the order to RabbitMQ
    publishToQueue('orderQueue', JSON.stringify(order));
    
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error processing order' });
  }
});

app.listen(3003, () => console.log('Order Service running on port 3003'));
