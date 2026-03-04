const API_BASE_URL =
  window.__USED_CAR_API_BASE_URL__ ||
  (window.location.port === "4173" ? "http://localhost:8787" : "");
const KCAR_BRAND_ENDPOINT = `${API_BASE_URL}/api/kcar/brands`;

const appState = {
  platform: "home",
  brandType: "KOR",
  brandLoadState: "idle",
  selectedBrandCode: null,
  brandsByType: { KOR: [], IMP: [] },
  errorMessage: "",
};

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sortBrands(items) {
  return [...items].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.pathNm.localeCompare(b.pathNm, "ko");
  });
}

function normalizeBrandRow(row) {
  return {
    mnuftrCd: String(row.mnuftrCd || ""),
    pathNm: String(row.pathNm || ""),
    carType: row.carType === "IMP" ? "IMP" : "KOR",
    count: Number.isFinite(row.count) ? row.count : 0,
  };
}

async function fetchBrands() {
  appState.brandLoadState = "loading";
  appState.errorMessage = "";
  render();

  try {
    const response = await fetch(KCAR_BRAND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sellType: "ALL",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];

    if (!payload?.success || rows.length === 0) {
      appState.brandsByType = { KOR: [], IMP: [] };
      appState.selectedBrandCode = null;
      appState.brandLoadState = "empty";
      render();
      return;
    }

    const normalized = rows.map(normalizeBrandRow);
    const kor = sortBrands(normalized.filter((item) => item.carType === "KOR"));
    const imp = sortBrands(normalized.filter((item) => item.carType === "IMP"));

    appState.brandsByType = { KOR: kor, IMP: imp };
    appState.brandLoadState = kor.length || imp.length ? "success" : "empty";

    if (!appState.brandsByType[appState.brandType].length) {
      appState.brandType = appState.brandType === "KOR" ? "IMP" : "KOR";
    }

    const allCodes = new Set(normalized.map((item) => item.mnuftrCd));
    if (appState.selectedBrandCode && !allCodes.has(appState.selectedBrandCode)) {
      appState.selectedBrandCode = null;
    }

    render();
  } catch (error) {
    appState.brandLoadState = "error";
    appState.errorMessage = "브랜드 목록을 불러오지 못했습니다. 다시 시도해주세요.";
    render();
  }
}

function selectedBrand() {
  const all = [...appState.brandsByType.KOR, ...appState.brandsByType.IMP];
  return all.find((item) => item.mnuftrCd === appState.selectedBrandCode) || null;
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

function renderBrandList() {
  if (appState.brandLoadState === "loading") {
    return `<div class="status" role="status" aria-live="polite">브랜드 목록을 불러오는 중입니다...</div>`;
  }

  if (appState.brandLoadState === "error") {
    return `
      <div class="status error" role="alert">
        ${escapeHtml(appState.errorMessage)}
        <div>
          <button id="retry-btn" class="retry-btn" type="button">다시 시도</button>
        </div>
      </div>
    `;
  }

  if (appState.brandLoadState === "empty") {
    return `<div class="status" role="status">조회 가능한 브랜드가 없습니다.</div>`;
  }

  const brands = appState.brandsByType[appState.brandType] || [];
  if (!brands.length) {
    return `<div class="status" role="status">해당 그룹의 브랜드가 없습니다.</div>`;
  }

  const rows = brands
    .map((brand) => {
      const isSelected = brand.mnuftrCd === appState.selectedBrandCode;
      return `
        <li class="brand-item">
          <button
            class="brand-btn ${isSelected ? "active" : ""}"
            data-brand-code="${escapeHtml(brand.mnuftrCd)}"
            type="button"
            aria-pressed="${isSelected ? "true" : "false"}"
          >
            <span>${escapeHtml(brand.pathNm)}</span>
            <span class="brand-count">${brand.count}</span>
          </button>
        </li>
      `;
    })
    .join("");

  return `<ul class="brand-list" aria-label="브랜드 목록">${rows}</ul>`;
}

function renderKcar() {
  const current = selectedBrand();

  return `
    <main class="page-shell kcar-layout">
      <aside class="panel side-panel" aria-labelledby="brand-title">
        <button id="home-btn" class="back-btn" type="button">홈으로</button>
        <h2 id="brand-title" class="panel-title">브랜드 선택</h2>

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

        ${renderBrandList()}
      </aside>

      <section class="panel right-panel">
        <h2 class="panel-title">KCAR 조회</h2>
        <p>브랜드를 선택하면 다음 단계에서 차량 모델을 선택할 수 있습니다.</p>
        <p class="selection-hint">현재 구현 범위는 브랜드 선택 단계까지입니다.</p>

        ${
          current
            ? `<div class="selected-card"><strong>선택된 브랜드:</strong> ${escapeHtml(current.pathNm)} (${current.count}대)</div>`
            : ""
        }
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

  const retryButton = document.querySelector("#retry-btn");
  if (retryButton) {
    retryButton.addEventListener("click", fetchBrands);
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

      appState.selectedBrandCode = code;
      render();
    });
  });
}

render();
