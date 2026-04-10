/** Giá trị `data-theme` trên `<html>` — khớp `globals.css`. */
export type AppThemeId = "light" | "dark" | "pink";

export const THEME_STORAGE_KEY = "ue-app-theme";

export const APP_THEME_IDS: AppThemeId[] = ["light", "dark", "pink"];

export function isAppThemeId(value: string): value is AppThemeId {
  return value === "light" || value === "dark" || value === "pink";
}

export type ThemeOptionMeta = {
  id: AppThemeId;
  title: string;
  description: string;
};

export const THEME_OPTIONS: ThemeOptionMeta[] = [
  {
    id: "light",
    title: "Sáng",
    description: "Logo sáng, nền và chữ như mặc định.",
  },
  {
    id: "dark",
    title: "Tối",
    description: "Logo tối, giao diện tối.",
  },
  {
    id: "pink",
    title: "Hoa anh đào",
    description: "Logo Hana, tông hồng / tím nhẹ.",
  },
];
