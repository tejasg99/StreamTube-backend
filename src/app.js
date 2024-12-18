import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.middleware.js";

const app = express()

const allowedOrigins = [
    // production origin to be added here
    // "http://localhost:5173",
    "https://visitstreamtube.vercel.app",
]

console.log("Allowed origins: ", allowedOrigins);

app.use(cors({
    origin: "https://visitstreamtube.vercel.app", // Allow requests from this specific origin
    credentials: true,               // Allow credentials (cookies, authorization headers)
}));

// Configurations to handle requests
// Middlewares
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true, limit: "50mb"}));
app.use(express.static("public"));
app.use(cookieParser());

app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});


// Routes import
import userRouter from "./routes/user.routes.js"
import healthcheckRouter from "./routes/healthcheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"

// Routes declaration 
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)

// Error handler middleware to send json responses instead of html
app.use(errorHandler);

// http://localhost:8000/api/v1/users/register

export { app }