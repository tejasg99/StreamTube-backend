# StreamTube Backend
StreamTube Backend is the server-side component of a video-sharing platform designed to support and manage backend functionalities, including user management, video streaming, playlists, subscriptions, likes, and channel statistics. This backend project integrates key features essential for modern video platforms.

## Technology Stack
- Node.js - JavaScript runtime that enables scalable server-side and network applications.
- Express.js - Minimalist web framework for Node.js that helps create RESTful APIs with efficiency.
- MongoDB - NoSQL database that provides flexibility in managing unstructured data, ideal for video metadata, user data, and channel stats.
- Mongoose - ODM (Object Data Modeling) library for MongoDB and Node.js, simplifying data manipulation and validation.
- JWT (JSON Web Tokens) - Industry-standard for securely transmitting information between parties as JSON objects for authentication and authorization.
- Bcrypt - Password-hashing function for secure storage and comparison of user credentials.
- Cloudinary - image and video storage solutions for handling video files in the cloud.
- Multer - Middleware for handling multipart/form-data, primarily for uploading files.

## Features
- User Authentication and Authorization - 
    Secure signup and login with JWT-based authentication and password hashing using Bcrypt.
    Role-based access for managing admin and user rights.
- Video Management - 
    Supports video upload, storage, retrieval, and deletion.
    Metadata storage for each video, including title, description, tags, and views.
    Optional integration with cloud storage for efficient handling of video files.
- Playlists and Subscriptions - 
    Users can create custom playlists, add/remove videos, and reorder playlist items.
    Subscription functionality allowing users to subscribe to channels, with a notification system for new uploads.
- Engagement Features - 
    Like and dislike system to gauge user engagement and feedback.
    Commenting feature with real-time updates (if integrated with Socket.io).
    Aggregated channel statistics including total views, likes, subscribers, and engagement rate.
- Channel and User Analytics - 
    Detailed analytics for each channel, tracking metrics like watch time, view count, and engagement.
    Aggregated data collection for creating personalized recommendations based on user viewing habits.
- Search and Filtering - 
    Efficient video search based on titles, tags, and descriptions.
- Data validation and request sanitization to secure endpoints.

## Setup Instructions
1. Clone the Repository
````
git clone https://github.com/tejasg99/StreamTube-backend.git
cd StreamTube-backend
````
2. Install Dependencies
````
npm install
````
3. Environment Variables - Create a .env file in the root directory with the following:
````
DATABASE_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
````
4. Start the Server
````
npm run dev
````
5. The server should now be running.