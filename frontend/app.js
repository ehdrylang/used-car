const API_BASE_URL =
  window.__USED_CAR_API_BASE_URL__ ||
  (window.location.port === "4173" ? "http://localhost:8787" : "");

const KCAR_BRAND_ENDPOINT = `${API_BASE_URL}/api/kcar/brands`;
const KCAR_MODEL_GROUP_ENDPOINT = `${API_BASE_URL}/api/kcar/model-groups`;
const KCAR_MODEL_ENDPOINT = `${API_BASE_URL}/api/kcar/models`;
const KCAR_GRADE_ENDPOINT = `${API_BASE_URL}/api/kcar/grades`;

const appState = {
  platform: "home",
  brandType: "KOR",
  brandLoadState: "idle",
  modelGroupLoadState: "idle",
  modelLoadState: "idle",
  gradeLoadState: "idle",
  selectedBrandCode: null,
  selectedModelGroupCode: null,
  selectedModelCode: null,
  selectedGradeCode: null,
  brandsByType: { KOR: [], IMP: [] },
  modelGroups: [],
  models: [],
  grades: [],
  errorMessageByStage: {
    brand: "",
    modelGroup: "",
    model: "",
    grade: "",
  },
  requestSeq: {
    modelGroup: 0,
    model: 0,
    grade: 0,
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

function sortByCountAndName(items, nameKey) {
  return [...items].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return String(a[nameKey]).localeCompare(String(b[nameKey]), "ko");
  });
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
  return appState.modelGroups.find((item) => item.modelGrpCd === appState.selectedModelGroupCode) || null;
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

function resetFromBrandSelection() {
  bumpRequestSeq("modelGroup");
  bumpRequestSeq("model");
  bumpRequestSeq("grade");
  resetModelGroupStage();
  resetModelStage();
  resetGradeStage();
}

function resetFromModelGroupSelection() {
  bumpRequestSeq("model");
  bumpRequestSeq("grade");
  resetModelStage();
  resetGradeStage();
}

function resetFromModelSelection() {
  bumpRequestSeq("grade");
  resetGradeStage();
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

    const normalized = rows.map(normalizeBrandRow).filter((item) => item.mnuftrCd);
    const kor = sortByCountAndName(
      normalized.filter((item) => item.carType === "KOR"),
      "pathNm",
    );
    const imp = sortByCountAndName(
      normalized.filter((item) => item.carType === "IMP"),
      "pathNm",
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
    const items = sortByCountAndName(
      rows.map(normalizeModelGroupRow).filter((item) => item.modelGrpCd),
      "modelGrpNm",
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
    const items = sortByCountAndName(
      rows.map(normalizeModelRow).filter((item) => item.modelCd),
      "modelNm",
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
    const items = sortByCountAndName(
      rows.map(normalizeGradeRow).filter((item) => item.grdCd),
      "grdNm",
    );

    appState.grades = items;
    appState.gradeLoadState = items.length ? "success" : "empty";

    const exists = items.some((item) => item.grdCd === appState.selectedGradeCode);
    if (!exists) {
      appState.selectedGradeCode = null;
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

function renderSelectableItems({ items, selectedCode, codeKey, nameKey, subtitleKey, dataAttr }) {
  const rows = items
    .map((item) => {
      const isSelected = item[codeKey] === selectedCode;
      const subtitle = subtitleKey && item[subtitleKey] ? item[subtitleKey] : "";

      return `
        <li class="brand-item">
          <button
            class="brand-btn ${isSelected ? "active" : ""}"
            ${dataAttr}="${escapeHtml(item[codeKey])}"
            type="button"
            aria-pressed="${isSelected ? "true" : "false"}"
          >
            <span class="option-content">
              <span class="option-main">${escapeHtml(item[nameKey])}</span>
              ${subtitle ? `<span class="option-sub">${escapeHtml(subtitle)}</span>` : ""}
            </span>
            <span class="brand-count">${item.count}</span>
          </button>
        </li>
      `;
    })
    .join("");

  return `<ul class="brand-list" aria-label="카테고리 목록">${rows}</ul>`;
}

function renderBrandSection() {
  const loadState = appState.brandLoadState;
  const brands = appState.brandsByType[appState.brandType] || [];

  let body = "";
  if (loadState === "loading") {
    body = renderStageStatus("브랜드 목록을 불러오는 중입니다...");
  } else if (loadState === "error") {
    body = renderStageStatus(appState.errorMessageByStage.brand, true, "retry-brand-btn");
  } else if (loadState === "empty") {
    body = renderStageStatus("조회 가능한 브랜드가 없습니다.");
  } else if (!brands.length) {
    body = renderStageStatus("해당 그룹의 브랜드가 없습니다.");
  } else {
    body = renderSelectableItems({
      items: brands,
      selectedCode: appState.selectedBrandCode,
      codeKey: "mnuftrCd",
      nameKey: "pathNm",
      dataAttr: "data-brand-code",
    });
  }

  return `
    <section class="category-section" aria-labelledby="brand-title">
      <h2 id="brand-title" class="panel-title">1차 카테고리: 브랜드</h2>
      <div class="type-tabs" role="tablist" aria-label="브랜드 그룹">
        <button
          type="button"
          class="type-tab ${appState.brandType === "KOR" ? "active" : ""}"
          role="tab"
          aria-selected="${appState.brandType === "KOR" ? "true" : "false"}"
          id="tab-kor"
          data-brand-type="KOR"
        >국산</button>
        <button
          type="button"
          class="type-tab ${appState.brandType === "IMP" ? "active" : ""}"
          role="tab"
          aria-selected="${appState.brandType === "IMP" ? "true" : "false"}"
          id="tab-imp"
          data-brand-type="IMP"
        >수입</button>
      </div>
      ${body}
    </section>
  `;
}

function renderModelGroupSection() {
  if (!appState.selectedBrandCode) {
    return `
      <section class="category-section" aria-labelledby="model-group-title">
        <h2 id="model-group-title" class="panel-title">2차 카테고리: 모델군</h2>
        ${renderStageStatus("브랜드를 먼저 선택하세요.")}
      </section>
    `;
  }

  const loadState = appState.modelGroupLoadState;
  let body = "";
  if (loadState === "loading") {
    body = renderStageStatus("모델군 목록을 불러오는 중입니다...");
  } else if (loadState === "error") {
    body = renderStageStatus(
      appState.errorMessageByStage.modelGroup,
      true,
      "retry-model-group-btn",
    );
  } else if (loadState === "empty") {
    body = renderStageStatus("조회 가능한 모델군이 없습니다.");
  } else if (loadState === "idle") {
    body = renderStageStatus("모델군을 불러올 준비 중입니다.");
  } else {
    body = renderSelectableItems({
      items: appState.modelGroups,
      selectedCode: appState.selectedModelGroupCode,
      codeKey: "modelGrpCd",
      nameKey: "modelGrpNm",
      dataAttr: "data-model-group-code",
    });
  }

  return `
    <section class="category-section" aria-labelledby="model-group-title">
      <h2 id="model-group-title" class="panel-title">2차 카테고리: 모델군</h2>
      ${body}
    </section>
  `;
}

function renderModelSection() {
  if (!appState.selectedModelGroupCode) {
    return `
      <section class="category-section" aria-labelledby="model-title">
        <h2 id="model-title" class="panel-title">3차 카테고리: 세부 모델</h2>
        ${renderStageStatus("모델군을 먼저 선택하세요.")}
      </section>
    `;
  }

  const loadState = appState.modelLoadState;
  let body = "";
  if (loadState === "loading") {
    body = renderStageStatus("세부 모델 목록을 불러오는 중입니다...");
  } else if (loadState === "error") {
    body = renderStageStatus(appState.errorMessageByStage.model, true, "retry-model-btn");
  } else if (loadState === "empty") {
    body = renderStageStatus("조회 가능한 세부 모델이 없습니다.");
  } else if (loadState === "idle") {
    body = renderStageStatus("세부 모델을 불러올 준비 중입니다.");
  } else {
    body = renderSelectableItems({
      items: appState.models,
      selectedCode: appState.selectedModelCode,
      codeKey: "modelCd",
      nameKey: "modelNm",
      subtitleKey: "prdcnYear",
      dataAttr: "data-model-code",
    });
  }

  return `
    <section class="category-section" aria-labelledby="model-title">
      <h2 id="model-title" class="panel-title">3차 카테고리: 세부 모델</h2>
      ${body}
    </section>
  `;
}

function renderGradeSection() {
  if (!appState.selectedModelCode) {
    return `
      <section class="category-section" aria-labelledby="grade-title">
        <h2 id="grade-title" class="panel-title">4차 카테고리: 등급/트림</h2>
        ${renderStageStatus("세부 모델을 먼저 선택하세요.")}
      </section>
    `;
  }

  const loadState = appState.gradeLoadState;
  let body = "";
  if (loadState === "loading") {
    body = renderStageStatus("등급/트림 목록을 불러오는 중입니다...");
  } else if (loadState === "error") {
    body = renderStageStatus(appState.errorMessageByStage.grade, true, "retry-grade-btn");
  } else if (loadState === "empty") {
    body = renderStageStatus("조회 가능한 등급/트림이 없습니다.");
  } else if (loadState === "idle") {
    body = renderStageStatus("등급/트림을 불러올 준비 중입니다.");
  } else {
    body = renderSelectableItems({
      items: appState.grades,
      selectedCode: appState.selectedGradeCode,
      codeKey: "grdCd",
      nameKey: "grdNm",
      dataAttr: "data-grade-code",
    });
  }

  return `
    <section class="category-section" aria-labelledby="grade-title">
      <h2 id="grade-title" class="panel-title">4차 카테고리: 등급/트림</h2>
      ${body}
    </section>
  `;
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

function renderKcar() {
  return `
    <main class="page-shell kcar-layout">
      <aside class="panel side-panel">
        <button id="home-btn" class="back-btn" type="button">홈으로</button>
        ${renderBrandSection()}
        ${renderModelGroupSection()}
        ${renderModelSection()}
        ${renderGradeSection()}
      </aside>

      <section class="panel right-panel">
        <h2 class="panel-title">KCAR 조회</h2>
        <p>1차부터 4차 카테고리까지 순서대로 선택할 수 있습니다.</p>
        <p class="selection-hint">4차(등급/트림) 선택까지 완료하면 다음 단계인 매물 조회로 연결할 수 있습니다.</p>
        ${renderSelectionSummary()}
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
      if (!appState.selectedBrandCode || !appState.selectedModelGroupCode || !appState.selectedModelCode) {
        return;
      }
      fetchGrades(appState.selectedBrandCode, appState.selectedModelGroupCode, appState.selectedModelCode);
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
      if (!code || code === appState.selectedBrandCode) {
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
      if (!code || code === appState.selectedModelGroupCode || !appState.selectedBrandCode) {
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
      if (
        !code ||
        code === appState.selectedModelCode ||
        !appState.selectedBrandCode ||
        !appState.selectedModelGroupCode
      ) {
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
      if (!code || code === appState.selectedGradeCode) {
        return;
      }

      appState.selectedGradeCode = code;
      render();
    });
  });
}

render();
