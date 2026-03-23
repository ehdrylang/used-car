import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const config = {
  port: Number.parseInt(process.env.PORT || "8787", 10),
  host: process.env.HOST || "127.0.0.1",
  kcarApiBaseUrl: process.env.KCAR_API_BASE_URL || "https://api.kcar.com",
  encarApiBaseUrl: process.env.ENCAR_API_BASE_URL || "https://api.encar.com",
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

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseFlexibleDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{8}$/.test(trimmed)) {
    const iso = `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(value) {
  const parsed =
    value instanceof Date && !Number.isNaN(value.getTime()) ? value : parseFlexibleDate(value);
  if (!parsed) {
    return "-";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const date = String(parsed.getDate()).padStart(2, "0");
  return `${year}.${month}.${date}`;
}

function differenceInDays(left, right) {
  const leftTime = left?.getTime?.();
  const rightTime = right?.getTime?.();
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    return null;
  }

  const elapsed = Math.abs(leftTime - rightTime);
  return Math.floor(elapsed / (1000 * 60 * 60 * 24));
}

function differenceInYears(from, to = new Date()) {
  const fromTime = from?.getTime?.();
  const toTime = to?.getTime?.();
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || toTime <= fromTime) {
    return null;
  }

  return (toTime - fromTime) / (1000 * 60 * 60 * 24 * 365.25);
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

async function fetchKcarDrctList(enc) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.kcarTimeoutMs);

  try {
    const response = await fetch(`${config.kcarApiBaseUrl}/bc/search/list/drct`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enc }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw apiError("UPSTREAM_ERROR", `KCAR API 응답 오류: HTTP ${response.status}`, 502);
    }

    const payload = await response.json();
    if (!payload?.success) {
      throw apiError("UPSTREAM_ERROR", "KCAR API 응답 형식이 올바르지 않습니다.", 502);
    }

    return payload?.data ?? {};
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

async function fetchEncarJson(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.kcarTimeoutMs);
  const {
    notFoundValue = null,
    defaultMessage = "ENCAR API 호출에 실패했습니다.",
  } = options;

  try {
    const response = await fetch(`${config.encarApiBaseUrl}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (response.status === 404 && notFoundValue !== undefined) {
      return notFoundValue;
    }

    if (!response.ok) {
      throw apiError("UPSTREAM_ERROR", `ENCAR API 응답 오류: HTTP ${response.status}`, 502);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw apiError("TIMEOUT", "ENCAR API 호출 시간이 초과되었습니다.", 504);
    }

    if (error.code && error.status) {
      throw error;
    }

    throw apiError("UPSTREAM_ERROR", defaultMessage, 502);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchEncarVehicleRecord(vehicleId) {
  return fetchEncarJson(`/v1/readside/record/vehicle/${vehicleId}/open`, {
    defaultMessage: "ENCAR 차량 정보 조회에 실패했습니다.",
  });
}

async function fetchEncarVehicleInspection(vehicleId) {
  return fetchEncarJson(`/v1/readside/inspection/vehicle/${vehicleId}`, {
    notFoundValue: null,
    defaultMessage: "ENCAR 성능점검 조회에 실패했습니다.",
  });
}

async function fetchEncarVehicleDiagnosis(vehicleId) {
  return fetchEncarJson(`/v1/readside/diagnosis/vehicle/${vehicleId}`, {
    notFoundValue: null,
    defaultMessage: "ENCAR 진단 조회에 실패했습니다.",
  });
}

function parseVehicleId(body) {
  const raw = body.vehicleId;
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw apiError("BAD_REQUEST", "vehicleId는 1 이상의 정수여야 합니다.", 400);
  }
  return parsed;
}

function getEncarInspectionDetail(inspection) {
  return inspection?.master?.detail || null;
}

function flattenInspectionNodes(nodes, bucket = []) {
  if (!Array.isArray(nodes)) {
    return bucket;
  }

  nodes.forEach((node) => {
    bucket.push(node);
    if (Array.isArray(node?.children) && node.children.length) {
      flattenInspectionNodes(node.children, bucket);
    }
  });

  return bucket;
}

function isImportMaker(maker) {
  const koreanMakers = new Set([
    "현대",
    "기아",
    "제네시스",
    "쉐보레",
    "쉐보레(GM대우)",
    "르노코리아",
    "르노코리아(삼성)",
    "KG모빌리티",
    "KG모빌리티(쌍용)",
    "쌍용",
    "르노삼성",
    "대우버스",
  ]);

  return !koreanMakers.has(String(maker || "").trim());
}

function buildScoreItem(category, points, reason) {
  return { category, points, reason };
}

function buildEncarVehicleScore(vehicleId, record, inspection, diagnosis) {
  const detail = getEncarInspectionDetail(inspection);
  const breakdown = [];
  let total = 0;

  const insuranceGaps = [
    record?.notJoinDate1,
    record?.notJoinDate2,
    record?.notJoinDate3,
    record?.notJoinDate4,
    record?.notJoinDate5,
  ].filter(Boolean);
  const ownerChangeCnt = toFiniteNumber(record?.ownerChangeCnt);
  const ownerChangeDates = Array.isArray(record?.ownerChanges)
    ? record.ownerChanges.map((value) => parseFlexibleDate(value)).filter(Boolean)
    : [];
  const mileage = toFiniteNumber(detail?.mileage);
  const firstRegistrationDate =
    parseFlexibleDate(detail?.firstRegistrationDate) ||
    parseFlexibleDate(record?.firstDate) ||
    parseFlexibleDate(record?.regDate);
  const ageYearsFromRegistration = differenceInYears(firstRegistrationDate);
  const modelYear = Number.parseInt(String(record?.year || detail?.modelYear || "").trim(), 10);
  const carAge = Number.isInteger(modelYear) ? new Date().getFullYear() - modelYear : null;
  const diagnosisItems = Array.isArray(diagnosis?.items) ? diagnosis.items : [];
  const flattenedInspectionNodes = flattenInspectionNodes(inspection?.inners || []);
  const leakNodes = flattenedInspectionNodes.filter((node) =>
    /누유|누수|누출/.test(String(node?.type?.title || "")),
  );
  const hasLeakIssue = leakNodes.some((node) => {
    const title = String(node?.statusType?.title || "");
    return title && title !== "없음";
  });
  const noLeakVerified = leakNodes.length > 0 && !hasLeakIssue;
  const seriousTypes = Array.isArray(detail?.seriousTypes) ? detail.seriousTypes : [];
  const hasMajorFrameIssue = seriousTypes.length > 0;
  const outerPanelTargets = new Set(["HOOD", "FRONT_FENDER_LEFT", "FRONT_FENDER_RIGHT"]);
  const hasOuterPanelIssue = diagnosisItems.some((item) => {
    if (!outerPanelTargets.has(String(item?.name || ""))) {
      return false;
    }
    return String(item?.resultCode || "") !== "NORMAL";
  });
  const purposeHistoryExists =
    toFiniteNumber(record?.government) > 0 ||
    toFiniteNumber(record?.business) > 0 ||
    (Array.isArray(detail?.usageChangeTypes) && detail.usageChangeTypes.length > 0);
  const recallPending =
    detail?.recall === true &&
    !Array.isArray(detail?.recallFullFillTypes)
      ? true
      : detail?.recall === true &&
        !detail.recallFullFillTypes.some((item) => String(item?.title || "").includes("이행"));
  const severeAccidentExists =
    toFiniteNumber(record?.totalLossCnt) > 0 ||
    toFiniteNumber(record?.floodTotalLossCnt) > 0 ||
    toFiniteNumber(record?.floodPartLossCnt) > 0 ||
    detail?.waterlog === true;
  const insuranceRepairCount =
    toFiniteNumber(record?.myAccidentCnt) + toFiniteNumber(record?.otherAccidentCnt);
  const insuranceRepairTotalCost =
    toFiniteNumber(record?.myAccidentCost) + toFiniteNumber(record?.otherAccidentCost);
  const insuranceRepairAverageCost =
    insuranceRepairCount > 0 ? insuranceRepairTotalCost / insuranceRepairCount : 0;
  const noAccidentHistory =
    toFiniteNumber(record?.accidentCnt) === 0 &&
    toFiniteNumber(record?.myAccidentCnt) === 0 &&
    toFiniteNumber(record?.otherAccidentCnt) === 0 &&
    !severeAccidentExists;

  if (purposeHistoryExists) {
    breakdown.push(buildScoreItem("용도이력", -15, "영업용 또는 용도변경 이력이 확인되었습니다."));
    total -= 15;
  } else {
    breakdown.push(buildScoreItem("용도이력", 0, "영업용/용도변경 이력은 확인되지 않았습니다."));
  }

  if (recallPending) {
    breakdown.push(buildScoreItem("용도이력", 0, "리콜 미이행 차량으로 확인되어 총점 산정에서 제외합니다."));
  }

  if (insuranceGaps.length > 0) {
    breakdown.push(
      buildScoreItem(
        "사고/보험이력",
        -10,
        `자차보험 미가입 기간이 ${insuranceGaps.length}회 확인되었습니다.`,
      ),
    );
    total -= 10;
  }

  if (severeAccidentExists) {
    breakdown.push(buildScoreItem("사고/보험이력", -30, "전손 또는 침수 이력이 확인되었습니다."));
    total -= 30;
  } else if (noAccidentHistory && insuranceGaps.length === 0) {
    breakdown.push(buildScoreItem("사고/보험이력", 20, "무사고이며 보험 공백 이력이 없습니다."));
    total += 20;
  } else if (insuranceRepairCount > 0) {
    const threshold = isImportMaker(record?.maker) ? 2000000 : 1000000;
    if (insuranceRepairAverageCost <= threshold) {
      breakdown.push(
        buildScoreItem(
          "사고/보험이력",
          10,
          `보험 수리 평균금액이 기준 이하(${Math.round(
            insuranceRepairAverageCost,
          ).toLocaleString("ko-KR")}원)입니다.`,
        ),
      );
      total += 10;
    } else {
      breakdown.push(
        buildScoreItem(
          "사고/보험이력",
          0,
          `보험 수리 평균금액이 기준 초과(${Math.round(
            insuranceRepairAverageCost,
          ).toLocaleString("ko-KR")}원)로 가점이 없습니다.`,
        ),
      );
    }
  } else {
    breakdown.push(buildScoreItem("사고/보험이력", 0, "추가 사고/보험 가감점 조건은 확인되지 않았습니다."));
  }

  if (ownerChangeCnt <= 1) {
    breakdown.push(buildScoreItem("1인소유", 10, `소유주 변경 이력이 ${ownerChangeCnt}건입니다.`));
    total += 10;
  } else if (ownerChangeCnt === 2) {
    breakdown.push(buildScoreItem("1인소유", 0, "소유주 변경 이력이 2건입니다."));
  } else {
    breakdown.push(buildScoreItem("1인소유", -10, `소유주 변경 이력이 ${ownerChangeCnt}건입니다.`));
    total -= 10;
  }

  const hasTightOwnerGap = ownerChangeDates.some((current, index) => {
    const next = ownerChangeDates[index + 1];
    if (!next) {
      return false;
    }
    const gap = differenceInDays(current, next);
    return gap != null && gap <= 365;
  });
  if (ownerChangeCnt >= 2 && hasTightOwnerGap) {
    breakdown.push(buildScoreItem("1인소유", -5, "소유주 변경 간격이 1년 이내인 구간이 있습니다."));
    total -= 5;
  }

  breakdown.push(buildScoreItem("판매자 정보", 0, "판매자 정보 API는 아직 연동하지 않아 점수에 반영하지 않았습니다."));

  if (mileage > 0 && ageYearsFromRegistration && ageYearsFromRegistration > 0) {
    const annualMileage = mileage / ageYearsFromRegistration;
    if (annualMileage <= 10000) {
      breakdown.push(
        buildScoreItem(
          "주행거리",
          10,
          `연평균 주행거리 ${Math.round(annualMileage).toLocaleString("ko-KR")}km 입니다.`,
        ),
      );
      total += 10;
    } else if (annualMileage < 15000) {
      breakdown.push(
        buildScoreItem(
          "주행거리",
          0,
          `연평균 주행거리 ${Math.round(annualMileage).toLocaleString("ko-KR")}km 입니다.`,
        ),
      );
    } else if (annualMileage < 20000) {
      breakdown.push(
        buildScoreItem(
          "주행거리",
          -5,
          `연평균 주행거리 ${Math.round(annualMileage).toLocaleString("ko-KR")}km 입니다.`,
        ),
      );
      total -= 5;
    } else {
      breakdown.push(
        buildScoreItem(
          "주행거리",
          -10,
          `연평균 주행거리 ${Math.round(annualMileage).toLocaleString("ko-KR")}km 입니다.`,
        ),
      );
      total -= 10;
    }
  } else {
    breakdown.push(buildScoreItem("주행거리", 0, "연평균 주행거리를 계산할 수 있는 정보가 부족합니다."));
  }

  if (carAge != null) {
    if (carAge <= 3) {
      breakdown.push(buildScoreItem("연식", 5, `${carAge}년 차 차량입니다.`));
      total += 5;
    } else if (carAge >= 8) {
      breakdown.push(buildScoreItem("연식", -5, `${carAge}년 차 차량입니다.`));
      total -= 5;
    } else {
      breakdown.push(buildScoreItem("연식", 0, `${carAge}년 차 차량입니다.`));
    }
  } else {
    breakdown.push(buildScoreItem("연식", 0, "연식을 판별할 수 있는 정보가 부족합니다."));
  }

  if (hasMajorFrameIssue) {
    breakdown.push(buildScoreItem("성능점검상", -10, "주요 골격 관련 이상이 확인되었습니다."));
    total -= 10;
  } else {
    breakdown.push(buildScoreItem("성능점검상", 0, "주요 골격 이상은 확인되지 않았습니다."));
  }

  if (hasOuterPanelIssue) {
    breakdown.push(buildScoreItem("성능점검상", -5, "본네트 또는 좌우 휀더 상태 이상이 확인되었습니다."));
    total -= 5;
  } else if (diagnosis) {
    breakdown.push(buildScoreItem("성능점검상", 0, "본네트/휀더 교환 이력은 확인되지 않았습니다."));
  } else {
    breakdown.push(buildScoreItem("성능점검상", 0, "외판 진단 정보가 없어 본네트/휀더 상태는 반영하지 않았습니다."));
  }

  if (noLeakVerified) {
    breakdown.push(buildScoreItem("성능점검상", 3, "누유/누수 점검 항목이 모두 없음으로 확인되었습니다."));
    total += 3;
  } else if (hasLeakIssue) {
    breakdown.push(buildScoreItem("성능점검상", 0, "누유/누수 관련 이상이 있어 가점이 없습니다."));
  } else {
    breakdown.push(buildScoreItem("성능점검상", 0, "누유/누수 점검 정보가 부족해 가점을 반영하지 않았습니다."));
  }

  breakdown.push(buildScoreItem("본문", 0, "ENCAR 본문 문구는 아직 연동하지 않아 점수에 반영하지 않았습니다."));

  const verdict = recallPending
    ? "평가 제외"
    : total >= 25
      ? "추천"
      : total >= 10
        ? "관심"
        : total >= 0
          ? "보통"
          : "주의";

  return {
    vehicleId,
    title: [record?.maker, record?.model].filter(Boolean).join(" ") || `ENCAR 차량 ${vehicleId}`,
    summary: {
      carNo: record?.carNo || "-",
      year: record?.year || String(modelYear || ""),
      fuel: record?.fuel || "-",
      mileage,
      ownerChangeCnt,
      firstRegistrationDate: formatDateLabel(firstRegistrationDate),
    },
    score: {
      total: recallPending ? null : total,
      verdict,
      excludedReason: recallPending ? "리콜 미이행 차량" : "",
      breakdown,
    },
    sources: {
      record: Boolean(record),
      inspection: Boolean(inspection),
      diagnosis: Boolean(diagnosis),
    },
  };
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

function buildSuccessResponse(data, source = "kcar") {
  return {
    success: true,
    data,
    meta: {
      source,
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

    if (req.url === "/api/kcar/drct-list") {
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
      const enc = parseRequiredCode(body, "enc");
      const drctList = await fetchKcarDrctList(enc);

      toJson(res, 200, buildSuccessResponse(drctList), corsHeaders);
      return;
    }

    if (req.url === "/api/encar/vehicle-score") {
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
      const vehicleId = parseVehicleId(body);
      const [record, inspection, diagnosis] = await Promise.all([
        fetchEncarVehicleRecord(vehicleId),
        fetchEncarVehicleInspection(vehicleId),
        fetchEncarVehicleDiagnosis(vehicleId),
      ]);

      const scoredVehicle = buildEncarVehicleScore(vehicleId, record, inspection, diagnosis);
      toJson(res, 200, buildSuccessResponse(scoredVehicle, "encar"), corsHeaders);
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
