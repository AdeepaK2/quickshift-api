const mongoose = require('mongoose');
require('dotenv').config();

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    // Directly use the MONGO_DB_URI environment variable
    // This assumes your MONGO_DB_URI already specifies the qs database
    // Example format: mongodb+srv://username:password@cluster.mongodb.net/qs
    const conn = await mongoose.connect(process.env.MONGO_DB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);   
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;