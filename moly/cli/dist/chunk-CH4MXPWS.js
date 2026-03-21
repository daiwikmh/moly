#!/usr/bin/env node

// src/bounds/store.ts
import { existsSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from "fs";
import { homedir } from "os";
import { join } from "path";
var BOUNDS_PATH = join(homedir(), ".moly", "bounds.json");
var DEFAULT_BOUNDS = {
  maxStakePerTx: 10,
  maxDailyStake: 50,
  minEthReserve: 0.5,
  autoRestakeThreshold: 0.05,
  governanceAutoVote: false,
  dailyStaked: 0,
  lastResetDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
};
function loadBounds() {
  if (!existsSync(BOUNDS_PATH)) return { ...DEFAULT_BOUNDS };
  try {
    return { ...DEFAULT_BOUNDS, ...JSON.parse(readFileSync(BOUNDS_PATH, "utf-8")) };
  } catch {
    return { ...DEFAULT_BOUNDS };
  }
}
function saveBounds(b) {
  writeFileSync(BOUNDS_PATH, JSON.stringify(b, null, 2), "utf-8");
  try {
    chmodSync(BOUNDS_PATH, 384);
  } catch {
  }
}
function resetBounds() {
  if (existsSync(BOUNDS_PATH)) unlinkSync(BOUNDS_PATH);
}

export {
  DEFAULT_BOUNDS,
  loadBounds,
  saveBounds,
  resetBounds
};
