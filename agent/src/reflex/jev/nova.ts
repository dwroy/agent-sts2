import { measureDecisionBudgetStage } from "../../core/decision-budget.js";
import type { Fetch } from "@typesafe-ai/sdk";

const NOVA_ORIGIN = "https://llm-proxy.tapsvc.com";
const MODELS: Readonly<Record<string, string>> = {
  "jev-1.13.0": "typesafe/jev-1.13",
  "jev-1.13": "typesafe/jev-1.13",
  "jev-1.14.0": "typesafe/jev-1.14",
  "jev-1.14": "typesafe/jev-1.14",
  "jev-latest": "typesafe/jev-1.14",
  "jev-preview": "typesafe/jev-1.14",
};

export function isNovaJev(baseURL: string | null | undefined): boolean {
  if (!baseURL) return false;
  const url = new URL(baseURL);
  return url.origin === NOVA_ORIGIN && url.pathname === "/" && !url.search && !url.hash;
}

export function novaJevModel(model: string): string {
  if (model === "typesafe/jev-1.13" || model === "typesafe/jev-1.14") return model;
  const resolved = MODELS[model];
  if (!resolved) throw new Error("unsupported_nova_jev_model");
  return resolved;
}

/** Keep the observed provider model in telemetry; compare only documented gateway aliases. */
export function jevModelMatches(requested: string, resolved: string): boolean {
  if (requested === resolved) return true;
  if (!requested.startsWith("typesafe/") && !resolved.startsWith("typesafe/")) return false;
  try { return novaJevModel(requested) === novaJevModel(resolved); } catch { return false; }
}

/** Adapt the official SDK protocol, without retries or a fallback to a paid provider. */
export function novaJevFetch(baseURL: string | null | undefined, transport: Fetch): Fetch {
  if (!isNovaJev(baseURL)) return transport;
  return async (input, init) => {
    const url = new URL(input);
    if (url.origin !== NOVA_ORIGIN) throw new Error("nova_jev_origin_mismatch");
    let request = { ...init, redirect: "error" as const };
    if (url.pathname === "/v1/systemone") {
      if (typeof init?.body !== "string") throw new Error("nova_jev_requires_json");
      const encoded = measureDecisionBudgetStage("jev_gateway_request_encoding", () => {
        const body = JSON.parse(init.body as string) as { model?: string };
        if (!body.model) throw new Error("nova_jev_requires_model");
        body.model = novaJevModel(body.model);
        return JSON.stringify(body);
      });
      request = { ...request, body: encoded };
      url.pathname = "/api/alpha/decisions";
    } else if (url.pathname !== "/v1/models") throw new Error("unsupported_nova_jev_endpoint");
    const response = await measureDecisionBudgetStage("jev_http_to_headers", () => transport(url.toString(), request));
    if (!response.ok || url.pathname !== "/v1/models") return response;
    const payload = await response.json() as { data?: Array<{ id?: string }> };
    if (!Array.isArray(payload.data)) throw new Error("invalid_nova_model_catalog");
    const models = payload.data.filter((item) => item.id?.startsWith("typesafe/jev-"))
      .map((item) => ({ ...item, name: item.id }));
    const headers = new Headers(response.headers);
    headers.delete("content-length"); headers.delete("content-encoding");
    headers.set("content-type", "application/json");
    return new Response(JSON.stringify({ models }), { status: response.status, headers });
  };
}
