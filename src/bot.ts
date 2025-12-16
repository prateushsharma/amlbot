import { Bot } from "grammy";
import dotenv from "dotenv";
import { checkWallet } from "./check";
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");

type CheckState = {
    step: "awaiting_chain" | "awaiting_address";
    chain?: "eth" | "base" | "avax";
};


const checkState = new Map<number, CheckState>();



export const bot = new Bot(BOT_TOKEN);
 


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
bot.on("callback_query:data", async (ctx) => {
    console.log("🔘 callback query received");

    const userId = ctx.from?.id;
    if (!userId) return;

    const state = checkState.get(userId);
    if (!state || state.step !== "awaiting_chain") return;

    const data = ctx.callbackQuery.data;
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
        const result = await checkWallet({
            chain: state.chain,
            address,
        });

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
    } catch (err) {
        console.error("checkWallet error:", err);
        await ctx.reply("❌ Error checking wallet. Please ensure the address is valid.");
    } finally {
        checkState.delete(userId);
    }
});


