"""Fake OpenAI Responses endpoint: logs request bodies only (never headers), answers with a fixed SSE stream."""
import json, sys, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOG = sys.argv[2]
ANSWER = sys.argv[3] if len(sys.argv) > 3 else '{"choice":"a","reason":"ok"}'

def decode(raw, enc):
    if enc == "zstd":
        try:
            from compression import zstd
            return zstd.decompress(raw)
        except Exception as e:
            return ("<zstd body: %s>" % e).encode()
    if enc == "gzip":
        import gzip
        return gzip.decompress(raw)
    return raw

class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass
    def _log(self, body):
        with open(LOG, "a") as f:
            f.write(json.dumps({"method": self.command, "path": self.path, "body": body}) + "\n")
    def do_GET(self):
        self._log(None)
        out = json.dumps({"object": "list", "data": [], "models": []}).encode()
        self.send_response(200); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(out))); self.end_headers(); self.wfile.write(out)
    def do_POST(self):
        n = int(self.headers.get("content-length") or 0)
        raw = decode(self.rfile.read(n), self.headers.get("content-encoding"))
        try:
            body = json.loads(raw)
        except Exception:
            body = raw.decode("utf-8", "replace")[:2000]
        self._log(body)
        events = [
            {"type": "response.created", "response": {"id": "resp_fake"}},
            {"type": "response.output_item.done", "item": {"type": "message", "role": "assistant", "id": "msg_fake", "content": [{"type": "output_text", "text": ANSWER}]}},
            {"type": "response.completed", "response": {"id": "resp_fake", "usage": {"input_tokens": 1000, "input_tokens_details": {"cached_tokens": 600}, "output_tokens": 50, "output_tokens_details": {"reasoning_tokens": 30}, "total_tokens": 1050}}},
        ]
        self.send_response(200); self.send_header("content-type", "text/event-stream"); self.end_headers()
        for e in events:
            self.wfile.write(("event: %s\ndata: %s\n\n" % (e["type"], json.dumps(e))).encode()); self.wfile.flush()

srv = ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H)
srv.serve_forever()
