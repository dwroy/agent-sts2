/**
 * Vitest setup (vitest.config.ts): potion costs off by default, so the tests do not read the potion table that is
 * rebuilt every day (src/knowledge/potion-equivalents.json) and the older tests keep pinning the ranking without
 * costs, which is also POTION_COST=off's. The potion-cost tests switch it on with their own fixed table
 * (tests/potion-cost.test.ts).
 */
import { potionCostOptions } from "../src/strategy/potion-cost.js";

potionCostOptions.enabled = false;
