export type LogisticsSettingStatus = "active" | "inactive";

export type LogisticsUom = {
  id: string;
  name: string;
  code: string;
  examples?: string;
  status: LogisticsSettingStatus;
  created_at: string;
};

export type LogisticsAssetCategory = {
  id: string;
  name: string;
  code: string;
  status: LogisticsSettingStatus;
  created_at: string;
};

type LogisticsSettings = {
  uoms: LogisticsUom[];
  asset_categories: LogisticsAssetCategory[];
};

const STORAGE_KEY = "kuskul_logistics_settings";

const defaultUoms: LogisticsUom[] = [
  { id: "uom-pcs", name: "Pieces", code: "pcs", examples: "pens, markers, chairs", status: "active", created_at: "seed" },
  { id: "uom-box", name: "Box", code: "box", examples: "chalk, files, lab items", status: "active", created_at: "seed" },
  { id: "uom-pack", name: "Pack", code: "pack", examples: "notebooks, envelopes", status: "active", created_at: "seed" },
  { id: "uom-ream", name: "Ream", code: "ream", examples: "A4 paper", status: "active", created_at: "seed" },
  { id: "uom-bottle", name: "Bottle", code: "bottle", examples: "sanitizer, cleaner", status: "active", created_at: "seed" },
  { id: "uom-litre", name: "Litre", code: "litre", examples: "liquid supplies", status: "active", created_at: "seed" },
  { id: "uom-kg", name: "Kilogram", code: "kg", examples: "cleaning powder, food items", status: "active", created_at: "seed" },
  { id: "uom-set", name: "Set", code: "set", examples: "uniforms, lab kits", status: "active", created_at: "seed" },
];

const defaultAssetCategories: LogisticsAssetCategory[] = [
  { id: "cat-it", name: "IT Equipment", code: "IT", status: "active", created_at: "seed" },
  { id: "cat-furniture", name: "Furniture", code: "FURNITURE", status: "active", created_at: "seed" },
  { id: "cat-vehicle", name: "Vehicle", code: "VEHICLE", status: "active", created_at: "seed" },
  { id: "cat-lab", name: "Laboratory", code: "LAB", status: "active", created_at: "seed" },
  { id: "cat-sports", name: "Sports", code: "SPORTS", status: "active", created_at: "seed" },
  { id: "cat-library", name: "Library", code: "LIBRARY", status: "active", created_at: "seed" },
];

function nowIso() {
  return new Date().toISOString();
}

function fallbackSettings(): LogisticsSettings {
  return {
    uoms: defaultUoms,
    asset_categories: defaultAssetCategories,
  };
}

export function getLogisticsSettings(): LogisticsSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallbackSettings();

  try {
    const parsed = JSON.parse(raw) as Partial<LogisticsSettings>;
    return {
      uoms: parsed.uoms?.length ? parsed.uoms : defaultUoms,
      asset_categories: parsed.asset_categories?.length
        ? parsed.asset_categories
        : defaultAssetCategories,
    };
  } catch {
    return fallbackSettings();
  }
}

export function saveLogisticsSettings(settings: LogisticsSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function listLogisticsUoms(onlyActive = false) {
  const uoms = getLogisticsSettings().uoms;
  return onlyActive ? uoms.filter((item) => item.status === "active") : uoms;
}

export function saveLogisticsUom(
  payload: Omit<LogisticsUom, "id" | "created_at"> & { id?: string },
) {
  const settings = getLogisticsSettings();
  const next: LogisticsUom = {
    id: payload.id || crypto.randomUUID(),
    name: payload.name,
    code: payload.code,
    examples: payload.examples,
    status: payload.status,
    created_at:
      settings.uoms.find((item) => item.id === payload.id)?.created_at ||
      nowIso(),
  };
  settings.uoms = payload.id
    ? settings.uoms.map((item) => (item.id === payload.id ? next : item))
    : [next, ...settings.uoms];
  saveLogisticsSettings(settings);
  return next;
}

export function deleteLogisticsUom(id: string) {
  const settings = getLogisticsSettings();
  settings.uoms = settings.uoms.filter((item) => item.id !== id);
  saveLogisticsSettings(settings);
}

export function listLogisticsAssetCategories(onlyActive = false) {
  const categories = getLogisticsSettings().asset_categories;
  return onlyActive
    ? categories.filter((item) => item.status === "active")
    : categories;
}

export function saveLogisticsAssetCategory(
  payload: Omit<LogisticsAssetCategory, "id" | "created_at"> & { id?: string },
) {
  const settings = getLogisticsSettings();
  const next: LogisticsAssetCategory = {
    id: payload.id || crypto.randomUUID(),
    name: payload.name,
    code: payload.code,
    status: payload.status,
    created_at:
      settings.asset_categories.find((item) => item.id === payload.id)
        ?.created_at || nowIso(),
  };
  settings.asset_categories = payload.id
    ? settings.asset_categories.map((item) =>
        item.id === payload.id ? next : item,
      )
    : [next, ...settings.asset_categories];
  saveLogisticsSettings(settings);
  return next;
}

export function deleteLogisticsAssetCategory(id: string) {
  const settings = getLogisticsSettings();
  settings.asset_categories = settings.asset_categories.filter(
    (item) => item.id !== id,
  );
  saveLogisticsSettings(settings);
}
