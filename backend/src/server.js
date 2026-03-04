import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const config = {
  port: Number.parseInt(process.env.PORT || "8787", 10),
  host: process.env.HOST || "127.0.0.1",
  kcarApiBaseUrl: process.env.KCAR_API_BASE_URL || "https://api.kcar.com",
  kcarTimeoutMs: Number.parseInt(process.env.KCAR_TIMEOUT_MS || "5000", 10),
  allowedOrigins: new Set(
    (process.env.ALLOWED_ORIGINS || "http://localhost:4173,http://127.0.0.1:4173")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ),
};

function nowIso() {
  return new Date().toISOString();
}

function toJson(res, statusCode, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function buildCorsHeaders(origin) {
  if (!origin || !config.allowedOrigins.has(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Request-Id",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function apiError(code, message, status = 500, extra = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  Object.assign(error, extra);
  return error;
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 32) {
        reject(apiError("BAD_REQUEST", "요청 바디가 너무 큽니다.", 400));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(apiError("BAD_REQUEST", "요청 바디는 JSON 객체여야 합니다.", 400));
          return;
        }
        resolve(parsed);
      } catch {
        reject(apiError("BAD_REQUEST", "요청 바디 JSON 형식이 올바르지 않습니다.", 400));
      }
    });

    req.on("error", () => {
      reject(apiError("INTERNAL_ERROR", "요청 바디 처리 중 오류가 발생했습니다.", 500));
    });
  });
}

function normalizeBrand(item) {
  return {
    mnuftrCd: String(item?.mnuftrCd || ""),
    pathNm: String(item?.pathNm || ""),
    carType: item?.carType === "IMP" ? "IMP" : "KOR",
    count: Number.isFinite(item?.count) ? item.count : 0,
  };
}

async function fetchKcarBrands(sellType) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.kcarTimeoutMs);

  try {
    const response = await fetch(`${config.kcarApiBaseUrl}/bc/search/group/mnuftr`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wr_eq_sell_dcd: sellType,
        wr_in_multi_columns: "cntr_rgn_cd|cntr_cd",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw apiError("UPSTREAM_ERROR", `KCAR API 응답 오류: HTTP ${response.status}`, 502);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    if (!payload?.success || !Array.isArray(rows)) {
      throw apiError("UPSTREAM_ERROR", "KCAR API 응답 형식이 올바르지 않습니다.", 502);
    }

    return rows.map(normalizeBrand);
  } catch (error) {
    if (error.name === "AbortError") {
      throw apiError("TIMEOUT", "KCAR API 호출 시간이 초과되었습니다.", 504);
    }

    if (error.code && error.status) {
      throw error;
    }

    throw apiError("UPSTREAM_ERROR", "KCAR API 호출에 실패했습니다.", 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseSellType(body) {
  const raw = body.sellType;
  if (raw == null || raw === "") {
    return "ALL";
  }

  if (typeof raw !== "string") {
    throw apiError("BAD_REQUEST", "sellType은 문자열이어야 합니다.", 400);
  }

  const value = raw.trim().toUpperCase();
  if (!["ALL", "SELL"].includes(value)) {
    throw apiError("BAD_REQUEST", "sellType은 ALL 또는 SELL만 허용됩니다.", 400);
  }

  return value;
}

function routeNotFound(res, corsHeaders) {
  toJson(
    res,
    404,
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "요청한 API 경로를 찾을 수 없습니다.",
      },
    },
    corsHeaders,
  );
}

const server = createServer(async (req, res) => {
  const requestId = req.headers["x-request-id"] || randomUUID();
  const startedAt = Date.now();
  const origin = req.headers.origin;
  const corsHeaders = buildCorsHeaders(origin);

  res.setHeader("X-Request-Id", requestId);

  try {
    if (req.method === "OPTIONS") {
      if (Object.keys(corsHeaders).length === 0) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("CORS origin denied");
        return;
      }

      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      toJson(
        res,
        200,
        {
          success: true,
          data: {
            status: "ok",
            timestamp: nowIso(),
          },
        },
        corsHeaders,
      );
      return;
    }

    if (req.url === "/api/kcar/brands") {
      if (req.method !== "POST") {
        toJson(
          res,
          405,
          {
            success: false,
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: "POST 메서드만 허용됩니다.",
            },
          },
          {
            ...corsHeaders,
            Allow: "POST,OPTIONS",
          },
        );
        return;
      }

      const body = await readJsonBody(req);
      const sellType = parseSellType(body);
      const brands = await fetchKcarBrands(sellType);

      toJson(
        res,
        200,
        {
          success: true,
          data: brands,
          meta: {
            source: "kcar",
            fetchedAt: nowIso(),
          },
        },
        corsHeaders,
      );
      return;
    }

    routeNotFound(res, corsHeaders);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    const code = typeof error.code === "string" ? error.code : "INTERNAL_ERROR";
    const message = error.message || "서버 내부 오류가 발생했습니다.";

    toJson(
      res,
      status,
      {
        success: false,
        error: {
          code,
          message,
        },
      },
      corsHeaders,
    );
  } finally {
    const elapsed = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        level: "info",
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        elapsedMs: elapsed,
      }),
    );
  }
});

server.listen(config.port, config.host, () => {
  console.log(`KCAR proxy server listening on http://${config.host}:${config.port}`);
});
