import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
export const useCategories = () => useLiveQuery(() => db.categories.toArray(), []) ?? [];
export const CATEGORY_COLORS = ["oklch(0.64 0.1 10)", "oklch(0.65 0.1 150)", "oklch(0.62 0.09 250)", "oklch(0.72 0.11 75)", "oklch(0.6 0.09 300)", "oklch(0.62 0.08 200)"];
