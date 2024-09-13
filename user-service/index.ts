import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import amqp, { Channel } from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

let channel: Channel | null = null;  // Explicitly type 'channel' as 'Channel' or 'null'

// RabbitMQ Connection
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue('orderQueue', { durable: true });
  // Log success message
  console.log('RabbitMQ connected successfully and queue orderQueue is ready.');
  } catch (err) {
    console.error('Failed to connect to RabbitMQ', err);
  }
};

connectRabbitMQ();

// Function to publish messages to RabbitMQ
const publishToQueue = (queue: string, message: string) => {
  if (!channel) {
    console.error('RabbitMQ channel is not established');
    return;
  }
  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
};

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

// Register Route
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  await user.save();

  // Publish to RabbitMQ after successful registration
  publishToQueue('orderQueue', JSON.stringify(user));

  res.status(201).json({ message: 'User registered' });
});

// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = await User.findOne({ email });

  if (!user || !user.password) {
    return res.status(404).json({ message: 'User not found or no password set' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: 'JWT secret is not set in the environment' });
  }

  const token = jwt.sign(
    { id: user._id, username: user.username },
    jwtSecret,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

// Get User Profile
app.get('/profile', async (req, res) => {
  const user = await User.findById(req.query.userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
});

// Start the User Service
app.listen(3001, () => console.log('User Service running on port 3001'));
