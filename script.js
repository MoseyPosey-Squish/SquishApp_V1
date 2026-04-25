const DATA_URL = "https://opensheet.elk.sh/1YqE_ypdTIHPERz3Fwfi0Bb5ThjQs8DIRDX8KVhxCnA0/Data_Table";
const CACHE_KEY = "squishDexCacheV1";
const FIELDS_KEY = "squishDexVisibleFieldsV1";

const state = {
  rawData: [],
  schema: [],
  fieldTypes: {},
  searchTerm: "",
  activeFilters: {},
  sortField: "",
  sortDirection: "asc",
  visibleFields: new Set(),
};

const els = {
  searchInput: document.getElementById("searchInput"),
  sortField: document.getElementById("sortField"),
  sortDirection: document.getElementById("sortDirection"),
  dynamicFilters: document.getElementById("dynamicFilters"),
  cardGrid: document.getElementById("cardGrid"),
  itemCount: document.getElementById("itemCount"),
  lastUpdated: document.getElementById("lastUpdated"),
  loadingState: document.getElementById("loadingState"),
  errorState: document.getElementById("errorState"),
  emptyState: document.getElementById("emptyState"),
  detailModal: document.getElementById("detailModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  modalBody: document.getElementById("modalBody"),
  modalTitle: document.getElementById("modalTitle"),
  toggleFieldsButton: document.getElementById("toggleFieldsButton"),
  fieldTogglePanel: document.getElementById("fieldTogglePanel"),
};

async function fetchData() {
  try {
    setLoadingState(true);
    setError("");

    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Unexpected dataset format. Expected an array.");
    }

    const timestamp = new Date().toISOString();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp, data }));
    return { data, timestamp, fromCache: false };
  } catch (error) {
    const cached = loadFromCache();
    if (cached) {
      setError(`Live fetch failed. Showing cached data. (${error.message})`);
      return { data: cached.data, timestamp: cached.timestamp, fromCache: true };
    }
    throw error;
  } finally {
    setLoadingState(false);
  }
}

function buildSchema(data) {
  const keySet = new Set();
  for (const row of data) {
    if (row && typeof row === "object") {
      for (const key of Object.keys(row)) {
        keySet.add(key);
      }
    }
  }

  const allKeys = [...keySet];
  const usedNormalized = new Set();
  return allKeys.map((originalKey, index) => {
    let normalizedKey = normalizeKey(originalKey);
    if (!normalizedKey) {
      normalizedKey = `field${index + 1}`;
    }
    let uniqueKey = normalizedKey;
    let counter = 2;
    while (usedNormalized.has(uniqueKey)) {
      uniqueKey = `${normalizedKey}${counter}`;
      counter += 1;
    }
    usedNormalized.add(uniqueKey);
    return {
      originalKey,
      normalizedKey: uniqueKey,
      label: originalKey || `Field ${index + 1}`,
    };
  });
}

function normalizeKey(key) {
  const cleaned = String(key ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (!cleaned) {
    return "";
  }

  const parts = cleaned.split(" ");
  return parts
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

function detectFieldTypes(data, schema) {
  const typeMap = {};
  for (const field of schema) {
    let numberCount = 0;
    let dateCount = 0;
    let stringCount = 0;

    for (const row of data) {
      const value = getValue(row, field.originalKey);
      if (isEmpty(value)) {
        continue;
      }

      if (isNumericValue(value)) {
        numberCount += 1;
      } else if (isDateValue(value)) {
        dateCount += 1;
      } else {
        stringCount += 1;
      }
    }

    if (numberCount > 0 && numberCount >= dateCount && numberCount >= stringCount) {
      typeMap[field.originalKey] = "number";
    } else if (dateCount > 0 && dateCount >= stringCount) {
      typeMap[field.originalKey] = "date";
    } else {
      typeMap[field.originalKey] = "string";
    }
  }
  return typeMap;
}

function renderCards(data) {
  const titleField = getPriorityTitleField(state.schema);
  const displayFields = getDisplayFields(state.schema, titleField);

  els.cardGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  data.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;

    const title = sanitizeDisplay(getValue(item, titleField?.originalKey));
    const cardTitle = title || "Untitled Squish";

    const image = document.createElement("div");
    image.className = "card-image";
    image.textContent = "🧸";

    const body = document.createElement("div");
    body.className = "card-body";

    const titleEl = document.createElement("h3");
    titleEl.className = "card-title";
    titleEl.textContent = cardTitle;
    body.appendChild(titleEl);

    const fieldWrap = document.createElement("div");
    fieldWrap.className = "card-fields";
    for (const field of displayFields) {
      const row = document.createElement("div");
      row.className = "card-field";
      row.innerHTML = `<span class="label">${escapeHtml(field.label)}</span><span>${escapeHtml(
        sanitizeDisplay(getValue(item, field.originalKey))
      )}</span>`;
      fieldWrap.appendChild(row);
    }
    body.appendChild(fieldWrap);

    card.append(image, body);
    card.addEventListener("click", () => renderModal(item));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        renderModal(item);
      }
    });

    fragment.appendChild(card);
  });

  els.cardGrid.appendChild(fragment);
  els.emptyState.hidden = data.length !== 0;
  els.itemCount.textContent = `Items: ${data.length}`;
}

function renderModal(item) {
  els.modalBody.innerHTML = "";

  const titleField = getPriorityTitleField(state.schema);
  els.modalTitle.textContent = sanitizeDisplay(getValue(item, titleField?.originalKey)) || "Details";

  const fragment = document.createDocumentFragment();
  for (const field of state.schema) {
    const row = document.createElement("div");
    row.className = "modal-row";

    const key = document.createElement("div");
    key.className = "modal-key";
    key.textContent = field.label;

    const value = document.createElement("div");
    value.className = "modal-value";
    value.textContent = sanitizeDisplay(getValue(item, field.originalKey));

    row.append(key, value);
    fragment.appendChild(row);
  }

  els.modalBody.appendChild(fragment);
  els.detailModal.hidden = false;
}

function buildFilters(data, schema) {
  els.dynamicFilters.innerHTML = "";
  state.activeFilters = {};

  const fragment = document.createDocumentFragment();
  for (const field of schema) {
    const uniqueValues = getUniqueValues(data, field.originalKey);
    if (uniqueValues.length === 0 || uniqueValues.length >= 20) {
      continue;
    }

    const wrap = document.createElement("div");
    wrap.className = "control-group";

    const label = document.createElement("label");
    label.textContent = field.label;

    const select = document.createElement("select");
    select.dataset.field = field.originalKey;
    select.innerHTML = `<option value="">All</option>`;
    uniqueValues.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      state.activeFilters[field.originalKey] = select.value;
      updateView();
    });

    wrap.append(label, select);
    fragment.appendChild(wrap);
  }

  if (fragment.childNodes.length === 0) {
    const none = document.createElement("p");
    none.className = "status";
    none.textContent = "No low-cardinality fields available for auto-filters.";
    fragment.appendChild(none);
  }

  els.dynamicFilters.appendChild(fragment);
}

function applyFilters(data, filters) {
  return data.filter((item) => {
    for (const [field, value] of Object.entries(filters)) {
      if (!value) {
        continue;
      }
      const itemValue = sanitizeDisplay(getValue(item, field));
      if (itemValue !== value) {
        return false;
      }
    }
    return true;
  });
}

function sortData(data, field, direction) {
  if (!field) {
    return [...data];
  }

  const type = state.fieldTypes[field] || "string";
  const sign = direction === "desc" ? -1 : 1;

  return [...data].sort((a, b) => {
    const aRaw = getValue(a, field);
    const bRaw = getValue(b, field);

    if (isEmpty(aRaw) && isEmpty(bRaw)) {
      return 0;
    }
    if (isEmpty(aRaw)) {
      return 1;
    }
    if (isEmpty(bRaw)) {
      return -1;
    }

    let result = 0;
    if (type === "number") {
      result = Number(aRaw) - Number(bRaw);
    } else if (type === "date") {
      result = new Date(aRaw).getTime() - new Date(bRaw).getTime();
    } else {
      result = String(aRaw).localeCompare(String(bRaw), undefined, { sensitivity: "base" });
    }
    return result * sign;
  });
}

function updateView() {
  let working = [...state.rawData];

  if (state.searchTerm) {
    const needle = state.searchTerm.toLowerCase();
    working = working.filter((row) =>
      state.schema.some((field) =>
        sanitizeDisplay(getValue(row, field.originalKey)).toLowerCase().includes(needle)
      )
    );
  }

  working = applyFilters(working, state.activeFilters);
  working = sortData(working, state.sortField, state.sortDirection);
  renderCards(working);
}

function initSortOptions(schema) {
  els.sortField.innerHTML = `<option value="">None</option>`;
  schema.forEach((field) => {
    const option = document.createElement("option");
    option.value = field.originalKey;
    option.textContent = field.label;
    els.sortField.appendChild(option);
  });
}

function initFieldToggles(schema) {
  const saved = localStorage.getItem(FIELDS_KEY);
  const savedFields = saved ? JSON.parse(saved) : null;

  if (Array.isArray(savedFields) && savedFields.length > 0) {
    state.visibleFields = new Set(savedFields);
  } else {
    const defaultFields = schema.slice(0, 4).map((f) => f.originalKey);
    state.visibleFields = new Set(defaultFields);
  }

  renderFieldToggles(schema);
}

function renderFieldToggles(schema) {
  els.fieldTogglePanel.innerHTML = "";
  const fragment = document.createDocumentFragment();

  schema.forEach((field) => {
    const wrap = document.createElement("label");
    wrap.className = "toggle-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.visibleFields.has(field.originalKey);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.visibleFields.add(field.originalKey);
      } else {
        state.visibleFields.delete(field.originalKey);
      }

      if (state.visibleFields.size === 0) {
        state.visibleFields.add(field.originalKey);
        checkbox.checked = true;
      }

      localStorage.setItem(FIELDS_KEY, JSON.stringify([...state.visibleFields]));
      updateView();
    });

    const text = document.createElement("span");
    text.textContent = field.label;
    wrap.append(checkbox, text);
    fragment.appendChild(wrap);
  });

  els.fieldTogglePanel.appendChild(fragment);
}

function getDisplayFields(schema, titleField) {
  const selected = schema.filter((field) => state.visibleFields.has(field.originalKey));

  const withoutTitle = selected.filter((field) => field.originalKey !== titleField?.originalKey);
  const fallback = schema.filter((field) => field.originalKey !== titleField?.originalKey);
  const source = withoutTitle.length > 0 ? withoutTitle : fallback;

  return source.slice(0, 4);
}

function getPriorityTitleField(schema) {
  const byNormalized = new Map(schema.map((field) => [field.normalizedKey, field]));
  if (byNormalized.has("name")) {
    return byNormalized.get("name");
  }
  if (byNormalized.has("nickname")) {
    return byNormalized.get("nickname");
  }

  const typeLike = schema.find((field) => field.normalizedKey.includes("type"));
  if (typeLike) {
    return typeLike;
  }
  return schema[0] || null;
}

function setLoadingState(isLoading) {
  els.loadingState.hidden = !isLoading;
}

function setError(message) {
  els.errorState.hidden = !message;
  els.errorState.textContent = message;
}

function isNumericValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return false;
  }
  return !Number.isNaN(Number(trimmed));
}

function isDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  const parsed = Date.parse(trimmed);
  return !Number.isNaN(parsed);
}

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function getValue(row, key) {
  if (!row || typeof row !== "object") {
    return "";
  }
  return row[key] ?? "";
}

function sanitizeDisplay(value) {
  if (isEmpty(value)) {
    return "—";
  }
  return String(value).trim();
}

function getUniqueValues(data, key) {
  const set = new Set();
  data.forEach((row) => {
    const value = sanitizeDisplay(getValue(row, key));
    if (value !== "—") {
      set.add(value);
    }
  });
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wireEvents() {
  els.searchInput.addEventListener("input", () => {
    state.searchTerm = els.searchInput.value.trim();
    updateView();
  });

  els.sortField.addEventListener("change", () => {
    state.sortField = els.sortField.value;
    updateView();
  });

  els.sortDirection.addEventListener("change", () => {
    state.sortDirection = els.sortDirection.value;
    updateView();
  });

  els.closeModalBtn.addEventListener("click", closeModal);
  els.detailModal.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeModal === "true") {
      closeModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.detailModal.hidden) {
      closeModal();
    }
  });

  els.toggleFieldsButton.addEventListener("click", () => {
    const isOpen = !els.fieldTogglePanel.hidden;
    els.fieldTogglePanel.hidden = isOpen;
    els.toggleFieldsButton.setAttribute("aria-expanded", String(!isOpen));
  });
}

function closeModal() {
  els.detailModal.hidden = true;
}

function setLastUpdated(timestamp, fromCache) {
  if (!timestamp) {
    els.lastUpdated.textContent = "Last updated: --";
    return;
  }
  const label = new Date(timestamp).toLocaleString();
  els.lastUpdated.textContent = `Last updated: ${label}${fromCache ? " (cached)" : ""}`;
}

async function init() {
  wireEvents();

  try {
    const { data, timestamp, fromCache } = await fetchData();
    state.rawData = Array.isArray(data) ? data : [];
    state.schema = buildSchema(state.rawData);
    state.fieldTypes = detectFieldTypes(state.rawData, state.schema);

    initSortOptions(state.schema);
    initFieldToggles(state.schema);
    buildFilters(state.rawData, state.schema);

    const defaultSort = state.schema[0];
    if (defaultSort) {
      state.sortField = defaultSort.originalKey;
      els.sortField.value = defaultSort.originalKey;
    }

    setLastUpdated(timestamp, fromCache);
    updateView();
  } catch (error) {
    setError(`Could not load data. ${error.message}`);
    renderCards([]);
    setLastUpdated(null, false);
  }
}

init();
