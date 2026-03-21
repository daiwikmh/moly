#!/usr/bin/env node
import {
  applySettingsUpdate,
  getRuntime
} from "./chunk-OAISRMIP.js";
import {
  loadConfig,
  redactedConfig
} from "./chunk-ELH5VHWX.js";

// src/tools/stake.ts
import { parseEther, formatEther } from "viem";
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
  const account = rt.getAddress();
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
  const tx = await rt.sdk.stake.stakeEth({
    value,
    account: { address: account },
    callback: () => {
    }
  });
  return {
    simulated: false,
    mode: rt.config.mode,
    network: rt.chainAddresses.name,
    action: "stake",
    amountEth,
    txHash: tx.hash,
    stethReceived: formatEther(tx.result?.stethReceived ?? 0n),
    sharesReceived: formatEther(tx.result?.sharesReceived ?? 0n)
  };
}

// src/tools/settings.ts
function getSettings() {
  const cfg = loadConfig();
  return {
    ...redactedConfig(cfg),
    note: "Use update_settings to change mode, network, or rpc. Private key and API keys can only be changed via: moly setup"
  };
}
function updateSettings(patch) {
  if (Object.keys(patch).length === 0) {
    return { error: "No settings provided to update." };
  }
  const updated = applySettingsUpdate(patch);
  return {
    updated: true,
    changes: patch,
    current: redactedConfig(updated),
    note: "Settings saved and applied. SDK reinitialized with new config."
  };
}

export {
  stakeEth,
  getSettings,
  updateSettings
};
