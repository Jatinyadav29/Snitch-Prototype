import mongoose from "mongoose";
import config from "./config.js";

async function connectToDB() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Database connected successfully");
  } catch (error) {
    console.log(`Error in connection with database - ${error}`);
  }
}

export default connectToDB;
