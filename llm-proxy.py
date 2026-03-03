import subprocess
import threading
import time
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

# MODEL_PATH = "/Users/macbook/projects/gitea/Qwen3.5-0.8B-GGUF/Qwen3.5-0.8B-UD-Q4_K_XL.gguf"
MODEL_PATH = "/Users/macbook/projects/gitea/llm-inference/Qwen3.5-2B-GGUF/Qwen3.5-2B-UD-Q4_K_XL.gguf"

LLAMA_SERVER = "/Users/macbook/projects/gitea/llama.cpp/build/bin/llama-server"
BACKEND_PORT = 11435
PROXY_PORT = 11434
IDLE_TIMEOUT = 60  # seconds before shutting down

process = None
last_request_time = time.time()
lock = threading.Lock()

def start_server():
    global process
    with lock:
        if process and process.poll() is None:
            return
        print("🟢 Loading model...")
        process = subprocess.Popen(
            [
                LLAMA_SERVER,
                "--model", MODEL_PATH,
                "--ctx-size", "8192",
                "--n-gpu-layers", "99",
                "--port", str(BACKEND_PORT),
                "--host", "127.0.0.1"
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    # Wait until ready (outside lock)
    for _ in range(60):
        try:
            requests.get(f"http://127.0.0.1:{BACKEND_PORT}/health", timeout=1)
            print("✅ Model ready!")
            return
        except:
            time.sleep(1)
    print("❌ Model failed to start!")

def stop_server():
    global process
    with lock:
        if process and process.poll() is None:
            print("🔴 Shutting down model (idle timeout)")
            process.terminate()
            process = None

def watchdog():
    while True:
        time.sleep(10)
        if process and process.poll() is None:
            if time.time() - last_request_time > IDLE_TIMEOUT:
                stop_server()

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            status = "running" if (process and process.poll() is None) else "idle"
            self.wfile.write(json.dumps({"status": status}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        global last_request_time
        last_request_time = time.time()
        start_server()

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        # Check if client wants streaming
        try:
            is_stream = json.loads(body).get("stream", False)
        except:
            is_stream = False

        try:
            with requests.post(
                f"http://127.0.0.1:{BACKEND_PORT}{self.path}",
                headers={"Content-Type": "application/json"},
                data=body,
                stream=is_stream,
                timeout=600
            ) as resp:
                self.send_response(resp.status_code)
                self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))

                if is_stream:
                    self.send_header("Transfer-Encoding", "chunked")
                    self.end_headers()
                    for chunk in resp.iter_content(chunk_size=None):
                        if chunk:
                            size = f"{len(chunk):X}\r\n".encode()
                            self.wfile.write(size)
                            self.wfile.write(chunk)
                            self.wfile.write(b"\r\n")
                            self.wfile.flush()
                    self.wfile.write(b"0\r\n\r\n")
                else:
                    content = resp.content
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, format, *args):
        pass  # suppress logs

threading.Thread(target=watchdog, daemon=True).start()
print(f"🚀 Proxy listening on port {PROXY_PORT} (model loads on first request, idles after {IDLE_TIMEOUT}s)")
HTTPServer(("0.0.0.0", PROXY_PORT), ProxyHandler).serve_forever()
