const ENC_KEY = "SKFJ2424DasfaJRI";
const ENC_IV = "sfq241sf3dscs321";

const textEncoder = new TextEncoder();

function setParam(param) {
  const result = {};
  Object.keys(param || {}).forEach((key) => {
    if (param[key]) {
      result[key] = param[key];
    }
  });
  return result;
}

function toBase64(bytes) {
  if (typeof btoa === "function") {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  throw new Error("Base64 인코딩을 지원하지 않는 환경입니다.");
}

async function importAesKey() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("브라우저 암호화 API를 사용할 수 없습니다.");
  }

  return globalThis.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(ENC_KEY),
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  );
}

async function encryptJsonString(jsonText) {
  const key = await importAesKey();
  const cipherBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv: textEncoder.encode(ENC_IV),
    },
    key,
    textEncoder.encode(jsonText),
  );
  return toBase64(new Uint8Array(cipherBuffer));
}

export async function createKcarEnc(param) {
  const payload = JSON.stringify(setParam(param));
  return encryptJsonString(payload);
}

export function createDrctPlainParam(codes) {
  return {
    pageno: 1,
    limit: 26,
    orderFlag: true,
    orderBy: "time_deal_yn:desc|time_deal_end_dt:asc|event_ordr:asc|sort_ordr:asc",
    wr_eq_sell_dcd: "ALL",
    wr_in_multi_columns: "cntr_rgn_cd|cntr_cd",
    wr_in_multi_mnuftr_modelGrp_model_grd: [
      codes.mnuftrCd,
      codes.modelGrpCd,
      codes.modelCd,
      codes.grdCd,
    ].join(","),
  };
}
