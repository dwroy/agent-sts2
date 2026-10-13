/** Offline V5 entrypoint: JSON in/out, fixed observations only, no network or game actions. */
import { readFileSync } from "node:fs";
import { applyBuildActions, forecastConstruction, type ForecastInput } from "../src/construction/planner.js";
import type { BuildAction, BuildState } from "../src/construction/types.js";

const request = JSON.parse(readFileSync(0, "utf8")) as { method: string; input: ForecastInput; state: BuildState; actions: BuildAction[] };
if (request.method === "forecast") console.log(JSON.stringify(forecastConstruction(request.input)));
else if (request.method === "apply-actions") console.log(JSON.stringify({ state: applyBuildActions(request.state, request.actions) }));
else throw new Error("expected forecast or apply-actions");
