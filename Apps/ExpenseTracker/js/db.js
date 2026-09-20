/**
 * db.js — 本機資料層（IndexedDB）
 * 所有記帳資料只存在這台裝置的瀏覽器內，不會主動連網。
 *
 * Schema
 * ------
 * records (keyPath: id, autoIncrement)
 *   - id: number
 *   - amount: number
 *   - categoryId: string
 *   - occurredAt: string  (ISO 8601, 使用者填的日期+時間)
 *   - memo: string
 *   - createdAt: string (ISO 8601, 建立時間，供未來同步比對用)
 *   - updatedAt: string (ISO 8601, 最後修改時間，供未來同步比對用)
 *   index: by_occurredAt (occurredAt)
 *
 * categories (keyPath: id)
 *   - id: string
 *   - name: string
 *   - icon: string (emoji)
 *   - order: number
 *   - isDefault: boolean
 */

const DB_NAME = "expense-tracker";
const DB_VERSION = 1;
const STORE_RECORDS = "records";
const STORE_CATEGORIES = "categories";

const DEFAULT_CATEGORIES = [
  { id: "food", name: "餐飲", icon: "🍚", order: 0, isDefault: true },
  { id: "transport", name: "交通", icon: "🚗", order: 1, isDefault: true },
  { id: "shopping", name: "購物", icon: "🛍️", order: 2, isDefault: true },
  { id: "entertainment", name: "娛樂", icon: "🎬", order: 3, isDefault: true },
  { id: "home", name: "居家", icon: "🏠", order: 4, isDefault: true },
  { id: "medical", name: "醫療", icon: "💊", order: 5, isDefault: true },
  { id: "education", name: "教育", icon: "📚", order: 6, isDefault: true },
  { id: "other", name: "其他", icon: "🏷️", order: 7, isDefault: true },
];

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        const recordsStore = db.createObjectStore(STORE_RECORDS, {
          keyPath: "id",
          autoIncrement: true,
        });
        recordsStore.createIndex("by_occurredAt", "occurredAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        const categoriesStore = db.createObjectStore(STORE_CATEGORIES, { keyPath: "id" });
        categoriesStore.createIndex("by_order", "order", { unique: false });
      }
    };

    req.onsuccess = async (event) => {
      const db = event.target.result;
      await seedDefaultCategoriesIfEmpty(db);
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function seedDefaultCategoriesIfEmpty(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATEGORIES, "readonly");
    const store = tx.objectStore(STORE_CATEGORIES);
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result > 0) {
        resolve();
        return;
      }
      const writeTx = db.transaction(STORE_CATEGORIES, "readwrite");
      const writeStore = writeTx.objectStore(STORE_CATEGORIES);
      DEFAULT_CATEGORIES.forEach((cat) => writeStore.put(cat));
      writeTx.oncomplete = () => resolve();
      writeTx.onerror = () => reject(writeTx.error);
    };
    countReq.onerror = () => reject(countReq.error);
  });
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const DB = {
  // ---------- Records ----------
  async getAllRecords() {
    const db = await openDB();
    const tx = db.transaction(STORE_RECORDS, "readonly");
    const store = tx.objectStore(STORE_RECORDS);
    const result = await promisifyRequest(store.getAll());
    return result.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  },

  async addRecord(record) {
    const db = await openDB();
    const tx = db.transaction(STORE_RECORDS, "readwrite");
    const now = new Date().toISOString();
    const payload = { ...record, createdAt: now, updatedAt: now };
    const id = await promisifyRequest(tx.objectStore(STORE_RECORDS).add(payload));
    return { ...payload, id };
  },

  async updateRecord(record) {
    const db = await openDB();
    const tx = db.transaction(STORE_RECORDS, "readwrite");
    const payload = { ...record, updatedAt: new Date().toISOString() };
    await promisifyRequest(tx.objectStore(STORE_RECORDS).put(payload));
    return payload;
  },

  async deleteRecord(id) {
    const db = await openDB();
    const tx = db.transaction(STORE_RECORDS, "readwrite");
    await promisifyRequest(tx.objectStore(STORE_RECORDS).delete(id));
  },

  async replaceAllRecords(records) {
    const db = await openDB();
    const tx = db.transaction(STORE_RECORDS, "readwrite");
    const store = tx.objectStore(STORE_RECORDS);
    await promisifyRequest(store.clear());
    records.forEach((r) => store.put(r));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async mergeRecords(records) {
    const db = await openDB();
    const tx = db.transaction(STORE_RECORDS, "readwrite");
    const store = tx.objectStore(STORE_RECORDS);
    records.forEach((r) => store.put(r));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // ---------- Categories ----------
  async getAllCategories() {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, "readonly");
    const result = await promisifyRequest(tx.objectStore(STORE_CATEGORIES).getAll());
    return result.sort((a, b) => a.order - b.order);
  },

  async addCategory(category) {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, "readwrite");
    await promisifyRequest(tx.objectStore(STORE_CATEGORIES).put(category));
    return category;
  },

  async deleteCategory(id) {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, "readwrite");
    await promisifyRequest(tx.objectStore(STORE_CATEGORIES).delete(id));
  },

  async replaceAllCategories(categories) {
    const db = await openDB();
    const tx = db.transaction(STORE_CATEGORIES, "readwrite");
    const store = tx.objectStore(STORE_CATEGORIES);
    await promisifyRequest(store.clear());
    categories.forEach((c) => store.put(c));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
