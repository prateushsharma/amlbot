import { db } from "./db";
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

import { SupportedChain } from "./check";

const providerCache: Partial<Record<SupportedChain, ethers.JsonRpcProvider>> = {};

function getProvider(chain: SupportedChain) {
  if (providerCache[chain]) return providerCache[chain]!;
  const rpc =
    chain === "eth"
      ? process.env.ETH_RPC_URL
      : chain === "base"
      ? process.env.BASE_RPC_URL
      : process.env.AVAX_RPC_URL;

  if (!rpc) throw new Error("Missing RPC");

  const provider = new ethers.JsonRpcProvider(rpc);
  providerCache[chain] = provider;
  return provider;
}

export function startTrackingWorker() {
  setInterval(runTracking, 60_000);
}

async function runTracking() {
  const rows = db.prepare(`
    SELECT
      ta.id,
      ta.chain,
      ta.address,
      ta.min_amount,
      ta.notify_any_tx,
      ta.last_seen_cursor,
      u.telegram_user_id
    FROM tracked_addresses ta
    JOIN users u ON u.id = ta.user_id
    WHERE ta.is_active = 1
  `).all();

  for (const row of rows) {
    await processAddress(row);
  }
}

async function processAddress(row: any) {
  const provider = getProvider(row.chain as SupportedChain);
  const wallet = row.address.toLowerCase();

  const latestBlock = await provider.getBlockNumber();
  const fromBlock = row.last_seen_cursor
    ? Number(row.last_seen_cursor)
    : latestBlock - 20;

  for (let b = fromBlock + 1; b <= latestBlock; b++) {
    const block = await provider.getBlock(b, true);
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      const from = tx.from?.toLowerCase();
      const to = tx.to?.toLowerCase();
      if (from !== wallet && to !== wallet) continue;

      const value = Number(ethers.formatEther(tx.value));

      let trigger = false;

      if (row.notify_any_tx === 1) {
        trigger = true;
      } else if (value >= row.min_amount) {
        trigger = true;
      }

      if (!trigger) continue;

      const exists = db.prepare(`
        SELECT 1 FROM alert_events
        WHERE tracked_address_id = ? AND tx_hash_or_sig = ?
      `).get(row.id, tx.hash);

      if (exists) continue;

      db.prepare(`
        INSERT INTO alert_events (
          tracked_address_id,
          chain,
          tx_hash_or_sig,
          timestamp,
          direction,
          amount,
          asset,
          sent_to_telegram
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        row.id,
        row.chain,
        tx.hash,
        block.timestamp,
        to === wallet ? "in" : "out",
        value,
        "ETH"
      );

      console.log("ALERT:", row.telegram_user_id, value);
    }
  }

  db.prepare(`
    UPDATE tracked_addresses
    SET last_seen_cursor = ?
    WHERE id = ?
  `).run(latestBlock, row.id);
}
