ecommerce-proj/
├── user-service/
│   ├── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── product-service/
│   ├── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── order-service/
│   ├── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── payment-service/
│   ├── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── docker-compose.yml
└── README.md


INSTALLATION

Navigate to each service directory (user-service, product-service, order-service, payment-service).
Run npm install or yarn install to install the required dependencies.

Ensure MongoDB and RabbitMQ are running and also ensure your docker desktop is running.
Start each service:
npm start in the user-service directory.
npm start in the product-service directory.
npm start in the order-service directory.
npm start  in the payment-service directory.
Testing Services:
Unit Tests: Write unit tests for each service using a testing framework like Jest or Mocha
Integration Tests: Ensure services work together correctly by writing integration tests. You may use tools like Postman.

1. API Endpoints
User Service (user-service)

Register User
Endpoint: POST /register
Description: Registers a new user with hashed password.
Request Body:
json

{
  "username": "string",
  "email": "string",
  "password": "string"
}
Response:
{
  "message": "User registered"
}
Login User
Endpoint: POST /login
Description: Authenticates a user and returns a JWT token.
Request Body:
{
  "email": "string",
  "password": "string"
}
Response:
{
  "token": "string"
}
Get User Profile
Endpoint: GET /profile
Description: Fetches the profile information of a user.
Query Parameters:
userId: The ID of the user.
Response:
{
  "username": "string",
  "email": "string",
  "password": "string"
}
Product Service (product-service)

Register User
Endpoint: POST /register
Description: Registers a new user with hashed password. Same as user-service for consistency.
Login User
Endpoint: POST /login
Description: Authenticates a user and returns a JWT token. Same as user-service for consistency.
Get User Profile
Endpoint: GET /profile
Description: Fetches the profile information of a user. Same as user-service for consistency.
Order Service (order-service)

Create Order
Endpoint: POST /orders
Description: Creates a new order and publishes it to RabbitMQ.
Request Body:
{
  "productId": "string",
  "userId": "string",
  "quantity": "number"
}
Response:
{
  "productId": "string",
  "userId": "string",
  "quantity": "number",
  "status": "pending"
}
Payment Service (payment-service)

Process Payment
Endpoint: POST /payments
Description: Processes a payment for an order.
Request Body:
{
  "orderId": "string",
  "amount": "number"
}
Response:
{
  "message": "Payment processed successfully",
  "payment": {
    "orderId": "string",
    "amount": "number",
    "status": "success",
    "createdAt": "ISO8601 string"
  }
}
1. Service Interactions
User Service to Order Service:

Interaction: Users can register and log in to obtain JWT tokens, which can be used for authentication in subsequent API calls.
RabbitMQ: Order Service publishes order data to the orderQueue in RabbitMQ after creating an order.
Order Service to Product Service:

Interaction: Before creating an order, the Order Service checks product availability by making an HTTP GET request to the Product Service.
Order Service to RabbitMQ:

Interaction: After creating an order, the Order Service publishes the order information to the RabbitMQ orderQueue.
Payment Service:

Interaction: The Payment Service processes payments by saving payment details in MongoDB. It is assumed that payments are triggered by some other process or service (e.g., Order Service).
3. Setup Instructions
Environment Setup:

Ensure you have Node.js, npm or yarn, and MongoDB installed.
Install RabbitMQ (can be done via Docker or directly on your machine).
Configuration:

Create a .env file in each service directory with the following environment variables:
bash
Copy code
MONGO_URI=mongodb://localhost:27017/your_database_name
JWT_SECRET=your_jwt_secret
