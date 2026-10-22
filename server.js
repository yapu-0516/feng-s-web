import http from "node:http";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateMessage } from "./scripts/core.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(ROOT, "data", "messages.json");
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY = 8 * 1024;
const lastPostByAddress = new Map();
let writeQueue = Promise.resolve();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function readMessages() {
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveMessage(value) {
  const item = {
    id: randomUUID(),
    name: value.name,
    message: value.message,
    createdAt: new Date().toISOString(),
  };

  const operation = writeQueue.catch(() => {}).then(async () => {
    const messages = await readMessages();
    messages.unshift(item);
    await writeFile(DATA_FILE, `${JSON.stringify(messages.slice(0, 100), null, 2)}\n`, "utf8");
  });
  writeQueue = operation.catch(() => {});

  await operation;
  return item;
}

function setSecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        rejectBody(new Error("BODY_TOO_LARGE"));
        request.destroy();
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

async function handleApi(request, response, pathname) {
  if (pathname !== "/api/messages") return false;

  if (request.method === "GET") {
    const messages = await readMessages();
    sendJson(response, 200, { messages: messages.slice(0, 60) });
    return true;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return true;
  }

  const address = request.socket.remoteAddress || "unknown";
  const lastPost = lastPostByAddress.get(address) || 0;
  if (Date.now() - lastPost < 8_000) {
    sendJson(response, 429, { error: "星火刚刚点亮，请稍候再留言。" });
    return true;
  }

  try {
    const payload = JSON.parse(await readBody(request));
    const validation = validateMessage(payload);
    if (!validation.ok) {
      sendJson(response, 400, { error: validation.error });
      return true;
    }

    const item = await saveMessage(validation.value);
    lastPostByAddress.set(address, Date.now());
    sendJson(response, 201, { message: item });
  } catch (error) {
    const message = error.message === "BODY_TOO_LARGE" ? "留言内容过长。" : "留言没有保存，请稍后再试。";
    sendJson(response, error.message === "BODY_TOO_LARGE" ? 413 : 400, { error: message });
  }
  return true;
}

async function serveStatic(request, response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const target = normalize(resolve(ROOT, `.${requestedPath}`));
  if (!target.startsWith(`${ROOT}${sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("NOT_FILE");
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extname(target).toLowerCase()] || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": "no-cache",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  setSecurityHeaders(response);
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname);
    if (await handleApi(request, response, pathname)) return;
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end("Method not allowed");
      return;
    }
    await serveStatic(request, response, pathname);
  } catch {
    if (!response.headersSent) response.writeHead(500);
    response.end("Server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`长征万里，薪火千秋: http://${HOST}:${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
