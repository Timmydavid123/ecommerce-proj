import express from 'express';
import mongoose from 'mongoose';
import amqp, { Channel } from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

let channel: Channel | null = null; // Define channel type explicitly

// RabbitMQ Connection Setup
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    // Declare the queue for communication
    await channel.assertQueue('orderQueue', { durable: true });
    console.log('Connected to RabbitMQ and orderQueue is set.');
  } catch (err) {
    console.error('Failed to connect to RabbitMQ', err);
  }
};

// Call the function to connect to RabbitMQ
connectRabbitMQ();

// Function to publish messages to the queue
const publishToQueue = (queue: string, message: string) => { // Explicit types for parameters
  if (!channel) {
    console.error('RabbitMQ channel is not established');
    return;
  }
  channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
  console.log(`Message sent to queue: ${queue}`);
};

// MongoDB Connection Setup
mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Product Schema and Model
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
});

const Product = mongoose.model('Product', productSchema);

// Create a new product
app.post('/products', async (req, res) => {
  const { name, price, stock } = req.body;

  try {
    const product = new Product({ name, price, stock });
    await product.save();
    
    // Publish the created product message to the RabbitMQ queue
    publishToQueue('orderQueue', JSON.stringify(product));

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Get a single product by ID
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// Update a product by ID
app.put('/products/:id', async (req, res) => {
  const { name, price, stock } = req.body;

  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { name, price, stock }, { new: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Optionally, publish updated product details to RabbitMQ
    publishToQueue('orderQueue', JSON.stringify(product));

    res.status(200).json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Delete a product by ID
app.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Optionally, publish deleted product details to RabbitMQ
    publishToQueue('orderQueue', JSON.stringify({ productId: req.params.id, status: 'deleted' }));

    res.status(200).json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// Start the Product Service
app.listen(3002, () => {
  console.log('Product Service running on port 3002');
});
