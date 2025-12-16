import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  botToken: process.env.BOT_TOKEN || "",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
};

if (!config.botToken) throw new Error("Missing BOT_TOKEN");
