import { describe, expect, it, vi } from "vitest";
import { TypeSafeClient, type Fetch } from "@typesafe-ai/sdk";
import { novaJevFetch } from "../src/reflex/jev/nova.js";

const base = "https://llm-proxy.tapsvc.com";
describe("Nova Jev protocol with fixed transport", () => {
  it("routes a real SDK request to Decisions and keeps the observed model", async () => {
    const fetch: Fetch = async (url, init) => {
      expect(url).toBe(`${base}/api/alpha/decisions`);
      expect(init?.redirect).toBe("error");
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("typesafe/jev-1.14");
      const name = Object.keys(body.questions)[0]!;
      return new Response(JSON.stringify({ model: "typesafe/jev-1.14", answers: { [name]: { type: "noul", noul: 1 } },
        usage: { input_tokens: 10, output_tokens: 2 } }));
    };
    const client = new TypeSafeClient({ apiKey: "synthetic-only", baseURL: base, defaultModel: "jev-1.14.0",
      fetch: novaJevFetch(base, fetch), retry: { maxRetries: 0 } });
    const result = await client.systemOne({ model: "jev-1.14.0", state: "fixed", questions: { check: { type: "noul", instructions: "fixed" } } });
    expect(result.model).toBe("typesafe/jev-1.14");
  });
  it("adapts the gateway catalog for the existing doctor's SDK reader", async () => {
    const client = new TypeSafeClient({ apiKey: "synthetic-only", baseURL: base,
      fetch: novaJevFetch(base, async () => new Response(JSON.stringify({ data: [{ id: "deepseek/deepseek-flash" }, { id: "typesafe/jev-1.14" }] }))) });
    expect(await client.models.list()).toMatchObject([{ name: "typesafe/jev-1.14" }]);
  });
  it("never dispatches a foreign origin, unknown model, or foreign endpoint", async () => {
    const transport = vi.fn<Fetch>(); const fetch = novaJevFetch(base, transport);
    await expect(fetch("https://api.typesafe.ai/v1/systemone", {})).rejects.toThrow("origin_mismatch");
    await expect(fetch(`${base}/v1/systemone`, { body: JSON.stringify({ model: "jev-unknown" }) })).rejects.toThrow("unsupported_nova_jev_model");
    await expect(fetch(`${base}/unknown`, {})).rejects.toThrow("endpoint");
    expect(transport).not.toHaveBeenCalled();
  });
  it("leaves a non-Nova transport untouched", () => {
    const transport = vi.fn<Fetch>();
    expect(novaJevFetch("https://api.typesafe.ai", transport)).toBe(transport);
  });
});
