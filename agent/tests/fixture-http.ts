import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { vi } from "vitest";
import type { TestServer } from "./support.js";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
const handlers = new Map<string, Handler>();
let nextId = 0;
let restore: (() => void) | null = null;

/** Serialized fixture requests without sockets, DNS, keep-alive or an external fallback. */
export async function startFixtureServer(handler: Handler): Promise<TestServer> {
  if (!restore) {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      request.signal.throwIfAborted();
      const url = new URL(request.url);
      const serve = handlers.get(url.origin);
      if (!serve) throw new Error(`unregistered fixture origin: ${url.origin}`);
      const body = Buffer.from(await request.arrayBuffer());
      return new Promise<Response>((resolve, reject) => {
        const req = Object.assign(Readable.from(body.length ? [body] : []), {
          method: request.method, url: url.pathname + url.search,
          headers: Object.fromEntries(request.headers),
        });
        let status = 200;
        let headers: Record<string, string> = {};
        const abort = (): void => reject(request.signal.reason);
        request.signal.addEventListener("abort", abort, { once: true });
        const res = {
          writeHead(code: number, values: Record<string, string>) { status = code; headers = values; return res; },
          end(data?: string) {
            request.signal.removeEventListener("abort", abort);
            resolve(new Response(data ?? null, { status, headers }));
          },
        };
        req.on("error", reject);
        try { serve(req as IncomingMessage, res as unknown as ServerResponse); }
        catch (error) { request.signal.removeEventListener("abort", abort); reject(error); }
      });
    });
    restore = () => spy.mockRestore();
  }
  const url = `http://fixture-${++nextId}.invalid`;
  handlers.set(url, handler);
  return { url, port: 0, close: async () => {
    handlers.delete(url);
    if (handlers.size === 0) { restore?.(); restore = null; }
  } };
}
