import express from "express";
import cors from "cors";
import { getFusedData } from "./services/fusion.service.js";

const app = express();
app.use(cors());

app.get("/api/fusion", async (req, res) => {
  try {
    const data = await getFusedData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(10000, () =>
  console.log("✅ Backend running on port 10000")
);
