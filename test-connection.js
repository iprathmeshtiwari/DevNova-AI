
require("dotenv").config();
const mongoose = require("mongoose");

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });

    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("SUCCESS: MongoDB connection working!");

  } catch (err) {
    console.log("ERROR NAME:", err.name);
    console.log("ERROR MESSAGE:", err.message);

    if (err.reason?.servers) {
      for (const [host, server] of err.reason.servers) {
        console.log("SERVER:", host);
        console.log("STATUS:", server.type);
        console.log("DETAIL:", server.error?.message || "No server detail");
      }
    }
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

testConnection();
