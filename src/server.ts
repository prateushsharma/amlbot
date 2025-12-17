import express from "express";
import dotenv from "dotenv";
import { bot } from "./bot.js";

dotenv.config();

const PORT = process.env.PORT || 3000;


bot.init();

async function startServer() {
    await bot.init();
    console.log("bot initialized");
const app = express();
app.use(express.json())

app.post("/telegram/webhook", async (req:any, res:any) => {
  try {
    console.log("telegram webhook hit")
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    res.sendStatus(200); 
  }
});


// telegram webhook endpoint

app.get("/health", (_req, res) => {
  res.json({ok:true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
}
startServer().catch((err) => {
  console.error("Fatal startup error:", err);
});














