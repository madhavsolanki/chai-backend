// Importing the Express library to set up a web server
import express from "express"

// Importing the cookie-parser middleware to parse cookies sent with HTTP requests
import cookieParser from "cookie-parser"

// Importing the CORS (Cross-Origin Resource Sharing) middleware 
// to allow or restrict requests from different origins
import cors from "cors"

// Creating an Express application instance
const app = express()

// Middleware for handling CORS
app.use(cors({
  // Allowing requests from the origin specified in the environment variable CORS_ORIGIN
  origin:process.env.CORS_ORIGIN,

  // Enabling the server to accept requests that include credentials (cookies, authorization headers, etc.)
  credentials:true
}))

// Middleware to parse incoming JSON requests with a size limit of 16KB
app.use(express.json({limit:"16kb"}))

// Middleware to parse incoming URL-encoded data (form data) with a size limit of 16KB
app.use(express.urlencoded({extended:true, limit:"16kb"}))

// Middleware to serve static files from the "public" directory
// For example, if a file `image.jpg` exists in the `public` folder,
// it can be accessed via `http://<your-server-url>/image.jpg`
app.use(express.static("public"))

// Middleware to parse cookies sent with HTTP requests
// The parsed cookies are stored in `req.cookies` for use in routes
app.use(cookieParser())

// Exporting the `app` object so it can be imported and used in other files (e.g., for setting up routes or starting the server)


// routes import
import userRouter from './routes/user.routes.js'

// routes declaration
app.use("/api/v1/users", userRouter)

export {app}