#!/usr/bin/env node
import {
  getRuntime
} from "./chunk-2MF5MDUT.js";

// src/tools/stake.ts
import { parseEther } from "viem";
var SUBMIT_ABI = [
  {
    name: "submit",
    type: "function",
    inputs: [{ name: "_referral", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "payable"
  }
];
var REFERRAL = "0x0000000000000000000000000000000000000000";
async function stakeEth(amountEth, dryRun) {
  const rt = getRuntime();
  const value = parseEther(amountEth);
  const lidoAddress = rt.chainAddresses.stETH;
  const shouldDryRun = rt.config.mode === "simulation" ? dryRun !== false : !!dryRun;
  if (shouldDryRun) {
    let estimatedGas = "unavailable";
    try {
      const gas = await rt.publicClient.estimateContractGas({
        address: lidoAddress,
        abi: SUBMIT_ABI,
        functionName: "submit",
        args: [REFERRAL],
        value,
        account: "0x0000000000000000000000000000000000000001"
      });
      estimatedGas = gas.toString();
    } catch {
    }
    return {
      simulated: true,
      mode: rt.config.mode,
      network: rt.chainAddresses.name,
      action: "stake",
      amountEth,
      estimatedGas,
      expectedStETH: amountEth,
      note: "stETH rebases daily \u2014 your balance grows automatically after staking."
    };
  }
  const wallet = rt.getWallet();
  const hash = await wallet.writeContract({
    address: lidoAddress,
    abi: SUBMIT_ABI,
    functionName: "submit",
    args: [REFERRAL],
    value
  });
  const receipt = await rt.publicClient.waitForTransactionReceipt({ hash });
  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: "stake",
    amountEth,
    txHash: hash,
    status: receipt.status,
    gasUsed: receipt.gasUsed.toString()
  };
}

export {
  stakeEth
};
