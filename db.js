
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const schema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { collection: "devnova_state" });

const State = mongoose.model("State", schema);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log("MongoDB Atlas connected!");
  } catch (err) {
    console.error("MongoDB error:", err.name);
    console.error("Message:", err.message);
    console.dir(err.reason?.servers, { depth: 3 });
    throw err;
  }
}

async function loadData() {
  let state = await State.findOne({ key: "main" });

  if (state) return state.data;

  const file = path.join(__dirname, "data.json");
  let data = { users: [], conversations: [] };

  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  }

  data.users ??= [];
  data.conversations ??= [];

  await State.create({ key: "main", data });
  console.log("Initial data imported into MongoDB.");

  return data;
}

async function saveData(data) {
  await State.updateOne(
    { key: "main" },
    { $set: { data } },
    { upsert: true }
  );
}

module.exports = { connectDB, loadData, saveData };
