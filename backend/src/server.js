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

function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
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
    count: normalizeCount(item?.count),
  };
}

function normalizeModelGroup(item) {
  return {
    mnuftrCd: String(item?.mnuftrCd || ""),
    modelGrpCd: String(item?.modelGrpCd || ""),
    modelGrpNm: String(item?.modelGrpNm || ""),
    count: normalizeCount(item?.count),
  };
}

function normalizeModel(item) {
  return {
    mnuftrCd: String(item?.mnuftrCd || ""),
    modelGrpCd: String(item?.modelGrpCd || ""),
    modelCd: String(item?.modelCd || ""),
    modelNm: String(item?.modelNm || ""),
    prdcnYear: String(item?.prdcnYear || ""),
    count: normalizeCount(item?.count),
  };
}

function normalizeGrade(item) {
  return {
    mnuftrCd: String(item?.mnuftrCd || ""),
    modelGrpCd: String(item?.modelGrpCd || ""),
    modelCd: String(item?.modelCd || ""),
    grdCd: String(item?.grdCd || ""),
    grdNm: String(item?.grdNm || ""),
    count: normalizeCount(item?.count),
  };
}

async function fetchKcarGroup(path, body, normalizeItem) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.kcarTimeoutMs);

  try {
    const response = await fetch(`${config.kcarApiBaseUrl}/bc/search/group/${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

    return rows.map(normalizeItem);
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

async function fetchKcarBrands(sellType) {
  return fetchKcarGroup(
    "mnuftr",
    {
      wr_eq_sell_dcd: sellType,
      wr_in_multi_columns: "cntr_rgn_cd|cntr_cd",
    },
    normalizeBrand,
  );
}

async function fetchKcarModelGroups(sellType, mnuftrCd) {
  return fetchKcarGroup(
    "modelGrp",
    {
      wr_eq_sell_dcd: sellType,
      wr_in_multi_columns: "cntr_rgn_cd|cntr_cd",
      wr_eq_mnuftr_cd: mnuftrCd,
    },
    normalizeModelGroup,
  );
}

async function fetchKcarModels(sellType, mnuftrCd, modelGrpCd) {
  return fetchKcarGroup(
    "model",
    {
      wr_eq_sell_dcd: sellType,
      wr_in_multi_columns: "cntr_rgn_cd|cntr_cd",
      wr_eq_mnuftr_cd: mnuftrCd,
      wr_eq_model_grp_cd: modelGrpCd,
    },
    normalizeModel,
  );
}

async function fetchKcarGrades(sellType, mnuftrCd, modelGrpCd, modelCd) {
  return fetchKcarGroup(
    "grd",
    {
      wr_eq_sell_dcd: sellType,
      wr_in_multi_columns: "cntr_rgn_cd|cntr_cd",
      wr_eq_mnuftr_cd: mnuftrCd,
      wr_eq_model_grp_cd: modelGrpCd,
      wr_eq_model_cd: modelCd,
    },
    normalizeGrade,
  );
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

function parseRequiredCode(body, fieldName) {
  const raw = body[fieldName];
  if (raw == null || raw === "") {
    throw apiError("BAD_REQUEST", `${fieldName}은(는) 필수입니다.`, 400);
  }

  if (typeof raw !== "string") {
    throw apiError("BAD_REQUEST", `${fieldName}은(는) 문자열이어야 합니다.`, 400);
  }

  const value = raw.trim();
  if (!value) {
    throw apiError("BAD_REQUEST", `${fieldName}은(는) 빈 문자열일 수 없습니다.`, 400);
  }

  return value;
}

function validateRows(rows, keyName) {
  return rows.filter((item) => item[keyName]);
}

function buildSuccessResponse(data) {
  return {
    success: true,
    data,
    meta: {
      source: "kcar",
      fetchedAt: nowIso(),
    },
  };
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
      const brands = validateRows(await fetchKcarBrands(sellType), "mnuftrCd");

      toJson(res, 200, buildSuccessResponse(brands), corsHeaders);
      return;
    }

    if (req.url === "/api/kcar/model-groups") {
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
      const mnuftrCd = parseRequiredCode(body, "mnuftrCd");
      const modelGroups = validateRows(
        await fetchKcarModelGroups(sellType, mnuftrCd),
        "modelGrpCd",
      );

      toJson(res, 200, buildSuccessResponse(modelGroups), corsHeaders);
      return;
    }

    if (req.url === "/api/kcar/models") {
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
      const mnuftrCd = parseRequiredCode(body, "mnuftrCd");
      const modelGrpCd = parseRequiredCode(body, "modelGrpCd");
      const models = validateRows(await fetchKcarModels(sellType, mnuftrCd, modelGrpCd), "modelCd");

      toJson(res, 200, buildSuccessResponse(models), corsHeaders);
      return;
    }

    if (req.url === "/api/kcar/grades") {
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
      const mnuftrCd = parseRequiredCode(body, "mnuftrCd");
      const modelGrpCd = parseRequiredCode(body, "modelGrpCd");
      const modelCd = parseRequiredCode(body, "modelCd");
      const grades = validateRows(
        await fetchKcarGrades(sellType, mnuftrCd, modelGrpCd, modelCd),
        "grdCd",
      );

      toJson(res, 200, buildSuccessResponse(grades), corsHeaders);
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
