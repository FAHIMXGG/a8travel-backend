# Travel Backend API

A comprehensive RESTful API backend for a travel planning and social platform built with Node.js, Express, TypeScript, and MongoDB. This API enables users to create travel plans, connect with fellow travelers, manage subscriptions, and review travel experiences.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

### User Management
- User registration and authentication with JWT
- Password reset via email OTP
- User profiles with travel interests, visited countries, and gallery
- User rating system
- Role-based access control (USER, ADMIN, MODERATOR)
- User blocking/unblocking functionality
- Public user search and discovery

### Travel Plans
- Create and manage travel plans
- Travel plan matching based on preferences
- Join travel plans as participants
- Travel plan status management (OPEN, ONGOING, ENDED, CLOSED, CANCELED, FULL)
- Travel types: SOLO, FAMILY, FRIENDS
- Travel plan reviews and ratings
- Participant management
- Advanced search and filtering

### Payment & Subscriptions
- Stripe integration for subscription payments
- Subscription status management (NONE, ACTIVE, EXPIRED)
- Secure checkout session creation

### Security
- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Helmet.js for security headers
- Input validation with Zod
- Error handling middleware

## 🛠 Tech Stack

### Core
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - NoSQL database
- **Prisma** - ORM for database management

### Authentication & Security
- **jsonwebtoken** - JWT token generation
- **bcrypt** - Password hashing
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing

### Payment
- **Stripe** - Payment processing

### Utilities
- **Zod** - Schema validation
- **Nodemailer** - Email sending
- **Morgan** - HTTP request logger
- **Cookie-parser** - Cookie handling
- **dotenv** - Environment variables

### Development
- **ts-node-dev** - TypeScript development server
- **@vercel/node** - Vercel serverless functions

## 📁 Project Structure

```
travel-backend/
├── api/                    # Vercel serverless function entry point
│   └── index.ts
├── src/                    # Source code
│   ├── app.ts             # Express app configuration
│   ├── index.ts           # Application entry point
│   ├── config/            # Configuration files
│   │   ├── env.ts         # Environment variables
│   │   └── prisma.ts      # Prisma client
│   ├── middlewares/       # Express middlewares
│   │   ├── authMiddleware.ts
│   │   └── errorHandler.ts
│   ├── modules/           # Feature modules
│   │   ├── auth/          # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
│   │   ├── user/          # User management module
│   │   │   ├── user.controller.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.validation.ts
│   │   ├── travelPlan/    # Travel plan module
│   │   │   ├── travelPlan.controller.ts
│   │   │   ├── travelPlan.routes.ts
│   │   │   └── travelPlan.validation.ts
│   │   └── payment/       # Payment module
│   │       ├── payment.controller.ts
│   │       └── payment.routes.ts
│   ├── types/             # TypeScript type definitions
│   │   └── express.d.ts
│   └── utils/             # Utility functions
│       ├── apiResponse.ts
│       └── sendEmail.ts
├── prisma/                 # Prisma schema and migrations
│   └── schema.prisma
├── dist/                   # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── vercel.json            # Vercel deployment configuration
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local instance or MongoDB Atlas account)
- **Stripe Account** (for payment functionality)
- **SMTP Email Service** (for email functionality)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travel-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory (see [Environment Variables](#environment-variables) section)

4. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

5. **Push database schema**
   ```bash
   npm run prisma:push
   ```

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
DATABASE_URL=mongodb://localhost:27017/travel-backend
# Or for MongoDB Atlas:
# DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
COOKIE_NAME=access_token

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@travelapp.com

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

### Environment Variable Descriptions

- **NODE_ENV**: Environment mode (development/production)
- **PORT**: Server port number
- **CLIENT_URL**: Frontend application URL for CORS
- **DATABASE_URL**: MongoDB connection string
- **JWT_SECRET**: Secret key for JWT token signing
- **JWT_EXPIRES_IN**: JWT token expiration time
- **COOKIE_NAME**: Name of the authentication cookie
- **SMTP_***: Email service configuration for sending OTP and notifications
- **STRIPE_SECRET_KEY**: Stripe API secret key for payment processing

## 🗄 Database Setup

### Using MongoDB Atlas (Cloud)

1. Create an account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Add it to `.env` as `DATABASE_URL`

### Using Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. Use `mongodb://localhost:27017/travel-backend` as `DATABASE_URL`

### Initialize Database Schema

After setting up MongoDB, run:

```bash
npm run prisma:push
```

This will create all the necessary collections and indexes in your database.

## 🏃 Running the Project

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:5000` (or the port specified in `.env`).

### Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Start the production server
npm start
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:push` - Push schema changes to database

## 📡 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/forgot-password` | Request password reset OTP | No |
| POST | `/auth/reset-password` | Reset password with OTP | No |
| POST | `/auth/logout` | Logout user | Yes |

### User Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/users/me` | Get current user profile | Yes | Any |
| GET | `/users/all` | Get all users (public) | No | - |
| GET | `/users/search` | Search users | No | - |
| GET | `/users` | Admin: List users with filters | Yes | Admin |
| GET | `/users/:id` | Get user profile by ID | No | - |
| PATCH | `/users/:id` | Update user profile | Yes | Self/Admin |
| PATCH | `/users/:id/password` | Update password | Yes | Self |
| PATCH | `/users/:id/admin` | Admin: Manage user | Yes | Admin |
| GET | `/users/me/travel-history` | Get user's travel history | Yes | Any |

### Travel Plan Endpoints

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/travel-plans` | Create a travel plan | Yes | Any |
| GET | `/travel-plans` | Get all travel plans | No | - |
| GET | `/travel-plans/match` | Match travel plans | No | - |
| GET | `/travel-plans/search` | Search travel plans | No | - |
| GET | `/travel-plans/my` | Get my travel plans | Yes | Any |
| GET | `/travel-plans/admin` | Admin: List all plans | Yes | Admin |
| GET | `/travel-plans/:id` | Get travel plan by ID | No | - |
| PATCH | `/travel-plans/:id` | Update travel plan | Yes | Host/Admin |
| PATCH | `/travel-plans/:id/status` | Update plan status | Yes | Host/Admin |
| DELETE | `/travel-plans/:id` | Delete travel plan | Yes | Host/Admin |
| POST | `/travel-plans/:id/join` | Join a travel plan | Yes | Any |
| GET | `/travel-plans/:id/participants` | Get plan participants | Yes | Any |
| POST | `/travel-plans/:id/reviews` | Create/update review | Yes | Any |
| DELETE | `/travel-plans/:id/reviews/:reviewId` | Delete review | Yes | Any |
| GET | `/travel-plans/me/travel-history` | Get travel history | Yes | Any |

### Payment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/create-intent` | Create Stripe checkout session | Yes |
| POST | `/payments/confirm` | Confirm subscription | Yes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check |

## 🔑 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Tokens are sent via:

1. **Cookie** (preferred): Automatically sent with requests
2. **Bearer Token**: In the `Authorization` header as `Bearer <token>`

### Authentication Flow

1. **Register/Login**: User receives a JWT token
2. **Protected Routes**: Include token in requests
3. **Token Validation**: Middleware validates token on each request
4. **Role-Based Access**: Some routes require specific roles (ADMIN, MODERATOR)

### Example Request with Bearer Token

```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:5000/api/users/me
```

## 🚢 Deployment

### Vercel Deployment

This project is configured for Vercel serverless deployment:

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   Add all environment variables in Vercel dashboard under Project Settings → Environment Variables

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

The `vercel.json` file configures the serverless function routing.

### Other Deployment Options

For other platforms (Heroku, AWS, etc.):

1. Build the project: `npm run build`
2. Set environment variables
3. Run: `npm start`
4. Ensure MongoDB connection is accessible

## 📊 Database Models

### User Model
- User authentication and profile information
- Travel interests and visited countries
- Rating system
- Subscription management
- Travel history tracking

### TravelPlan Model
- Travel plan details (destination, dates, budget)
- Travel type and status
- Participant management
- Public/private visibility

### TravelPlanParticipant Model
- Many-to-many relationship between users and travel plans
- Prevents duplicate joins

### TravelPlanReview Model
- Reviews and ratings for travel plans
- One review per user per plan

## 🔒 Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **CORS**: Configured for specific client origins
- **Helmet**: Security headers protection
- **Input Validation**: Zod schema validation
- **Error Handling**: Centralized error handling middleware
- **Role-Based Access**: Admin and moderator roles

## 🧪 Testing

To test the API endpoints, you can use:

- **Postman** - Import the API collection
- **cURL** - Command-line tool
- **Thunder Client** - VS Code extension
- **Insomnia** - API testing tool

### Example: Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 📞 Support

For support, please open an issue in the repository or contact the development team.

## 🎯 Future Enhancements

- [ ] Real-time notifications
- [ ] WebSocket support for chat
- [ ] Image upload to cloud storage
- [ ] Advanced matching algorithms
- [ ] Travel plan recommendations
- [ ] Social features (follow, friend requests)
- [ ] Mobile app API optimizations

---

**Built with ❤️ using Node.js, Express, TypeScript, and MongoDB**

