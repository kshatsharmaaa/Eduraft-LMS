// npm install express nodemon dotenv cors cloudinary mongoose multer stripe svix@1.42.0 @clerk/express
import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks } from './controllers/webhooks.js'

// Intialize express
const app = express()

// Connect to database
await connectDB()

// Middleware
app.use(cors())

// Routes
app.get('/', (req, res) => res.send("API is running"))
app.post('/clerk', express.json(), clerkWebhooks)

// PORT
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
// npm run server 