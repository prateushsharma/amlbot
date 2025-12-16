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
  if (providerCache[chain]) {
    return providerCache[chain]!;
  }

  const cfg = CHAIN_CONFIG[chain];
  const rpcUrl = process.env[cfg.rpcEnv];

  if (!rpcUrl) {
    throw new Error(`Missing ${cfg.rpcEnv}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  providerCache[chain] = provider;
  return provider;
}







const RPC_URL = process.env.ETH_RPC_URL;
if(!RPC_URL) throw new Error("Missing ETH_RPC_URL");

const provider = new ethers.JsonRpcProvider(RPC_URL);
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

export async function checkWallet(input: CheckInput): Promise<CheckResult> {
    const { chain, address } = input;

    const cfg = CHAIN_CONFIG[chain];

    // basic guard (temporary)
    if (!cfg) {
        throw new Error("Unsupported chain");
    }

        const provider = getProvider(chain);
    
    const wallet = ethers.getAddress(address);

    
    const latestBlock = await provider.getBlockNumber();

    // scan recent blocks
    const BLOCK_WINDOW = 150;
    const txs: {
        direction: "in" | "out";
        amount: number;
        txHash: string;
    }[] = [];

    for (let b = latestBlock; b > latestBlock - BLOCK_WINDOW; b--) {
        const block = await provider.getBlock(b, true);
        if (!block || !block.transactions) continue;

        for (const tx of block.transactions) {
            if (tx.to && !tx.from) continue;

            const from = tx.from?.toLowerCase();
            const to = tx.to?.toLowerCase();
            const addr = wallet.toLowerCase();

            if ( from === addr || to === addr) {
                const valueEth = Number(ethers.formatEther(tx.value));

                txs.push({
                    direction: to === addr ? "in" : "out",
          amount: valueEth,
          txHash: tx.hash,
                });
            }
        }}

    // This will be replaced later with real RPC calls

    let riskScore = 0;
   

   const reasons: string[] = [];

   // heuristic 1: high activity
   if (txs.length > 10) {
    riskScore += 30;
    reasons.push("High transaction frequency in short time window");
  }

  // heuristic 2: large inflow
  const maxInflow = Math.max(0, ...txs.filter(t => t.direction === "in").map(t => t.amount) );

  if (maxInflow > 10) {
    riskScore +=30;
    reasons.push("Large single inflow transaction detected");
  }

  // heuristic 3: brand-new / empty history wallet
  if (txs.length > 0 && txs.length < 2) {
    riskScore +=15;
    reasons.push("low historical activity (possible fresh wallet)");

  }
   // cap score
  riskScore = Math.min(riskScore, 100);


const riskLevel: CheckResult["riskLevel"] =
    riskScore > 70 ? "High" :
    riskScore > 30 ? "Medium" :
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