/**
 * Optional local stats for /collection (no CMS). Leave arrays empty to hide blocks.
 * Binder showcases are managed in Admin → Binder showcases (database).
 */

export type CollectionStat = {
  label: string;
  labelJp: string;
  value: string;
};

export type MasterSetProgress = {
  id: string;
  name: string;
  name_jp: string;
  completed: number;
  total: number;
};

export const collectionStats: CollectionStat[] = [];

export const masterSets: MasterSetProgress[] = [];
