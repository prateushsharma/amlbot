import { Bot } from "grammy";
import dotenv from "dotenv";
import { checkWallet } from "./check";
import { startTrackingWorker } from "./tracking";
import { db } from "./db";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");

type Chain =
    | "eth"
    | "base"
    | "avax"
    | "arb"
    | "op"
    | "blast"
    | "mantle"
    | "ink";

type CheckState = {
    mode: "check" | "tracking";
    step: "awaiting_chain" | "awaiting_address" | "awaiting_label" | "awaiting_min_amount";
    chain?: Chain;
    address?: string;
    label?: string;
};

const checkState = new Map<number, CheckState>();

export const bot = new Bot(BOT_TOKEN);
startTrackingWorker();

/* ================= KEYBOARDS ================= */

const mainMenuKeyboard = {
    inline_keyboard: [
        [{ text: "🔍 Check", callback_data: "menu:check" }],
        [{ text: "📊 Tracking", callback_data: "menu:tracking" }],
        [{ text: "👤 My account", callback_data: "menu:account" }],
    ],
};

const chainKeyboard = {
    inline_keyboard: [
        [
            { text: "Ethereum", callback_data: "chain:eth" },
            { text: "Base", callback_data: "chain:base" },
            { text: "Avalanche", callback_data: "chain:avax" },
        ],
        [
            { text: "Arbitrum", callback_data: "chain:arb" },
            { text: "Optimism", callback_data: "chain:op" },
            { text: "Blast", callback_data: "chain:blast" },
        ],
        [
            { text: "Mantle", callback_data: "chain:mantle" },
            { text: "Ink", callback_data: "chain:ink" },
        ],
        [{ text: "⬅️ Back", callback_data: "nav:menu" }],
    ],
};

const cancelKeyboard = {
    inline_keyboard: [[{ text: "❌ Cancel", callback_data: "nav:cancel" }]],
};

/* ================= START ================= */

bot.command("start", async (ctx) => {
    await ctx.reply(
        "👋 Welcome to SettlX AML Bot\n\nChoose an option:",
        { reply_markup: mainMenuKeyboard }
    );
});

/* ================= CALLBACK HANDLER ================= */

bot.on("callback_query:data", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const data = ctx.callbackQuery.data;
    await ctx.answerCallbackQuery();

    /* Navigation */
    if (data === "nav:menu") {
        checkState.delete(userId);
        await ctx.reply("Main menu:", { reply_markup: mainMenuKeyboard });
        return;
    }

    if (data === "nav:cancel") {
        checkState.delete(userId);
        await ctx.reply("❌ Action cancelled.", { reply_markup: mainMenuKeyboard });
        return;
    }

    /* Menu */
    if (data === "menu:check") {
        checkState.set(userId, {
            mode: "check",
            step: "awaiting_chain",
        });

        await ctx.reply("Select chain to check:", {
            reply_markup: chainKeyboard,
        });
        return;
    }

    if (data === "menu:tracking") {
        checkState.set(userId, {
            mode: "tracking",
            step: "awaiting_chain",
        });

        await ctx.reply("Select chain to track:", {
            reply_markup: chainKeyboard,
        });
        return;
    }

    if (data === "menu:account") {
        const rows = db.prepare(`
            SELECT chain, address, label, min_amount
            FROM tracked_addresses ta
            JOIN users u ON u.id = ta.user_id
            WHERE u.telegram_user_id = ? AND ta.is_active = 1
        `).all(userId);

        if (rows.length === 0) {
            await ctx.reply("You are not tracking any wallets yet.", {
                reply_markup: mainMenuKeyboard,
            });
            return;
        }

        let msg = "👤 My Account\n\nTracked wallets:\n\n";
        for (const r of rows) {
            msg +=
                `• ${r.label || "Unnamed"}\n` +
                `  Chain: ${r.chain.toUpperCase()}\n` +
                `  Min amount: ${r.min_amount}\n` +
                `  Address: ${r.address}\n\n`;
        }

        await ctx.reply(msg, { reply_markup: mainMenuKeyboard });
        return;
    }

    /* Chain selection */
    if (data.startsWith("chain:")) {
        const chain = data.split(":")[1] as Chain;
        const state = checkState.get(userId);
        if (!state) return;

        state.chain = chain;
        state.step = "awaiting_address";
        checkState.set(userId, state);

        await ctx.reply(
            `Selected ${chain.toUpperCase()}.\n\nPlease send the wallet address:`,
            { reply_markup: cancelKeyboard }
        );
    }
});

/* ================= TEXT FLOW ================= */

bot.on("message:text", async (ctx) => {
    if (ctx.message.text.startsWith("/")) return;

    const userId = ctx.from?.id;
    if (!userId) return;

    const state = checkState.get(userId);
    if (!state) return;

    const text = ctx.message.text.trim();

    /* ---------- ADDRESS STEP ---------- */
    if (state.step === "awaiting_address" && state.chain) {
        state.address = text;

        // ✅ CHECK MODE → END HERE
        if (state.mode === "check") {
            try {
                const result = await checkWallet({
                    chain: state.chain,
                    address: state.address,
                });

                const reply =
                    "✅ Wallet Check Complete\n\n" +
                    `Chain: ${state.chain.toUpperCase()}\n` +
                    `Address: ${state.address}\n\n` +
                    `Risk Score: ${result.riskScore}\n` +
                    `Risk Level: ${result.riskLevel}\n\n` +
                    "Reasons:\n" +
                    result.reasons.map((r) => `- ${r}`).join("\n") +
                    "\n\nExplorer:\n" +
                    result.explorerLink;

                await ctx.reply(reply);
            } catch (err) {
                console.error(err);
                await ctx.reply("❌ Error checking wallet.");
            } finally {
                checkState.delete(userId);
                await ctx.reply("Back to menu:", {
                    reply_markup: mainMenuKeyboard,
                });
            }
            return;
        }

        // 📊 TRACKING → CONTINUE
        state.step = "awaiting_label";
        checkState.set(userId, state);

        await ctx.reply(
            "Please enter a label for this address:",
            { reply_markup: cancelKeyboard }
        );
        return;
    }

    /* ---------- LABEL STEP (TRACKING ONLY) ---------- */
    if (state.step === "awaiting_label" && state.address && state.chain) {
        state.label = text;
        state.step = "awaiting_min_amount";
        checkState.set(userId, state);

        await ctx.reply(
            "Set a minimum transaction amount for alerts.\n" +
            "Only transactions ≥ this value will trigger alerts.\n\n" +
            "Example: 0 or 0.5",
            { reply_markup: cancelKeyboard }
        );
        return;
    }

    /* ---------- FINAL STEP (TRACKING ONLY) ---------- */
    if (
        state.step === "awaiting_min_amount" &&
        state.address &&
        state.chain &&
        state.label
    ) {
        const minAmount = Number(text);
        if (isNaN(minAmount) || minAmount < 0) {
            await ctx.reply("Please enter a valid number (e.g. 0 or 0.5).");
            return;
        }

        try {
            const result = await checkWallet({
                chain: state.chain,
                address: state.address,
            });

            await ctx.reply(
                "📡 Tracking enabled!\n\n" +
                `Chain: ${state.chain.toUpperCase()}\n` +
                `Label: ${state.label}\n` +
                `Min amount: ${minAmount}\n\n` +
                `Risk Level: ${result.riskLevel}`
            );

            db.prepare(`
                INSERT OR IGNORE INTO users (telegram_user_id)
                VALUES (?)
            `).run(userId);

            const userRow = db.prepare(`
                SELECT id FROM users WHERE telegram_user_id = ?
            `).get(userId) as { id: number };

            db.prepare(`
                INSERT INTO tracked_addresses (
                    user_id,
                    chain,
                    address,
                    label,
                    min_amount,
                    is_active
                ) VALUES (?, ?, ?, ?, ?, 1)
            `).run(
                userRow.id,
                state.chain,
                state.address,
                state.label,
                minAmount
            );
        } catch (err) {
            console.error(err);
            await ctx.reply("❌ Error enabling tracking.");
        } finally {
            checkState.delete(userId);
            await ctx.reply("Back to menu:", {
                reply_markup: mainMenuKeyboard,
            });
        }
    }
});
