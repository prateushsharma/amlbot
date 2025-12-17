import { checkWallet } from "./check";
import { bot } from "./bot";

type TrackedWallet = {
    userId: number,
    chain: "eth" | "base" | "avax";
    address: string;
    lastRiskLevel: "Low"|"Medium"|"High";
};

const tracked = new Map<string, TrackedWallet>();

function key(w: TrackedWallet) {
    return `${w.userId}:${w.address}`;
}

export function addTrackedWallet(w: TrackedWallet) {
    tracked.set(key(w), w);
}

export function startTrackingWorker() {
    setInterval(async () => {
        for (const [k,w] of tracked.entries()) {
            try {
                const result = await checkWallet({
                    chain: w.chain,
                    address: w.address,
                });

                if (result.riskLevel !== w.lastRiskLevel) {
                    tracked.set(k, {
                        ...w,
                        lastRiskLevel: result.riskLevel,
                    });
                    await bot.api.sendMessage(
                        w.userId,
                        `🚨 Risk level changed\n\n` +
              `Chain: ${w.chain.toUpperCase()}\n` +
              `Address: ${w.address}\n` +
              `New level: ${result.riskLevel}\n\n` +
              result.explorerLink
                    );
                }
            } catch (e) {
                console.error("tracking error",e);
            }
        }
    }, 5 * 60 * 1000);
}