// wallet check service
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

export type SupportedChain = "eth" | "base" | "avax";

const CHAIN_CONFIG = {
  eth: {
    rpcEnv: "ETH_RPC_URL",
    explorer: "https://etherscan.io/address/",
    name: "Ethereum",
  },
  base: {
    rpcEnv: "BASE_RPC_URL",
    explorer: "https://basescan.org/address/",
    name: "Base",
  },
  avax: {
    rpcEnv: "AVAX_RPC_URL",
    explorer: "https://snowtrace.io/address/",
    name: "Avalanche",
  },
} as const;

const providerCache: Partial<Record<SupportedChain, ethers.JsonRpcProvider>> = {};

function getProvider(chain: SupportedChain): ethers.JsonRpcProvider {
  if (providerCache[chain]) return providerCache[chain]!;

  const cfg = CHAIN_CONFIG[chain];
  const rpcUrl = process.env[cfg.rpcEnv];
  if (!rpcUrl) throw new Error(`Missing ${cfg.rpcEnv}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  providerCache[chain] = provider;
  return provider;
}

export type CheckInput = {
  chain: SupportedChain;
  address: string;
};

export type CheckResult = {
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  reasons: string[];
  recentActivity: {
    direction: "in" | "out";
    amount: string;
    asset: string;
    txHash: string;
  }[];
  explorerLink: string;
};

export async function checkWallet(
  input: CheckInput
): Promise<CheckResult> {
  const { chain, address } = input;
  const cfg = CHAIN_CONFIG[chain];
  const provider = getProvider(chain);

  const wallet = ethers.getAddress(address).toLowerCase();
  const latestBlock = await provider.getBlockNumber();

  const BLOCK_WINDOW = 150;

  const txs: {
    direction: "in" | "out";
    amount: number;
    txHash: string;
    timestamp: number;
  }[] = [];

  for (let b = latestBlock; b > latestBlock - BLOCK_WINDOW; b--) {
    const block = await provider.getBlock(b, true);
    if (!block?.transactions) continue;

    for (const tx of block.transactions) {
      const from = tx.from?.toLowerCase();
      const to = tx.to?.toLowerCase();
      if (from !== wallet && to !== wallet) continue;

      txs.push({
        direction: to === wallet ? "in" : "out",
        amount: Number(ethers.formatEther(tx.value)),
        txHash: tx.hash,
        timestamp: block.timestamp,
      });
    }
  }

  let riskScore = 0;
  const reasons: string[] = [];

  // 🔴 NEW HEURISTIC: >1 tx/min in last 10 minutes
  const now = Math.floor(Date.now() / 1000);
  const TEN_MIN = 10 * 60;

  const recentTxs = txs.filter(
    (t) => now - t.timestamp <= TEN_MIN
  );

  const txPerMin = recentTxs.length / 10;

  if (txPerMin > 1) {
    riskScore += 40;
    reasons.push(
      "High frequency activity (>1 tx/min) in last 10 minutes"
    );
  }

  // existing heuristics
  if (txs.length > 20) {
    riskScore += 25;
    reasons.push("High number of transactions recently");
  }

  const maxInflow = Math.max(
    0,
    ...txs.filter(t => t.direction === "in").map(t => t.amount)
  );

  if (maxInflow > 10) {
    riskScore += 25;
    reasons.push("Large inflow transaction detected");
  }

  riskScore = Math.min(riskScore, 100);

  const riskLevel: CheckResult["riskLevel"] =
    riskScore >= 70 ? "High" :
    riskScore >= 35 ? "Medium" :
    "Low";

  return {
    riskScore,
    riskLevel,
    reasons,
    recentActivity: txs.slice(0, 5).map(tx => ({
      direction: tx.direction,
      amount: tx.amount.toString(),
      asset: "ETH",
      txHash: tx.txHash,
    })),
    explorerLink: `${cfg.explorer}${wallet}`,
  };
}
