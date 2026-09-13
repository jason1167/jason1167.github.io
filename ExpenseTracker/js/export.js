/**
 * export.js — 備份 / 還原
 *
 * 目前不會連線任何伺服器或 iCloud API。
 * 匯出時優先使用 Web Share API（iOS Safari 15+），使用者可在分享面板中
 * 選擇「儲存到檔案」→「iCloud 雲端硬碟」，等於手動完成同步；
 * 若裝置不支援分享 API，則退回一般檔案下載。
 *
 * 未來若要接上真正的 iCloud 自動同步（CloudKit JS 或其他方案），
 * 可以直接沿用 buildBackupPayload() 產出的物件格式作為上傳內容。
 */

const BACKUP_FORMAT_VERSION = 1;

async function buildBackupPayload() {
  const [records, categories] = await Promise.all([
    DB.getAllRecords(),
    DB.getAllCategories(),
  ]);
  return {
    app: "expense-tracker",
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    categories,
    records,
  };
}

function backupFileName(ext) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `expense-backup-${stamp}.${ext}`;
}

async function shareOrDownloadFile(blob, filename, mimeType) {
  const file = new File([blob], filename, { type: mimeType });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (err) {
      // 使用者取消分享，不視為錯誤
      if (err && err.name === "AbortError") return "cancelled";
      // 分享失敗則退回下載
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

async function exportAsJSON() {
  const payload = await buildBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  return shareOrDownloadFile(blob, backupFileName("json"), "application/json");
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function exportAsCSV() {
  const [records, categories] = await Promise.all([
    DB.getAllRecords(),
    DB.getAllCategories(),
  ]);
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const header = ["日期時間", "分類", "金額", "備註"];
  const rows = records.map((r) => [
    r.occurredAt.replace("T", " ").slice(0, 16),
    categoryMap[r.categoryId] || r.categoryId,
    r.amount,
    r.memo || "",
  ]);

  const csvBody = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  // 加上 BOM，避免 Excel/Numbers 開啟中文時亂碼
  const blob = new Blob(["\uFEFF" + csvBody], { type: "text/csv;charset=utf-8" });
  return shareOrDownloadFile(blob, backupFileName("csv"), "text/csv");
}

/**
 * 從匯入的 JSON 檔還原資料。
 * mode: "replace" 會清空現有資料再匯入；"merge" 會保留現有資料並疊加匯入內容
 * （相同 id 的紀錄／分類會被匯入內容覆蓋）。
 */
async function importFromJSONFile(file, mode = "merge") {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (e) {
    throw new Error("檔案格式錯誤，不是有效的 JSON 備份檔");
  }

  if (!payload || !Array.isArray(payload.records) || !Array.isArray(payload.categories)) {
    throw new Error("檔案內容不是本 App 的備份格式");
  }

  if (mode === "replace") {
    await DB.replaceAllCategories(payload.categories);
    await DB.replaceAllRecords(payload.records);
  } else {
    await DB.replaceAllCategories(
      dedupeById([...(await DB.getAllCategories()), ...payload.categories])
    );
    await DB.mergeRecords(payload.records);
  }

  return {
    recordCount: payload.records.length,
    categoryCount: payload.categories.length,
  };
}

function dedupeById(list) {
  const map = new Map();
  list.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}
