import { Bot } from "grammy";
import dotenv from "dotenv";
import { checkWallet } from "./check";
import { startTrackingWorker} from "./tracking";
import { db } from "./db";
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");

type CheckState = {
    step: "awaiting_chain" | "awaiting_address";
    chain?: "eth" | "base" | "avax";
};


const checkState = new Map<number, CheckState>();



export const bot = new Bot(BOT_TOKEN);
 
startTrackingWorker();


// start command
bot.command("start", async (ctx) => {
    console.log("start command received")
    await ctx.reply(" Welcpme to settl x aml bot\n\n\n" +
        "Commands: \n" +
        "/check - wallet risk check \n " +
        "/tracking - Tracks a wallet\n" +
        "/help - Help"
        );
});

// help command
bot.command("help", async (ctx) => {
    console.log("help command received")
    await ctx.reply(
        " help\n\n" +
        "This bot helps you:\n" +
        "- Check wallet risk\n" +
        " - Track wallet activity\n\n" +
        "Available commands:\n" +
        "/start\n" + 
        "/check\n" +
        "/tracking\n" 
    );
});

bot.command("check", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    checkState.set(userId, {
        step: "awaiting_chain",
    });

    await ctx.reply("Select chain:", {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Ethereum", callback_data: "chain:eth" },
                    { text: "Base", callback_data: "chain:base" },
                    { text: "Avalanche", callback_data: "chain:avax" },
                ],
            ],
        },
    });
});

bot.command("tracking", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    checkState.set(userId, {
        step: "awaiting_chain",
    });

    await ctx.reply("Select chain to track:", {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Ethereum", callback_data: "track:eth" },
                    { text: "Base", callback_data: "track:base" },
                    { text: "Avalanche", callback_data: "track:avax" },
                ],
            ],
        },
    });
});

bot.on("callback_query:data", async (ctx) => {
    console.log("🔘 callback query received");

    const userId = ctx.from?.id;
    if (!userId) return;

    const data = ctx.callbackQuery.data;

    if (data.startsWith("track:")){
        const chain = data.split(":")[1] as "eth" | "base" | "avax";

        checkState.set(userId, {
            step: "awaiting_address",
            chain,
        });

        await ctx.answerCallbackQuery();
        await ctx.reply(
            `Tracking on ${chain.toUpperCase()} enabled. \n\n` +
            "Please send the wallet address to track:  "
        );
        return ;
    }
    const state = checkState.get(userId);
    if (!state || state.step !== "awaiting_chain") return;

  
    console.log("📦 callback data:", data);

    if (!data.startsWith("chain:")) return;

    const chain = data.split(":")[1] as "eth" | "base" | "avax";

    checkState.set(userId, {
        step: "awaiting_address",
        chain,
    });

    // 🔴 THIS LINE IS MANDATORY
    await ctx.answerCallbackQuery();

    await ctx.reply(
        `Selected chain: ${chain.toUpperCase()}\n\n` +
        "Please enter the wallet address:"
    );
});

bot.on("message:text", async (ctx) => {
    // 🚫 Ignore commands
    if (ctx.message.text.startsWith("/")) return;

    const userId = ctx.from?.id;
    if (!userId) return;

    const state = checkState.get(userId);
    if (!state || state.step !== "awaiting_address" || !state.chain) return;

    const address = ctx.message.text.trim();

    try {
        // 1️⃣ Run wallet analysis
        const result = await checkWallet({
            chain: state.chain,
            address,
        });

        // 2️⃣ Send analysis result
        const reply =
            "✅ Wallet Check Complete\n\n" +
            `Chain: ${state.chain.toUpperCase()}\n` +
            `Address: ${address}\n\n` +
            `Risk Score: ${result.riskScore}\n` +
            `Risk Level: ${result.riskLevel}\n\n` +
            "Reasons:\n" +
            result.reasons.map((r) => `- ${r}`).join("\n") +
            "\n\nExplorer:\n" +
            result.explorerLink;

        await ctx.reply(reply);

        // 3️⃣ Ensure user exists in DB
        db.prepare(`
            INSERT OR IGNORE INTO users (telegram_user_id)
            VALUES (?)
        `).run(userId);

        // 4️⃣ Fetch internal user id
        const userRow = db.prepare(`
            SELECT id FROM users WHERE telegram_user_id = ?
        `).get(userId) as { id: number };

        // 5️⃣ Insert tracked address
        db.prepare(`
            INSERT INTO tracked_addresses (
                user_id,
                chain,
                address,
                is_active
            ) VALUES (?, ?, ?, 1)
        `).run(userRow.id, state.chain, address);

        // 6️⃣ Confirmation
        await ctx.reply("📡 Tracking enabled for this wallet.");

    } catch (err) {
        console.error("checkWallet error:", err);
        await ctx.reply(
            "❌ Error checking wallet. Please ensure the address is valid."
        );
    } finally {
        // 7️⃣ Always clear state
        checkState.delete(userId);
    }
});
