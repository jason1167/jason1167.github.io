/**
 * app.js — UI 邏輯
 */

const state = {
  categories: [],
  records: [],
  selectedCategoryId: null,      // 快速記錄表單目前選取的分類
  editSelectedCategoryId: null,  // 編輯視窗目前選取的分類
  monthOffset: 0,                // 0 = 本月, -1 = 上個月 ...
};

const $ = (sel) => document.querySelector(sel);

// ---------- 工具 ----------

function pad2(n) { return String(n).padStart(2, "0"); }

function nowDateTimeParts() {
  const d = new Date();
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

function formatMoney(n) {
  return "$" + Number(n).toLocaleString("zh-Hant-TW", { maximumFractionDigits: 0 });
}

function monthLabel(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}

function isInMonth(isoDateTime, offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const target = new Date(isoDateTime);
  return target.getFullYear() === d.getFullYear() && target.getMonth() === d.getMonth();
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
function formatDayHeader(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

function categoryById(id) {
  return state.categories.find((c) => c.id === id);
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2200);
}

// ---------- 分類 chips ----------

function renderCategoryChips(container, selectedId, onSelect) {
  container.innerHTML = "";
  state.categories.forEach((cat) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (cat.id === selectedId ? " selected" : "");
    chip.setAttribute("role", "option");
    chip.setAttribute("aria-selected", String(cat.id === selectedId));
    chip.innerHTML = `<span>${escapeHtml(cat.icon)}</span><span>${escapeHtml(cat.name)}</span>`;
    chip.addEventListener("click", () => onSelect(cat.id));
    container.appendChild(chip);
  });
}

function refreshQuickAddChips() {
  if (!state.selectedCategoryId && state.categories.length) {
    state.selectedCategoryId = state.categories[0].id;
  }
  renderCategoryChips($("#categoryChips"), state.selectedCategoryId, (id) => {
    state.selectedCategoryId = id;
    refreshQuickAddChips();
  });
}

function refreshEditChips() {
  renderCategoryChips($("#editCategoryChips"), state.editSelectedCategoryId, (id) => {
    state.editSelectedCategoryId = id;
    refreshEditChips();
  });
}

// ---------- 摘要 + 列表 ----------

function renderSummary() {
  $("#summaryMonth").textContent = monthLabel(state.monthOffset);
  const monthRecords = state.records.filter((r) => isInMonth(r.occurredAt, state.monthOffset));
  const total = monthRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  $("#summaryTotal").textContent = formatMoney(total);
  $("#recordsCount").textContent = monthRecords.length ? `共 ${monthRecords.length} 筆` : "";
}

function renderRecordsList() {
  const listEl = $("#recordsList");
  const monthRecords = state.records
    .filter((r) => isInMonth(r.occurredAt, state.monthOffset))
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

  listEl.innerHTML = "";

  if (!monthRecords.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = state.monthOffset === 0
      ? "這個月還沒有任何紀錄，上面填好金額就能記一筆。"
      : "這個月沒有紀錄。";
    listEl.appendChild(empty);
    return;
  }

  // 依日期分組（key: yyyy-mm-dd）
  const groups = new Map();
  monthRecords.forEach((r) => {
    const dateKey = r.occurredAt.slice(0, 10);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey).push(r);
  });

  Array.from(groups.keys())
    .sort((a, b) => (a < b ? 1 : -1))
    .forEach((dateKey) => {
      const dayRecords = groups.get(dateKey);
      const dayTotal = dayRecords.reduce((sum, r) => sum + Number(r.amount), 0);

      const group = document.createElement("div");
      group.className = "day-group";

      const header = document.createElement("div");
      header.className = "day-header";
      header.innerHTML = `<span>${formatDayHeader(dateKey)}</span><span class="day-total">${formatMoney(dayTotal)}</span>`;
      group.appendChild(header);

      dayRecords.forEach((r) => {
        const cat = categoryById(r.categoryId) || { icon: "🏷️", name: r.categoryId };
        const row = document.createElement("div");
        row.className = "record-row";
        row.dataset.id = r.id;
        const timePart = r.occurredAt.slice(11, 16);
        row.innerHTML = `
          <div class="record-icon">${escapeHtml(cat.icon)}</div>
          <div class="record-main">
            <div class="record-category">${escapeHtml(cat.name)}${r.memo ? " · " + escapeHtml(r.memo) : ""}</div>
            <div class="record-time">${timePart}</div>
          </div>
          <div class="record-amount">${formatMoney(r.amount)}</div>
        `;
        row.addEventListener("click", () => openEditModal(r));
        group.appendChild(row);
      });

      listEl.appendChild(group);
    });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function renderAll() {
  renderSummary();
  renderRecordsList();
}

// ---------- 快速記錄表單 ----------

function resetQuickAddForm() {
  const { date, time } = nowDateTimeParts();
  $("#inputAmount").value = "";
  $("#inputDate").value = date;
  $("#inputTime").value = time;
  $("#inputMemo").value = "";
  refreshQuickAddChips();
}

async function handleQuickAddSubmit(e) {
  e.preventDefault();
  const amount = parseFloat($("#inputAmount").value);
  if (!amount || amount <= 0) {
    toast("請輸入有效金額");
    return;
  }
  if (!state.selectedCategoryId) {
    toast("請選擇分類");
    return;
  }
  const date = $("#inputDate").value;
  const time = $("#inputTime").value || "00:00";
  const occurredAt = `${date}T${time}:00`;
  const memo = $("#inputMemo").value.trim();

  const record = await DB.addRecord({
    amount,
    categoryId: state.selectedCategoryId,
    occurredAt,
    memo,
  });
  state.records.unshift(record);

  // 若記的不是本月，自動切回該筆所在月份，讓使用者立即看到
  if (!isInMonth(occurredAt, state.monthOffset)) {
    state.monthOffset = 0;
  }

  renderAll();
  resetQuickAddForm();
  toast("已記一筆");
}

// ---------- 編輯 / 刪除 ----------

function openEditModal(record) {
  $("#editId").value = record.id;
  $("#editAmount").value = record.amount;
  $("#editDate").value = record.occurredAt.slice(0, 10);
  $("#editTime").value = record.occurredAt.slice(11, 16);
  $("#editMemo").value = record.memo || "";
  state.editSelectedCategoryId = record.categoryId;
  refreshEditChips();
  $("#editModal").classList.remove("hidden");
}

function closeEditModal() {
  $("#editModal").classList.add("hidden");
}

async function handleEditSubmit(e) {
  e.preventDefault();
  const id = Number($("#editId").value);
  const amount = parseFloat($("#editAmount").value);
  if (!amount || amount <= 0) {
    toast("請輸入有效金額");
    return;
  }
  const date = $("#editDate").value;
  const time = $("#editTime").value || "00:00";
  const occurredAt = `${date}T${time}:00`;
  const memo = $("#editMemo").value.trim();

  const existing = state.records.find((r) => r.id === id);
  const updated = await DB.updateRecord({
    ...existing,
    amount,
    categoryId: state.editSelectedCategoryId,
    occurredAt,
    memo,
  });

  const idx = state.records.findIndex((r) => r.id === id);
  state.records[idx] = updated;

  renderAll();
  closeEditModal();
  toast("已儲存變更");
}

async function handleDeleteRecord() {
  const id = Number($("#editId").value);
  if (!confirm("確定要刪除這筆紀錄嗎？")) return;
  await DB.deleteRecord(id);
  state.records = state.records.filter((r) => r.id !== id);
  renderAll();
  closeEditModal();
  toast("已刪除");
}

// ---------- 分類管理 ----------

function renderCategoryManageList() {
  const listEl = $("#categoryManageList");
  listEl.innerHTML = "";
  state.categories.forEach((cat) => {
    const li = document.createElement("li");
    li.className = "category-manage-item";
    li.innerHTML = `
      <span class="cm-icon">${escapeHtml(cat.icon)}</span>
      <span class="cm-name">${escapeHtml(cat.name)}</span>
      <button type="button" class="cm-delete">刪除</button>
    `;
    li.querySelector(".cm-delete").addEventListener("click", () => handleDeleteCategory(cat.id));
    listEl.appendChild(li);
  });
}

async function handleDeleteCategory(id) {
  const inUse = state.records.some((r) => r.categoryId === id);
  if (inUse && !confirm("已有紀錄使用這個分類，刪除後這些紀錄仍會保留分類名稱但無法再選取。確定刪除？")) {
    return;
  }
  await DB.deleteCategory(id);
  state.categories = state.categories.filter((c) => c.id !== id);
  renderCategoryManageList();
  refreshQuickAddChips();
  toast("已刪除分類");
}

async function handleAddCategory(e) {
  e.preventDefault();
  const icon = $("#newCategoryIcon").value.trim() || "🏷️";
  const name = $("#newCategoryName").value.trim();
  if (!name) return;
  const id = "c_" + Date.now().toString(36);
  const order = state.categories.length;
  const category = await DB.addCategory({ id, name, icon, order, isDefault: false });
  state.categories.push(category);
  $("#newCategoryIcon").value = "";
  $("#newCategoryName").value = "";
  renderCategoryManageList();
  refreshQuickAddChips();
  toast("已新增分類");
}

// ---------- 匯出 / 匯入 ----------

async function handleExportJson() {
  $("#exportStatus").textContent = "處理中…";
  try {
    const result = await exportAsJSON();
    $("#exportStatus").textContent = result === "shared" ? "已開啟分享面板" : "已下載備份檔";
  } catch (err) {
    $("#exportStatus").textContent = "匯出失敗：" + err.message;
  }
}

async function handleExportCsv() {
  $("#exportStatus").textContent = "處理中…";
  try {
    const result = await exportAsCSV();
    $("#exportStatus").textContent = result === "shared" ? "已開啟分享面板" : "已下載 CSV 檔";
  } catch (err) {
    $("#exportStatus").textContent = "匯出失敗：" + err.message;
  }
}

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const useMerge = confirm("要保留現有資料並疊加匯入內容嗎？\n「確定」= 合併／「取消」= 清空後改用備份檔內容");
  try {
    const result = await importFromJSONFile(file, useMerge ? "merge" : "replace");
    await reloadFromDB();
    $("#exportStatus").textContent = `已還原 ${result.recordCount} 筆紀錄、${result.categoryCount} 個分類`;
    toast("已還原備份資料");
  } catch (err) {
    $("#exportStatus").textContent = "還原失敗：" + err.message;
  } finally {
    e.target.value = "";
  }
}

async function reloadFromDB() {
  const [categories, records] = await Promise.all([DB.getAllCategories(), DB.getAllRecords()]);
  state.categories = categories;
  state.records = records;
  refreshQuickAddChips();
  renderCategoryManageList();
  renderAll();
}

// ---------- 綁定事件 ----------

function bindEvents() {
  $("#quickAddForm").addEventListener("submit", handleQuickAddSubmit);

  $("#btnPrevMonth").addEventListener("click", () => { state.monthOffset -= 1; renderAll(); });
  $("#btnNextMonth").addEventListener("click", () => { state.monthOffset += 1; renderAll(); });

  $("#editForm").addEventListener("submit", handleEditSubmit);
  $("#btnDeleteRecord").addEventListener("click", handleDeleteRecord);
  $("#btnCloseEdit").addEventListener("click", closeEditModal);

  $("#btnCategories").addEventListener("click", () => {
    renderCategoryManageList();
    $("#categoryModal").classList.remove("hidden");
  });
  $("#btnCloseCategories").addEventListener("click", () => $("#categoryModal").classList.add("hidden"));
  $("#addCategoryForm").addEventListener("submit", handleAddCategory);

  $("#btnExport").addEventListener("click", () => {
    $("#exportStatus").textContent = "";
    $("#exportModal").classList.remove("hidden");
  });
  $("#btnCloseExport").addEventListener("click", () => $("#exportModal").classList.add("hidden"));
  $("#btnExportJson").addEventListener("click", handleExportJson);
  $("#btnExportCsv").addEventListener("click", handleExportCsv);
  $("#importFileInput").addEventListener("change", handleImportFile);

  // 點背景關閉 modal
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.add("hidden");
    });
  });
}

// ---------- 初始化 ----------

async function init() {
  bindEvents();
  await reloadFromDB();
  resetQuickAddForm();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // 離線快取非必要功能，註冊失敗不影響記帳功能
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
