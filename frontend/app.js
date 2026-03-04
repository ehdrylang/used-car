import { createDrctPlainParam, createKcarEnc } from "./kcar-enc.js";

const API_BASE_URL =
  window.__USED_CAR_API_BASE_URL__ ||
  (window.location.port === "4173" ? "http://localhost:8787" : "");

const KCAR_BRAND_ENDPOINT = `${API_BASE_URL}/api/kcar/brands`;
const KCAR_MODEL_GROUP_ENDPOINT = `${API_BASE_URL}/api/kcar/model-groups`;
const KCAR_MODEL_ENDPOINT = `${API_BASE_URL}/api/kcar/models`;
const KCAR_GRADE_ENDPOINT = `${API_BASE_URL}/api/kcar/grades`;
const KCAR_DRCT_ENDPOINT = `${API_BASE_URL}/api/kcar/drct-list`;

const appState = {
  platform: "home",
  brandType: "KOR",
  brandLoadState: "idle",
  modelGroupLoadState: "idle",
  modelLoadState: "idle",
  gradeLoadState: "idle",
  drctLoadState: "idle",
  selectedBrandCode: null,
  selectedModelGroupCode: null,
  selectedModelCode: null,
  selectedGradeCode: null,
  brandsByType: { KOR: [], IMP: [] },
  modelGroups: [],
  models: [],
  grades: [],
  drctRows: [],
  drctTotalCount: 0,
  drctPageNo: 1,
  drctTotalPageCount: 1,
  drctLimit: 26,
  errorMessageByStage: {
    brand: "",
    modelGroup: "",
    model: "",
    grade: "",
    drct: "",
  },
  requestSeq: {
    modelGroup: 0,
    model: 0,
    grade: 0,
    drct: 0,
  },
};

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}

function isVisibleCount(item) {
  return item.count > 0;
}

function sortByLabelAndCode(items, nameKey, codeKey) {
  return [...items].sort((a, b) => {
    const labelCompare = String(a[nameKey]).localeCompare(String(b[nameKey]), "ko", {
      numeric: true,
      sensitivity: "base",
    });
    if (labelCompare !== 0) {
      return labelCompare;
    }
    return String(a[codeKey]).localeCompare(String(b[codeKey]), "ko", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseNonNegativeInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function normalizeBrandRow(row) {
  return {
    mnuftrCd: String(row?.mnuftrCd || ""),
    pathNm: String(row?.pathNm || ""),
    carType: row?.carType === "IMP" ? "IMP" : "KOR",
    count: normalizeCount(row?.count),
  };
}

function normalizeModelGroupRow(row) {
  return {
    modelGrpCd: String(row?.modelGrpCd || ""),
    modelGrpNm: String(row?.modelGrpNm || ""),
    mnuftrCd: String(row?.mnuftrCd || ""),
    count: normalizeCount(row?.count),
  };
}

function normalizeModelRow(row) {
  return {
    modelCd: String(row?.modelCd || ""),
    modelNm: String(row?.modelNm || ""),
    modelGrpCd: String(row?.modelGrpCd || ""),
    mnuftrCd: String(row?.mnuftrCd || ""),
    prdcnYear: String(row?.prdcnYear || ""),
    count: normalizeCount(row?.count),
  };
}

function normalizeGradeRow(row) {
  return {
    grdCd: String(row?.grdCd || ""),
    grdNm: String(row?.grdNm || ""),
    modelCd: String(row?.modelCd || ""),
    modelGrpCd: String(row?.modelGrpCd || ""),
    mnuftrCd: String(row?.mnuftrCd || ""),
    count: normalizeCount(row?.count),
  };
}

async function postJson(endpoint, body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const message =
      payload?.error?.message || `요청 실패 (HTTP ${response.status || "unknown"})`;
    throw new Error(message);
  }

  return payload;
}

function selectedBrand() {
  const all = [...appState.brandsByType.KOR, ...appState.brandsByType.IMP];
  return all.find((item) => item.mnuftrCd === appState.selectedBrandCode) || null;
}

function selectedModelGroup() {
  return (
    appState.modelGroups.find((item) => item.modelGrpCd === appState.selectedModelGroupCode) ||
    null
  );
}

function selectedModel() {
  return appState.models.find((item) => item.modelCd === appState.selectedModelCode) || null;
}

function selectedGrade() {
  return appState.grades.find((item) => item.grdCd === appState.selectedGradeCode) || null;
}

function bumpRequestSeq(stage) {
  appState.requestSeq[stage] += 1;
  return appState.requestSeq[stage];
}

function resetModelGroupStage() {
  appState.selectedModelGroupCode = null;
  appState.modelGroups = [];
  appState.modelGroupLoadState = "idle";
  appState.errorMessageByStage.modelGroup = "";
}

function resetModelStage() {
  appState.selectedModelCode = null;
  appState.models = [];
  appState.modelLoadState = "idle";
  appState.errorMessageByStage.model = "";
}

function resetGradeStage() {
  appState.selectedGradeCode = null;
  appState.grades = [];
  appState.gradeLoadState = "idle";
  appState.errorMessageByStage.grade = "";
}

function resetDrctStage() {
  appState.drctRows = [];
  appState.drctTotalCount = 0;
  appState.drctPageNo = 1;
  appState.drctTotalPageCount = 1;
  appState.drctLimit = 26;
  appState.drctLoadState = "idle";
  appState.errorMessageByStage.drct = "";
}

function resetFromBrandSelection() {
  bumpRequestSeq("modelGroup");
  bumpRequestSeq("model");
  bumpRequestSeq("grade");
  bumpRequestSeq("drct");
  resetModelGroupStage();
  resetModelStage();
  resetGradeStage();
  resetDrctStage();
}

function resetFromModelGroupSelection() {
  bumpRequestSeq("model");
  bumpRequestSeq("grade");
  bumpRequestSeq("drct");
  resetModelStage();
  resetGradeStage();
  resetDrctStage();
}

function resetFromModelSelection() {
  bumpRequestSeq("grade");
  bumpRequestSeq("drct");
  resetGradeStage();
  resetDrctStage();
}

function resetFromGradeSelection() {
  bumpRequestSeq("drct");
  resetDrctStage();
}

async function fetchBrands() {
  appState.brandLoadState = "loading";
  appState.errorMessageByStage.brand = "";
  render();

  try {
    const payload = await postJson(KCAR_BRAND_ENDPOINT, { sellType: "ALL" });
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    if (!rows.length) {
      appState.brandLoadState = "empty";
      appState.brandsByType = { KOR: [], IMP: [] };
      appState.selectedBrandCode = null;
      resetFromBrandSelection();
      render();
      return;
    }

    const normalized = rows
      .map(normalizeBrandRow)
      .filter((item) => item.mnuftrCd)
      .filter(isVisibleCount);
    const kor = sortByLabelAndCode(
      normalized.filter((item) => item.carType === "KOR"),
      "pathNm",
      "mnuftrCd",
    );
    const imp = sortByLabelAndCode(
      normalized.filter((item) => item.carType === "IMP"),
      "pathNm",
      "mnuftrCd",
    );

    appState.brandsByType = { KOR: kor, IMP: imp };
    appState.brandLoadState = kor.length || imp.length ? "success" : "empty";

    if (!appState.brandsByType[appState.brandType].length) {
      appState.brandType = appState.brandType === "KOR" ? "IMP" : "KOR";
    }

    const allCodes = new Set(normalized.map((item) => item.mnuftrCd));
    if (appState.selectedBrandCode && !allCodes.has(appState.selectedBrandCode)) {
      appState.selectedBrandCode = null;
      resetFromBrandSelection();
    }

    render();
  } catch {
    appState.brandLoadState = "error";
    appState.errorMessageByStage.brand = "브랜드 목록을 불러오지 못했습니다. 다시 시도해주세요.";
    appState.selectedBrandCode = null;
    resetFromBrandSelection();
    render();
  }
}

async function fetchModelGroups(mnuftrCd) {
  const requestSeq = bumpRequestSeq("modelGroup");
  appState.modelGroupLoadState = "loading";
  appState.errorMessageByStage.modelGroup = "";
  render();

  try {
    const payload = await postJson(KCAR_MODEL_GROUP_ENDPOINT, {
      sellType: "ALL",
      mnuftrCd,
    });

    if (requestSeq !== appState.requestSeq.modelGroup) {
      return;
    }

    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const items = sortByLabelAndCode(
      rows
        .map(normalizeModelGroupRow)
        .filter((item) => item.modelGrpCd)
        .filter(isVisibleCount),
      "modelGrpNm",
      "modelGrpCd",
    );

    appState.modelGroups = items;
    appState.modelGroupLoadState = items.length ? "success" : "empty";

    const exists = items.some((item) => item.modelGrpCd === appState.selectedModelGroupCode);
    if (!exists) {
      appState.selectedModelGroupCode = null;
      resetFromModelGroupSelection();
    }

    render();
  } catch {
    if (requestSeq !== appState.requestSeq.modelGroup) {
      return;
    }
    appState.modelGroupLoadState = "error";
    appState.errorMessageByStage.modelGroup =
      "모델군 목록을 불러오지 못했습니다. 다시 시도해주세요.";
    render();
  }
}

async function fetchModels(mnuftrCd, modelGrpCd) {
  const requestSeq = bumpRequestSeq("model");
  appState.modelLoadState = "loading";
  appState.errorMessageByStage.model = "";
  render();

  try {
    const payload = await postJson(KCAR_MODEL_ENDPOINT, {
      sellType: "ALL",
      mnuftrCd,
      modelGrpCd,
    });

    if (requestSeq !== appState.requestSeq.model) {
      return;
    }

    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const items = sortByLabelAndCode(
      rows
        .map(normalizeModelRow)
        .filter((item) => item.modelCd)
        .filter(isVisibleCount),
      "modelNm",
      "modelCd",
    );

    appState.models = items;
    appState.modelLoadState = items.length ? "success" : "empty";

    const exists = items.some((item) => item.modelCd === appState.selectedModelCode);
    if (!exists) {
      appState.selectedModelCode = null;
      resetFromModelSelection();
    }

    render();
  } catch {
    if (requestSeq !== appState.requestSeq.model) {
      return;
    }
    appState.modelLoadState = "error";
    appState.errorMessageByStage.model = "세부 모델 목록을 불러오지 못했습니다. 다시 시도해주세요.";
    render();
  }
}

async function fetchGrades(mnuftrCd, modelGrpCd, modelCd) {
  const requestSeq = bumpRequestSeq("grade");
  appState.gradeLoadState = "loading";
  appState.errorMessageByStage.grade = "";
  render();

  try {
    const payload = await postJson(KCAR_GRADE_ENDPOINT, {
      sellType: "ALL",
      mnuftrCd,
      modelGrpCd,
      modelCd,
    });

    if (requestSeq !== appState.requestSeq.grade) {
      return;
    }

    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const items = sortByLabelAndCode(
      rows
        .map(normalizeGradeRow)
        .filter((item) => item.grdCd)
        .filter(isVisibleCount),
      "grdNm",
      "grdCd",
    );

    appState.grades = items;
    appState.gradeLoadState = items.length ? "success" : "empty";

    const exists = items.some((item) => item.grdCd === appState.selectedGradeCode);
    if (!exists) {
      appState.selectedGradeCode = null;
      resetFromGradeSelection();
    }

    render();
  } catch {
    if (requestSeq !== appState.requestSeq.grade) {
      return;
    }
    appState.gradeLoadState = "error";
    appState.errorMessageByStage.grade = "등급/트림 목록을 불러오지 못했습니다. 다시 시도해주세요.";
    render();
  }
}

function normalizeDrctRows(data) {
  if (Array.isArray(data?.rows)) {
    return data.rows;
  }
  if (Array.isArray(data?.list)) {
    return data.list;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

async function fetchDrctList(mnuftrCd, modelGrpCd, modelCd, grdCd, pageNo = 1) {
  const safePageNo = parsePositiveInt(pageNo) || 1;
  const requestSeq = bumpRequestSeq("drct");
  appState.drctLoadState = "loading";
  appState.errorMessageByStage.drct = "";
  render();

  try {
    const plainParam = createDrctPlainParam({
      mnuftrCd,
      modelGrpCd,
      modelCd,
      grdCd,
      pageno: safePageNo,
      limit: appState.drctLimit,
    });
    const enc = await createKcarEnc(plainParam);
    const payload = await postJson(KCAR_DRCT_ENDPOINT, { enc });

    if (requestSeq !== appState.requestSeq.drct) {
      return;
    }

    const data = payload?.data || {};
    const rows = normalizeDrctRows(data);
    const totalCount = parseNonNegativeInt(data?.totalCnt) ?? rows.length;
    const currentPage = parsePositiveInt(data?.pageNo) ?? safePageNo;
    const limit = parsePositiveInt(data?.limit) ?? parsePositiveInt(plainParam.limit) ?? 26;
    const computedTotalPageCount = Math.max(1, Math.ceil(totalCount / limit));
    const totalPageCount = parsePositiveInt(data?.totalPageCnt) ?? computedTotalPageCount;

    appState.drctRows = rows;
    appState.drctTotalCount = totalCount;
    appState.drctPageNo = Math.min(currentPage, totalPageCount);
    appState.drctTotalPageCount = totalPageCount;
    appState.drctLimit = limit;
    appState.drctLoadState = rows.length ? "success" : "empty";
    render();
  } catch {
    if (requestSeq !== appState.requestSeq.drct) {
      return;
    }
    appState.drctRows = [];
    appState.drctTotalCount = 0;
    appState.drctPageNo = safePageNo;
    appState.drctTotalPageCount = 1;
    appState.drctLoadState = "error";
    appState.errorMessageByStage.drct =
      "판매상품 목록을 불러오지 못했습니다. 다시 시도해주세요.";
    render();
  }
}

function renderHome() {
  return `
    <main class="page-shell home-wrap">
      <section class="panel home-card" aria-labelledby="home-title">
        <h1 class="title" id="home-title">중고차 매물을 검색할 사이트 선택</h1>
        <div class="platform-actions">
          <button id="encar-btn" class="platform-btn" type="button" disabled aria-disabled="true">
            encar <span class="badge">제공예정</span>
          </button>
          <button id="kcar-btn" class="platform-btn" type="button">k-car</button>
        </div>
      </section>
    </main>
  `;
}

function renderStageStatus(message, error = false, retryButtonId = "") {
  if (!error) {
    return `<div class="status" role="status">${escapeHtml(message)}</div>`;
  }

  return `
    <div class="status error" role="alert">
      ${escapeHtml(message)}
      <div>
        <button id="${retryButtonId}" class="retry-btn" type="button">다시 시도</button>
      </div>
    </div>
  `;
}

function renderTreeNode({
  depth,
  label,
  count,
  subtitle = "",
  isActive = false,
  isPath = false,
  dataAttr,
  code,
}) {
  const subtitleHtml = subtitle ? `<span class="tree-node-sub">${escapeHtml(subtitle)}</span>` : "";

  return `
    <button
      class="tree-node depth-${depth} ${isActive ? "active" : ""} ${isPath ? "path" : ""}"
      ${dataAttr}="${escapeHtml(code)}"
      type="button"
      aria-pressed="${isActive ? "true" : "false"}"
    >
      <span class="tree-node-main">
        <span class="tree-node-label">${escapeHtml(label)}</span>
        ${subtitleHtml}
      </span>
      <span class="tree-node-count">${count}</span>
    </button>
  `;
}

function renderBranchContainer(depth, body) {
  return `<div class="tree-children depth-${depth}">${body}</div>`;
}

function renderGradesBranch() {
  if (!appState.selectedModelCode) {
    return "";
  }

  if (appState.gradeLoadState === "loading") {
    return renderBranchContainer(
      4,
      renderStageStatus("등급/트림 목록을 불러오는 중입니다..."),
    );
  }
  if (appState.gradeLoadState === "error") {
    return renderBranchContainer(
      4,
      renderStageStatus(appState.errorMessageByStage.grade, true, "retry-grade-btn"),
    );
  }
  if (appState.gradeLoadState === "empty") {
    return renderBranchContainer(4, renderStageStatus("표시 가능한 등급/트림이 없습니다."));
  }
  if (appState.gradeLoadState !== "success" || !appState.grades.length) {
    return "";
  }

  const rows = appState.grades
    .map((grade) => {
      const isActive = grade.grdCd === appState.selectedGradeCode;
      return `
        <li class="tree-item depth-4">
          ${renderTreeNode({
            depth: 4,
            label: grade.grdNm,
            count: grade.count,
            isActive,
            isPath: isActive,
            dataAttr: "data-grade-code",
            code: grade.grdCd,
          })}
        </li>
      `;
    })
    .join("");

  return renderBranchContainer(4, `<ul class="tree-list">${rows}</ul>`);
}

function renderModelsBranch() {
  if (!appState.selectedModelGroupCode) {
    return "";
  }

  if (appState.modelLoadState === "loading") {
    return renderBranchContainer(3, renderStageStatus("세부 모델 목록을 불러오는 중입니다..."));
  }
  if (appState.modelLoadState === "error") {
    return renderBranchContainer(
      3,
      renderStageStatus(appState.errorMessageByStage.model, true, "retry-model-btn"),
    );
  }
  if (appState.modelLoadState === "empty") {
    return renderBranchContainer(3, renderStageStatus("표시 가능한 세부 모델이 없습니다."));
  }
  if (appState.modelLoadState !== "success" || !appState.models.length) {
    return "";
  }

  const rows = appState.models
    .map((model) => {
      const isActive = model.modelCd === appState.selectedModelCode;
      return `
        <li class="tree-item depth-3">
          ${renderTreeNode({
            depth: 3,
            label: model.modelNm,
            subtitle: model.prdcnYear,
            count: model.count,
            isActive,
            isPath: isActive,
            dataAttr: "data-model-code",
            code: model.modelCd,
          })}
          ${isActive ? renderGradesBranch() : ""}
        </li>
      `;
    })
    .join("");

  return renderBranchContainer(3, `<ul class="tree-list">${rows}</ul>`);
}

function renderModelGroupsBranch(brandCode) {
  if (brandCode !== appState.selectedBrandCode) {
    return "";
  }

  if (appState.modelGroupLoadState === "loading") {
    return renderBranchContainer(2, renderStageStatus("모델군 목록을 불러오는 중입니다..."));
  }
  if (appState.modelGroupLoadState === "error") {
    return renderBranchContainer(
      2,
      renderStageStatus(appState.errorMessageByStage.modelGroup, true, "retry-model-group-btn"),
    );
  }
  if (appState.modelGroupLoadState === "empty") {
    return renderBranchContainer(2, renderStageStatus("표시 가능한 모델군이 없습니다."));
  }
  if (appState.modelGroupLoadState !== "success" || !appState.modelGroups.length) {
    return "";
  }

  const rows = appState.modelGroups
    .map((modelGroup) => {
      const isActive = modelGroup.modelGrpCd === appState.selectedModelGroupCode;
      return `
        <li class="tree-item depth-2">
          ${renderTreeNode({
            depth: 2,
            label: modelGroup.modelGrpNm,
            count: modelGroup.count,
            isActive,
            isPath: isActive,
            dataAttr: "data-model-group-code",
            code: modelGroup.modelGrpCd,
          })}
          ${isActive ? renderModelsBranch() : ""}
        </li>
      `;
    })
    .join("");

  return renderBranchContainer(2, `<ul class="tree-list">${rows}</ul>`);
}

function renderCategoryTree() {
  const brands = appState.brandsByType[appState.brandType] || [];

  if (appState.brandLoadState === "loading") {
    return renderStageStatus("브랜드 목록을 불러오는 중입니다...");
  }
  if (appState.brandLoadState === "error") {
    return renderStageStatus(appState.errorMessageByStage.brand, true, "retry-brand-btn");
  }
  if (appState.brandLoadState === "empty" || !brands.length) {
    return renderStageStatus("표시 가능한 브랜드가 없습니다.");
  }

  const rows = brands
    .map((brand) => {
      const isActive = brand.mnuftrCd === appState.selectedBrandCode;
      return `
        <li class="tree-item depth-1">
          ${renderTreeNode({
            depth: 1,
            label: brand.pathNm,
            count: brand.count,
            isActive,
            isPath: isActive,
            dataAttr: "data-brand-code",
            code: brand.mnuftrCd,
          })}
          ${renderModelGroupsBranch(brand.mnuftrCd)}
        </li>
      `;
    })
    .join("");

  return `<div class="tree-scroll"><ul class="tree-list">${rows}</ul></div>`;
}

function renderSelectionSummary() {
  const brand = selectedBrand();
  const modelGroup = selectedModelGroup();
  const model = selectedModel();
  const grade = selectedGrade();

  return `
    <div class="selection-summary" aria-live="polite">
      <h3 class="summary-title">현재 선택 요약</h3>
      <div class="summary-row">
        <span class="summary-label">1차 (브랜드)</span>
        <span class="summary-value">${brand ? `${escapeHtml(brand.pathNm)} (${brand.count}대)` : "-"}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">2차 (모델군)</span>
        <span class="summary-value">${modelGroup ? `${escapeHtml(modelGroup.modelGrpNm)} (${modelGroup.count}대)` : "-"}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">3차 (세부 모델)</span>
        <span class="summary-value">${model ? `${escapeHtml(model.modelNm)} (${model.count}대)` : "-"}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">4차 (등급/트림)</span>
        <span class="summary-value">${grade ? `${escapeHtml(grade.grdNm)} (${grade.count}대)` : "-"}</span>
      </div>
    </div>
  `;
}

function readDrctTitle(row) {
  if (row?.carWhlNm) {
    return row.carWhlNm;
  }
  if (row?.mnuftrNm || row?.modelNm || row?.grdNm) {
    return [row?.mnuftrNm, row?.modelNm, row?.grdNm].filter(Boolean).join(" ");
  }
  return (
    row?.carNm ||
    row?.carNmView ||
    row?.carFullNm ||
    row?.modelNm ||
    row?.carNo ||
    "차량명 없음"
  );
}

function readDrctPrice(row) {
  const value = Number(row?.prc);
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }
  return `${value.toLocaleString("ko-KR")}만원`;
}

function readDrctImage(row) {
  return row?.msizeImgPath || row?.ssizeImgPath || row?.lsizeImgPath || "";
}

function readDrctCarNo(row) {
  const carNo = String(row?.cno || row?.carNo || "").trim();
  return carNo || "-";
}

function readDrctYear(row) {
  const prdcnYr = String(row?.prdcnYr || "").trim();
  if (prdcnYr) {
    return `${prdcnYr}년`;
  }

  const mfgDt = String(row?.mfgDt || "").trim();
  if (/^\d{6}$/.test(mfgDt)) {
    return `${mfgDt.slice(0, 4)}.${mfgDt.slice(4, 6)}`;
  }
  if (/^\d{4}$/.test(mfgDt)) {
    return `${mfgDt}년`;
  }
  return "-";
}

function readDrctMileage(row) {
  const milg = Number(row?.milg);
  if (!Number.isFinite(milg) || milg <= 0) {
    return "-";
  }
  return `${milg.toLocaleString("ko-KR")}km`;
}

function readDrctPowertrain(row) {
  const fuel = String(row?.fuelNm || "").trim();
  const transmission = String(row?.trnsmsnNm || "").trim();
  if (fuel && transmission) {
    return `${fuel} · ${transmission}`;
  }
  return fuel || transmission || "-";
}

function readDrctTotalCountForHeader() {
  return parseNonNegativeInt(appState.drctTotalCount) ?? appState.drctRows.length;
}

function renderDrctPagination() {
  if (appState.drctTotalPageCount <= 1) {
    return "";
  }

  const current = appState.drctPageNo;
  const total = appState.drctTotalPageCount;
  const windowSize = 5;
  const start = Math.max(1, current - Math.floor(windowSize / 2));
  const end = Math.min(total, start + windowSize - 1);
  const shiftedStart = Math.max(1, end - windowSize + 1);

  const pageButtons = [];
  for (let page = shiftedStart; page <= end; page += 1) {
    pageButtons.push(`
      <button
        type="button"
        class="drct-page-btn ${page === current ? "active" : ""}"
        data-drct-page="${page}"
        aria-current="${page === current ? "page" : "false"}"
      >${page}</button>
    `);
  }

  return `
    <nav class="drct-pagination" aria-label="판매상품 페이지 이동">
      <button
        type="button"
        class="drct-page-btn"
        data-drct-page="${current - 1}"
        ${current <= 1 ? "disabled" : ""}
      >이전</button>
      ${pageButtons.join("")}
      <button
        type="button"
        class="drct-page-btn"
        data-drct-page="${current + 1}"
        ${current >= total ? "disabled" : ""}
      >다음</button>
      <span class="drct-page-status">${current} / ${total} 페이지</span>
    </nav>
  `;
}

function renderDrctThumbnail(title, imageSrc) {
  if (!imageSrc) {
    return `<div class="drct-thumb placeholder">이미지 없음</div>`;
  }

  return `
    <div class="drct-thumb">
      <img
        src="${escapeHtml(imageSrc)}"
        alt="${escapeHtml(title)}"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    </div>
  `;
}

function renderDrctListSection() {
  const totalCount = readDrctTotalCountForHeader();
  const heading = `판매상품 리스트 (총 ${totalCount.toLocaleString("ko-KR")}건)`;

  if (!appState.selectedGradeCode) {
    return `
      <div class="drct-list-panel">
        <h3 class="summary-title">${heading}</h3>
        ${renderStageStatus("4차(등급/트림) 카테고리를 선택하면 조회됩니다.")}
      </div>
    `;
  }

  if (appState.drctLoadState === "loading") {
    return `
      <div class="drct-list-panel">
        <h3 class="summary-title">${heading}</h3>
        ${renderStageStatus("판매상품을 조회하는 중입니다...")}
      </div>
    `;
  }

  if (appState.drctLoadState === "error") {
    return `
      <div class="drct-list-panel">
        <h3 class="summary-title">${heading}</h3>
        ${renderStageStatus(appState.errorMessageByStage.drct, true, "retry-drct-btn")}
      </div>
    `;
  }

  if (appState.drctLoadState === "empty") {
    return `
      <div class="drct-list-panel">
        <h3 class="summary-title">${heading}</h3>
        ${renderStageStatus("조건에 맞는 판매상품이 없습니다.")}
      </div>
    `;
  }

  if (appState.drctLoadState !== "success") {
    return `
      <div class="drct-list-panel">
        <h3 class="summary-title">${heading}</h3>
        ${renderStageStatus("조회 대기 중입니다.")}
      </div>
    `;
  }

  const rows = appState.drctRows
    .map((row) => {
      const title = readDrctTitle(row);
      const price = readDrctPrice(row);
      const imageSrc = readDrctImage(row);
      const carNo = readDrctCarNo(row);
      const year = readDrctYear(row);
      const mileage = readDrctMileage(row);
      const powertrain = readDrctPowertrain(row);

      return `
        <li class="drct-item">
          <div class="drct-item-layout">
            ${renderDrctThumbnail(title, imageSrc)}
            <div class="drct-content">
              <div class="drct-head">
                <div class="drct-title">${escapeHtml(title)}</div>
                <div class="drct-price">${escapeHtml(price)}</div>
              </div>
              <div class="drct-meta">차번호 ${escapeHtml(carNo)} · 연식 ${escapeHtml(year)} · 주행 ${escapeHtml(mileage)}</div>
              <div class="drct-meta">${escapeHtml(powertrain)}</div>
            </div>
          </div>
        </li>
      `;
    })
    .join("");

  return `
    <div class="drct-list-panel">
      <h3 class="summary-title">${heading}</h3>
      <ul class="drct-list">${rows}</ul>
      ${renderDrctPagination()}
    </div>
  `;
}

function renderKcar() {
  return `
    <main class="page-shell kcar-layout">
      <aside class="panel side-panel">
        <button id="home-btn" class="back-btn" type="button">홈으로</button>
        <section class="category-section tree-section" aria-labelledby="tree-title">
          <h2 id="tree-title" class="panel-title">매물 찾기를 위한 카테고리 선택</h2>
          <div class="type-tabs" role="tablist" aria-label="브랜드 그룹">
            <button
              type="button"
              class="type-tab ${appState.brandType === "KOR" ? "active" : ""}"
              role="tab"
              aria-selected="${appState.brandType === "KOR" ? "true" : "false"}"
              data-brand-type="KOR"
            >국산</button>
            <button
              type="button"
              class="type-tab ${appState.brandType === "IMP" ? "active" : ""}"
              role="tab"
              aria-selected="${appState.brandType === "IMP" ? "true" : "false"}"
              data-brand-type="IMP"
            >수입</button>
          </div>
          ${renderCategoryTree()}
        </section>
      </aside>

      <section class="panel right-panel">
        <h2 class="panel-title">KCAR 중고차 매물 조회</h2>
        ${renderSelectionSummary()}
        ${renderDrctListSection()}
      </section>
    </main>
  `;
}

function render() {
  const root = document.querySelector("#app");
  if (!root) {
    return;
  }

  root.innerHTML = appState.platform === "home" ? renderHome() : renderKcar();
  bindEvents();
}

function bindEvents() {
  const kcarButton = document.querySelector("#kcar-btn");
  if (kcarButton) {
    kcarButton.addEventListener("click", () => {
      appState.platform = "kcar";
      render();
      fetchBrands();
    });
  }

  const homeButton = document.querySelector("#home-btn");
  if (homeButton) {
    homeButton.addEventListener("click", () => {
      appState.platform = "home";
      render();
    });
  }

  const retryBrandButton = document.querySelector("#retry-brand-btn");
  if (retryBrandButton) {
    retryBrandButton.addEventListener("click", fetchBrands);
  }

  const retryModelGroupButton = document.querySelector("#retry-model-group-btn");
  if (retryModelGroupButton) {
    retryModelGroupButton.addEventListener("click", () => {
      if (!appState.selectedBrandCode) {
        return;
      }
      fetchModelGroups(appState.selectedBrandCode);
    });
  }

  const retryModelButton = document.querySelector("#retry-model-btn");
  if (retryModelButton) {
    retryModelButton.addEventListener("click", () => {
      if (!appState.selectedBrandCode || !appState.selectedModelGroupCode) {
        return;
      }
      fetchModels(appState.selectedBrandCode, appState.selectedModelGroupCode);
    });
  }

  const retryGradeButton = document.querySelector("#retry-grade-btn");
  if (retryGradeButton) {
    retryGradeButton.addEventListener("click", () => {
      if (
        !appState.selectedBrandCode ||
        !appState.selectedModelGroupCode ||
        !appState.selectedModelCode
      ) {
        return;
      }
      fetchGrades(
        appState.selectedBrandCode,
        appState.selectedModelGroupCode,
        appState.selectedModelCode,
      );
    });
  }

  const retryDrctButton = document.querySelector("#retry-drct-btn");
  if (retryDrctButton) {
    retryDrctButton.addEventListener("click", () => {
      if (
        !appState.selectedBrandCode ||
        !appState.selectedModelGroupCode ||
        !appState.selectedModelCode ||
        !appState.selectedGradeCode
      ) {
        return;
      }
      fetchDrctList(
        appState.selectedBrandCode,
        appState.selectedModelGroupCode,
        appState.selectedModelCode,
        appState.selectedGradeCode,
        appState.drctPageNo,
      );
    });
  }

  const typeButtons = document.querySelectorAll("[data-brand-type]");
  typeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextType = button.getAttribute("data-brand-type");
      if (!nextType || nextType === appState.brandType) {
        return;
      }

      appState.brandType = nextType;
      render();
    });
  });

  const brandButtons = document.querySelectorAll("[data-brand-code]");
  brandButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const code = button.getAttribute("data-brand-code");
      if (!code) {
        return;
      }

      if (code === appState.selectedBrandCode) {
        resetFromBrandSelection();
        render();
        fetchModelGroups(code);
        return;
      }

      appState.selectedBrandCode = code;
      resetFromBrandSelection();
      render();
      fetchModelGroups(code);
    });
  });

  const modelGroupButtons = document.querySelectorAll("[data-model-group-code]");
  modelGroupButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const code = button.getAttribute("data-model-group-code");
      if (!code || !appState.selectedBrandCode) {
        return;
      }

      if (code === appState.selectedModelGroupCode) {
        resetFromModelGroupSelection();
        render();
        fetchModels(appState.selectedBrandCode, code);
        return;
      }

      appState.selectedModelGroupCode = code;
      resetFromModelGroupSelection();
      render();
      fetchModels(appState.selectedBrandCode, code);
    });
  });

  const modelButtons = document.querySelectorAll("[data-model-code]");
  modelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const code = button.getAttribute("data-model-code");
      if (!code || !appState.selectedBrandCode || !appState.selectedModelGroupCode) {
        return;
      }

      if (code === appState.selectedModelCode) {
        resetFromModelSelection();
        render();
        fetchGrades(appState.selectedBrandCode, appState.selectedModelGroupCode, code);
        return;
      }

      appState.selectedModelCode = code;
      resetFromModelSelection();
      render();
      fetchGrades(appState.selectedBrandCode, appState.selectedModelGroupCode, code);
    });
  });

  const gradeButtons = document.querySelectorAll("[data-grade-code]");
  gradeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const code = button.getAttribute("data-grade-code");
      if (
        !code ||
        !appState.selectedBrandCode ||
        !appState.selectedModelGroupCode ||
        !appState.selectedModelCode
      ) {
        return;
      }

      if (code === appState.selectedGradeCode) {
        if (appState.drctLoadState === "idle" || appState.drctLoadState === "error") {
          fetchDrctList(
            appState.selectedBrandCode,
            appState.selectedModelGroupCode,
            appState.selectedModelCode,
            code,
            1,
          );
        }
        return;
      }

      appState.selectedGradeCode = code;
      resetFromGradeSelection();
      render();
      fetchDrctList(
        appState.selectedBrandCode,
        appState.selectedModelGroupCode,
        appState.selectedModelCode,
        code,
        1,
      );
    });
  });

  const drctPageButtons = document.querySelectorAll("[data-drct-page]");
  drctPageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (
        appState.drctLoadState === "loading" ||
        !appState.selectedBrandCode ||
        !appState.selectedModelGroupCode ||
        !appState.selectedModelCode ||
        !appState.selectedGradeCode
      ) {
        return;
      }

      const page = parsePositiveInt(button.getAttribute("data-drct-page"));
      if (!page || page === appState.drctPageNo || page > appState.drctTotalPageCount) {
        return;
      }

      fetchDrctList(
        appState.selectedBrandCode,
        appState.selectedModelGroupCode,
        appState.selectedModelCode,
        appState.selectedGradeCode,
        page,
      );
    });
  });
}

render();
