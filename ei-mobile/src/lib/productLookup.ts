export type NutritionRow = {
  label: string;
  per100g: string;
  perServing?: string;
};

export type ProductKind =
  | 'food'
  | 'drink'
  | 'beauty'
  | 'pet'
  | 'medicine'
  | 'book'
  | 'manga'
  | 'toy'
  | 'tcg'
  | 'general'
  | 'unknown';

export type ProductLookup = {
  barcode: string;
  found: boolean;
  name: string;
  brand: string;
  /** Authors / creators (books, manga). */
  authors: string;
  quantity: string;
  categories: string;
  kind: ProductKind;
  /** @deprecated use kind */
  isFoodOrDrink: boolean;
  description: string;
  ingredients: string;
  allergens: string;
  activeIngredients: string;
  dosageForm: string;
  route: string;
  warnings: string;
  nutriscore: string | null;
  nova: number | null;
  imageUrl: string | null;
  nutrition: NutritionRow[];
  source:
    | 'openfoodfacts'
    | 'openproductsfacts'
    | 'openbeautyfacts'
    | 'openpetfoodfacts'
    | 'upcitemdb'
    | 'openfda'
    | 'openlibrary'
    | 'googlebooks'
    | 'gs1-prefix'
    | 'none';
  summary: string;
};

const UA = 'EiMobile/1.0 (https://sogki.dev; personal companion app)';

type OffSource = Extract<
  ProductLookup['source'],
  'openfoodfacts' | 'openproductsfacts' | 'openbeautyfacts' | 'openpetfoodfacts'
>;

const OFF_ENDPOINTS: Array<{ source: OffSource; host: string; kindHint: ProductKind }> = [
  {
    source: 'openproductsfacts',
    host: 'world.openproductsfacts.org',
    kindHint: 'general',
  },
  {
    source: 'openbeautyfacts',
    host: 'world.openbeautyfacts.org',
    kindHint: 'beauty',
  },
  {
    source: 'openpetfoodfacts',
    host: 'world.openpetfoodfacts.org',
    kindHint: 'pet',
  },
  {
    source: 'openfoodfacts',
    host: 'world.openfoodfacts.org',
    kindHint: 'food',
  },
];

const NUTRI_FIELDS: Array<{ key: string; label: string; unit: string }> = [
  { key: 'energy-kcal', label: 'Energy', unit: 'kcal' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'saturated-fat', label: 'Saturated fat', unit: 'g' },
  { key: 'carbohydrates', label: 'Carbohydrates', unit: 'g' },
  { key: 'sugars', label: 'Sugars', unit: 'g' },
  { key: 'fiber', label: 'Fibre', unit: 'g' },
  { key: 'proteins', label: 'Protein', unit: 'g' },
  { key: 'salt', label: 'Salt', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'g' },
];

function emptyResult(barcode: string, raw?: string): ProductLookup {
  return {
    barcode,
    found: false,
    name: 'Product not found',
    brand: '',
    authors: '',
    quantity: '',
    categories: '',
    kind: 'unknown',
    isFoodOrDrink: false,
    description: '',
    ingredients: '',
    allergens: '',
    activeIngredients: '',
    dosageForm: '',
    route: '',
    warnings: '',
    nutriscore: null,
    nova: null,
    imageUrl: null,
    nutrition: [],
    source: 'none',
    summary: `No product match for barcode ${barcode || raw || ''}`,
  };
}

function fmt(n: unknown, unit: string): string | null {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  const rounded = Math.abs(n) >= 10 ? n.toFixed(0) : n.toFixed(1);
  return `${rounded} ${unit}`;
}

function pickNutrition(nutriments: Record<string, unknown> | undefined): NutritionRow[] {
  if (!nutriments || typeof nutriments !== 'object') return [];
  const rows: NutritionRow[] = [];
  for (const field of NUTRI_FIELDS) {
    const per100 = fmt(nutriments[`${field.key}_100g`], field.unit);
    if (!per100) continue;
    const serving = fmt(nutriments[`${field.key}_serving`], field.unit) ?? undefined;
    rows.push({ label: field.label, per100g: per100, perServing: serving });
  }
  return rows;
}

/** Barcode length variants Open Facts / retailers commonly store. */
export function barcodeVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return [];
  const set = new Set<string>([digits]);
  // UPC-A (12) ↔ EAN-13 (leading 0)
  if (digits.length === 12) set.add(`0${digits}`);
  if (digits.length === 13 && digits.startsWith('0')) set.add(digits.slice(1));
  // Pad shorter codes to 13
  if (digits.length >= 8 && digits.length < 13) {
    set.add(digits.padStart(13, '0'));
  }
  // Strip leading zeros to 8+ digits
  const stripped = digits.replace(/^0+/, '');
  if (stripped.length >= 8) set.add(stripped);
  return [...set];
}

function upcACheckDigit(d11: string): string {
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += Number(d11[i]) * (i % 2 === 0 ? 3 : 1);
  return String((10 - (sum % 10)) % 10);
}

function ean13CheckDigit(d12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

function isValidGtin(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  if (digits.length === 12) return digits[11] === upcACheckDigit(digits.slice(0, 11));
  if (digits.length === 13) return digits[12] === ean13CheckDigit(digits.slice(0, 12));
  if (digits.length === 8) {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += Number(digits[i]) * (i % 2 === 0 ? 3 : 1);
    return digits[7] === String((10 - (sum % 10)) % 10);
  }
  return false;
}

/**
 * Prefer 1–2 canonical retail codes. Hammering every variant against UPCitemdb
 * burns the free rate limit and is why booster packs often come back empty.
 */
export function primaryLookupCodes(raw: string): string[] {
  const d = raw.replace(/\D/g, '');
  if (!d) return [];
  const out: string[] = [];
  const add = (code: string) => {
    if (code && !out.includes(code)) out.push(code);
  };

  if (d.length === 12 || d.length === 13 || d.length === 8) add(d);
  if (d.length === 12) add(`0${d}`);
  if (d.length === 13 && d.startsWith('0')) add(d.slice(1));
  if (d.length === 14 && d.startsWith('0')) add(d.slice(1));

  // Prefer valid check-digit forms first.
  const ranked = [
    ...out.filter((c) => isValidGtin(c)),
    ...out.filter((c) => !isValidGtin(c)),
  ];
  if (!ranked.length && d.length >= 8) ranked.push(d);
  return ranked.slice(0, 2);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type FetchResult = { ok: boolean; status: number; data: Record<string, unknown> | null };

async function fetchJsonResult(url: string): Promise<FetchResult> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': UA,
      },
    });
    if (!res.ok) {
      return { ok: false, status: res.status, data: null };
    }
    const data = (await res.json()) as Record<string, unknown>;
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  const r = await fetchJsonResult(url);
  return r.ok ? r.data : null;
}

/** GS1 company-prefix hints when public catalogs miss hobby SKUs. */
function guessFromCompanyPrefix(barcode: string): ProductLookup | null {
  const d = barcode.replace(/\D/g, '');
  const hints: Array<{
    re: RegExp;
    brand: string;
    kind: ProductKind;
    title: string;
    categories: string;
  }> = [
    {
      re: /^(0?820650)/,
      brand: 'The Pokémon Company International',
      kind: 'tcg',
      title: 'Pokémon TCG sealed product',
      categories: 'Pokémon TCG · Sealed product',
    },
    {
      re: /^(0?45496)/,
      brand: 'Nintendo',
      kind: 'toy',
      title: 'Nintendo / Pokémon retail product',
      categories: 'Nintendo · Retail product',
    },
    {
      re: /^(0?63050)/,
      brand: 'Wizards of the Coast / Konami',
      kind: 'tcg',
      title: 'Trading card game sealed product',
      categories: 'Trading card game · Sealed product',
    },
    {
      re: /^(0?653569)/,
      brand: 'Hasbro',
      kind: 'toy',
      title: 'Hasbro toy / game product',
      categories: 'Hasbro · Toy',
    },
    {
      re: /^(0?27084)/,
      brand: 'Mattel',
      kind: 'toy',
      title: 'Mattel toy product',
      categories: 'Mattel · Toy',
    },
    {
      re: /^(0?673419)/,
      brand: 'The Pokémon Company International',
      kind: 'tcg',
      title: 'Pokémon TCG sealed product',
      categories: 'Pokémon TCG · Sealed product',
    },
  ];

  for (const h of hints) {
    if (!h.re.test(d)) continue;
    return {
      barcode: d,
      found: true,
      name: h.title,
      brand: h.brand,
      authors: '',
      quantity: '',
      categories: h.categories,
      kind: h.kind,
      isFoodOrDrink: false,
      description:
        'Matched manufacturer barcode prefix. Public catalogs didn’t return the exact SKU title — your scan photo is the best reference.',
      ingredients: '',
      allergens: '',
      activeIngredients: '',
      dosageForm: '',
      route: '',
      warnings: '',
      nutriscore: null,
      nova: null,
      imageUrl: null,
      nutrition: [],
      source: 'gs1-prefix',
      summary: `${h.title} · ${h.brand}`,
    };
  }
  return null;
}

function inferKind(
  hint: ProductKind,
  categories: string,
  name: string,
  nutritionCount: number
): ProductKind {
  const blob = `${categories} ${name}`.toLowerCase();
  if (
    /medicin|pharma|drug|tablet|capsule|ibuprofen|paracetamol|aspirin|antibiotic|prescription|otc|pharmacy|ndc\b/i.test(
      blob
    )
  ) {
    return 'medicine';
  }
  if (/pet food|dog |cat |kitten|puppy|aquarium|veterinary/i.test(blob)) return 'pet';

  // Trading card games (sealed product, decks, ETBs, boosters) — before manga/toys.
  if (
    /pok[eé]mon(\s|-)?(tcg|card|trading)|pokemon company|yu-?gi-?oh|magic:?\s*the gathering|\bmtg\b|disney lorcana|lorcana|one piece (card|tcg)|digimon (card|tcg)|flesh and blood|cardfight!? ?vanguard|weiss schwarz|dragon ball (super )?(card|tcg)|final fantasy tcg|star wars.?unlimited|trading cards?|collectible card|\btcgs?\b|\bccgs?\b|booster (box|pack|bundle)|elite trainer box|\betb\b|collection box|tin\b.*card|card game/i.test(
      blob
    )
  ) {
    return 'tcg';
  }

  if (
    /\btoys?\b|action figure|figurine|lego\b|playmobil|hot wheels|matchbox|barbie|nerf\b|funko|plush|soft toy|doll\b|board game|jigsaw|puzzle\b|hasbro|mattel|bandai|takara|tomy\b|tomica|sylvanian|squishmallow|pop mart|labubu|building (block|set|brick)|model kit|gunpla|nendoroid|playset|die-?cast|remote control|rc car|stuffed animal|teddy|crayon|lego set/i.test(
      blob
    )
  ) {
    return 'toy';
  }

  if (
    /manga|light novel|manhwa|manhua|graphic novel|comics?\b|shonen|shoujo|seinen|josei|viz media|kodansha|shueisha|yen press|dark horse manga/i.test(
      blob
    )
  ) {
    return 'manga';
  }
  if (
    /book|fiction|novel|isbn|literature|paperback|hardcover|publisher|audiobook|textbook/i.test(
      blob
    )
  ) {
    return 'book';
  }
  if (
    /beauty|cosmetic|shampoo|skincare|lipstick|makeup|lotion|sunscreen|deodorant|antiperspirant|déodorant|anti-transpirant/i.test(
      blob
    )
  ) {
    return 'beauty';
  }
  if (/drink|beverage|soda|juice|water|beer|wine|coffee|tea/i.test(blob)) return 'drink';
  if (
    hint === 'food' ||
    nutritionCount > 0 ||
    /food|snack|dairy|grocery|chocolate|candy|cereal/i.test(blob)
  ) {
    return hint === 'beauty' || hint === 'pet' || hint === 'general' || hint === 'toy' || hint === 'tcg'
      ? hint
      : 'food';
  }
  if (hint !== 'food') return hint;
  return 'general';
}

/** Extra labels for TCG / toy hits so the UI isn’t just a bare retail title. */
function enrichHobbyCategories(kind: ProductKind, name: string, categories: string): string {
  const blob = `${name} ${categories}`.toLowerCase();
  const tags: string[] = [];
  if (kind === 'tcg') {
    if (/pok[eé]mon/.test(blob)) tags.push('Pokémon TCG');
    else if (/yu-?gi-?oh/.test(blob)) tags.push('Yu-Gi-Oh!');
    else if (/magic|mtg/.test(blob)) tags.push('Magic: The Gathering');
    else if (/lorcana/.test(blob)) tags.push('Disney Lorcana');
    else if (/one piece/.test(blob)) tags.push('One Piece Card Game');
    else if (/digimon/.test(blob)) tags.push('Digimon TCG');
    else if (/dragon ball/.test(blob)) tags.push('Dragon Ball Card Game');
    else if (/flesh and blood/.test(blob)) tags.push('Flesh and Blood');
    else if (/vanguard/.test(blob)) tags.push('Cardfight!! Vanguard');
    else tags.push('Trading card game');

    if (/elite trainer|etb/.test(blob)) tags.push('Elite Trainer Box');
    else if (/booster box/.test(blob)) tags.push('Booster box');
    else if (/booster/.test(blob)) tags.push('Booster pack');
    else if (/\btin\b/.test(blob)) tags.push('Collector tin');
    else if (/collection|bundle|blister/.test(blob)) tags.push('Collection');
  }
  if (kind === 'toy') {
    if (/\blego\b/.test(blob)) tags.push('LEGO');
    else if (/funko/.test(blob)) tags.push('Funko');
    else if (/hot wheels/.test(blob)) tags.push('Hot Wheels');
    else if (/barbie/.test(blob)) tags.push('Barbie');
    else if (/nerf/.test(blob)) tags.push('Nerf');
    else if (/hasbro/.test(blob)) tags.push('Hasbro');
    else if (/mattel/.test(blob)) tags.push('Mattel');
    else if (/bandai|gunpla/.test(blob)) tags.push('Bandai');
    tags.push('Toy');
  }
  const merged = [...tags, categories].filter(Boolean);
  // de-dupe case-insensitively while keeping order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of merged.join(' · ').split(/\s*·\s*/)) {
    const key = part.toLowerCase();
    if (!part || seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out.slice(0, 8).join(' · ');
}

function cleanCategoryLabel(raw: string): string {
  return raw
    .split(',')
    .map((s) =>
      s
        .trim()
        .replace(/^[a-z]{2}:/i, '')
        .replace(/-/g, ' ')
    )
    .filter((s) => s && !/^open[- ]?(food|beauty|pet|products)[- ]?facts$/i.test(s))
    .slice(0, 3)
    .join(' · ');
}

function isBlankName(name: string): boolean {
  const n = name.trim();
  return !n || /^unknown product$/i.test(n) || /^product not found$/i.test(n);
}

/**
 * Open * Facts often stores the title only in product_name_fr / _es / etc.
 * Prefer English, then any non-empty localized product_name / generic_name.
 */
function pickLocalizedField(
  product: Record<string, unknown>,
  bases: string[],
  preferLangs: string[] = ['en', 'en_gb', 'en_us', 'fr', 'de', 'es', 'it', 'nl', 'pt', 'pl', 'sv', 'da']
): string {
  for (const base of bases) {
    const direct = product[base];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
  }

  for (const base of bases) {
    for (const lang of preferLangs) {
      const v = product[`${base}_${lang}`];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }

  // Last resort: any string field matching base_*
  let fallback = '';
  for (const base of bases) {
    for (const [key, value] of Object.entries(product)) {
      if (typeof value !== 'string' || !value.trim()) continue;
      if (key.includes('debug') || key.includes('imported') || key.includes('tags')) continue;
      if (key === base || key.startsWith(`${base}_`)) {
        if (!fallback) fallback = value.trim();
      }
    }
  }
  return fallback;
}

function pickProductName(product: Record<string, unknown>, brand: string, categories: string): string {
  const fromFields = pickLocalizedField(product, [
    'product_name',
    'abbreviated_product_name',
    'generic_name',
  ]);
  if (fromFields) return fromFields;

  const cat = cleanCategoryLabel(String(product.categories || categories || ''));
  if (brand && cat) return `${brand} ${cat.split(' · ')[0]}`;
  if (brand) return brand;
  if (cat) return cat.split(' · ')[0] || cat;
  return 'Unknown product';
}

function scoreLookup(p: ProductLookup): number {
  let s = 0;
  if (!isBlankName(p.name)) s += 8;
  if (p.brand) s += 2;
  if (p.imageUrl) s += 2;
  if (p.description) s += 1;
  if (p.ingredients) s += 1;
  if (p.nutrition.length) s += 1;
  if (p.activeIngredients) s += 2;
  if (p.authors) s += 2;
  if (p.kind === 'medicine') s += 1;
  if (p.kind === 'book' || p.kind === 'manga') s += 3;
  if (p.kind === 'tcg' || p.kind === 'toy') s += 3;
  if (p.kind === 'beauty' || p.kind === 'general') s += 1;
  // Prefer catalogs that usually have titles for non-food.
  if (p.source === 'upcitemdb' && !isBlankName(p.name)) s += 3;
  if (p.source === 'openlibrary' || p.source === 'googlebooks') s += 4;
  if (p.source === 'openbeautyfacts') s += 1;
  if (p.source === 'openproductsfacts') s += 1;
  if (isBlankName(p.name)) s -= 10;
  return s;
}

function mergeLookups(primary: ProductLookup, secondary: ProductLookup): ProductLookup {
  const name =
    !isBlankName(primary.name) ? primary.name : !isBlankName(secondary.name) ? secondary.name : primary.name;
  const kind = primary.kind !== 'unknown' ? primary.kind : secondary.kind;
  return {
    ...primary,
    name,
    brand: primary.brand || secondary.brand,
    authors: primary.authors || secondary.authors,
    quantity: primary.quantity || secondary.quantity,
    categories: primary.categories || secondary.categories,
    description: primary.description || secondary.description,
    ingredients: primary.ingredients || secondary.ingredients,
    allergens: primary.allergens || secondary.allergens,
    imageUrl: primary.imageUrl || secondary.imageUrl,
    nutrition: primary.nutrition.length ? primary.nutrition : secondary.nutrition,
    kind,
    isFoodOrDrink: kind === 'food' || kind === 'drink',
    summary:
      !isBlankName(name)
        ? `${name}${primary.authors || secondary.authors ? ` · ${primary.authors || secondary.authors}` : primary.brand || secondary.brand ? ` by ${primary.brand || secondary.brand}` : ''}`
        : primary.summary || secondary.summary,
  };
}

function mapOffProduct(
  barcode: string,
  product: Record<string, unknown>,
  source: OffSource,
  kindHint: ProductKind
): ProductLookup {
  const brand = String(product.brands || product.brand || '').trim();
  const quantity = String(product.quantity || product.product_quantity || '').trim();
  const categories = cleanCategoryLabel(String(product.categories || ''));
  const name = pickProductName(product, brand, categories);
  const description = (
    pickLocalizedField(product, ['generic_name', 'product_name']) ||
    String(product.packaging_text || '')
  ).trim();
  // Avoid duplicating the title in About when it's the same string.
  const descriptionClean =
    description && description.toLowerCase() !== name.toLowerCase() ? description : '';
  const ingredients = pickLocalizedField(product, ['ingredients_text']) ||
    String(product.ingredients_text || '').trim();
  const allergens = String(product.allergens_from_ingredients || product.allergens || '')
    .replace(/en:/gi, '')
    .replace(/,/g, ', ')
    .trim();
  const nutriscore = product.nutriscore_grade
    ? String(product.nutriscore_grade).toUpperCase()
    : null;
  const nova =
    typeof product.nova_group === 'number'
      ? product.nova_group
      : typeof product.nova_group === 'string'
        ? Number(product.nova_group) || null
        : null;
  const imageUrl =
    (typeof product.image_front_small_url === 'string' && product.image_front_small_url) ||
    (typeof product.image_small_url === 'string' && product.image_small_url) ||
    (typeof product.image_front_url === 'string' && product.image_front_url) ||
    (typeof product.image_url === 'string' && product.image_url) ||
    null;
  const nutrition = pickNutrition(product.nutriments as Record<string, unknown> | undefined);
  const kind = inferKind(kindHint, categories, `${name} ${brand}`, nutrition.length);
  const categoriesEnriched = enrichHobbyCategories(kind, `${name} ${brand}`, categories);
  const bits = [name];
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) bits.push(`by ${brand}`);
  if (quantity) bits.push(`(${quantity})`);

  return {
    barcode,
    found: true,
    name,
    brand,
    authors: '',
    quantity,
    categories: categoriesEnriched,
    kind,
    isFoodOrDrink: kind === 'food' || kind === 'drink',
    description: descriptionClean,
    ingredients,
    allergens,
    activeIngredients: '',
    dosageForm: '',
    route: '',
    warnings: '',
    nutriscore,
    nova,
    imageUrl,
    nutrition,
    source,
    summary: bits.join(' '),
  };
}

async function lookupOpenFacts(barcode: string): Promise<ProductLookup | null> {
  const codes = primaryLookupCodes(barcode);
  // Hobby/TCGs almost never live in food/beauty/pet DBs — try products first only.
  const endpoints = OFF_ENDPOINTS.filter((ep) => ep.source === 'openproductsfacts');
  const jobs = endpoints.flatMap((ep) =>
    codes.map(async (code) => {
      try {
        const data = await fetchJson(`https://${ep.host}/api/v2/product/${code}.json`);
        if (!data || data.status !== 1 || !data.product || typeof data.product !== 'object') {
          return null;
        }
        return mapOffProduct(
          code,
          data.product as Record<string, unknown>,
          ep.source,
          ep.kindHint
        );
      } catch {
        return null;
      }
    })
  );

  let results = (await Promise.all(jobs)).filter(Boolean) as ProductLookup[];
  if (!results.length) {
    // Fall back to the other Open * Facts DBs with the same tight code list.
    const extra = OFF_ENDPOINTS.filter((ep) => ep.source !== 'openproductsfacts');
    const extraJobs = extra.flatMap((ep) =>
      codes.map(async (code) => {
        try {
          const data = await fetchJson(`https://${ep.host}/api/v2/product/${code}.json`);
          if (!data || data.status !== 1 || !data.product || typeof data.product !== 'object') {
            return null;
          }
          return mapOffProduct(
            code,
            data.product as Record<string, unknown>,
            ep.source,
            ep.kindHint
          );
        } catch {
          return null;
        }
      })
    );
    results = (await Promise.all(extraJobs)).filter(Boolean) as ProductLookup[];
  }

  if (!results.length) return null;
  results.sort((a, b) => scoreLookup(b) - scoreLookup(a));
  return results[0] ?? null;
}

function mapUpcItem(code: string, item: Record<string, unknown>): ProductLookup {
  const name = String(item.title || '').trim() || 'Unknown product';
  const brand = String(item.brand || '').trim();
  const quantity = String(item.size || item.dimension || '').trim();
  const categories = String(item.category || '')
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' · ');
  const description = String(item.description || '').trim();
  const images = Array.isArray(item.images) ? item.images : [];
  const imageUrl =
    typeof images[0] === 'string' ? images[0].replace(/^http:/, 'https:') : null;
  const kind = inferKind('general', categories, `${name} ${description} ${brand}`, 0);
  const categoriesEnriched = enrichHobbyCategories(
    kind,
    `${name} ${description} ${brand}`,
    categories
  );

  return {
    barcode: code,
    found: true,
    name,
    brand,
    authors: '',
    quantity,
    categories: categoriesEnriched,
    kind,
    isFoodOrDrink: kind === 'food' || kind === 'drink',
    description,
    ingredients: '',
    allergens: '',
    activeIngredients: '',
    dosageForm: '',
    route: '',
    warnings: '',
    nutriscore: null,
    nova: null,
    imageUrl,
    nutrition: [],
    source: 'upcitemdb',
    summary: brand ? `${name} by ${brand}` : name,
  };
}

async function lookupUpcItemDb(barcode: string): Promise<ProductLookup | null> {
  const codes = primaryLookupCodes(barcode);
  for (const code of codes) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetchJsonResult(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`
      );
      if (res.status === 429) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      if (!res.data) break;
      // INVALID_UPC on one form — try the alternate code.
      if (res.data.code === 'INVALID_UPC' || res.data.code === 'INVALID_QUERY') break;
      if (res.data.code !== 'OK') break;
      const items = Array.isArray(res.data.items) ? res.data.items : [];
      const item = items[0] as Record<string, unknown> | undefined;
      if (!item) break;
      return mapUpcItem(code, item);
    }
    // Small gap between UPC-A / EAN-13 attempts.
    await sleep(200);
  }
  return null;
}

/** Derive plausible US NDC hyphenations from a retail barcode. */
function ndcQueryCandidates(barcode: string): string[] {
  const digits = barcode.replace(/\D/g, '');
  const cores = new Set<string>();
  // Common: drop GTIN indicator / check digit approximations
  if (digits.length >= 10) cores.add(digits.slice(-10));
  if (digits.length >= 11) cores.add(digits.slice(0, 10));
  if (digits.length === 12) cores.add(digits.slice(1, 11));
  if (digits.length === 13 && digits.startsWith('0')) cores.add(digits.slice(1, 11));

  const out = new Set<string>();
  for (const core of cores) {
    if (core.length !== 10) continue;
    // 4-4-2, 5-3-2, 5-4-1
    out.add(`${core.slice(0, 4)}-${core.slice(4, 8)}-${core.slice(8)}`);
    out.add(`${core.slice(0, 5)}-${core.slice(5, 8)}-${core.slice(8)}`);
    out.add(`${core.slice(0, 5)}-${core.slice(5, 9)}-${core.slice(9)}`);
    out.add(core);
  }
  return [...out];
}

async function lookupOpenFda(barcode: string): Promise<ProductLookup | null> {
  const candidates = ndcQueryCandidates(barcode);
  for (const ndc of candidates) {
    const queries = [
      `packaging.package_ndc:"${ndc}"`,
      `product_ndc:"${ndc}"`,
      // unquoted fallback for hyphenated forms
      `packaging.package_ndc:${ndc}`,
      `product_ndc:${ndc}`,
    ];
    for (const q of queries) {
      try {
        const data = await fetchJson(
          `https://api.fda.gov/drug/ndc.json?search=${encodeURIComponent(q)}&limit=1`
        );
        const results = Array.isArray(data?.results) ? data!.results : [];
        const drug = results[0] as Record<string, unknown> | undefined;
        if (!drug) continue;

        const brand = String(drug.brand_name || '').trim();
        const generic = String(drug.generic_name || '').trim();
        const name = brand || generic || 'Medication';
        const labeler = String(drug.labeler_name || '').trim();
        const dosageForm = String(drug.dosage_form || '').trim();
        const route = Array.isArray(drug.route)
          ? drug.route.map(String).join(', ')
          : String(drug.route || '').trim();
        const actives = Array.isArray(drug.active_ingredients)
          ? (drug.active_ingredients as Array<Record<string, unknown>>)
              .map((a) => {
                const n = String(a.name || '').trim();
                const s = String(a.strength || '').trim();
                return s ? `${n} (${s})` : n;
              })
              .filter(Boolean)
              .join(', ')
          : '';
        const packaging = Array.isArray(drug.packaging)
          ? (drug.packaging as Array<Record<string, unknown>>)
          : [];
        const packDesc = packaging
          .map((p) => String(p.description || '').trim())
          .filter(Boolean)
          .slice(0, 2)
          .join(' · ');
        const productType = String(drug.product_type || '').trim();
        const pharmClass = Array.isArray(drug.pharm_class)
          ? drug.pharm_class.map(String).slice(0, 4).join(' · ')
          : '';

        return {
          barcode,
          found: true,
          name,
          brand: labeler || brand,
          authors: '',
          quantity: packDesc,
          categories: [productType, pharmClass].filter(Boolean).join(' · '),
          kind: 'medicine',
          isFoodOrDrink: false,
          description: generic && brand && generic !== brand ? `Generic: ${generic}` : generic,
          ingredients: '',
          allergens: '',
          activeIngredients: actives,
          dosageForm,
          route,
          warnings:
            'Medication info from openFDA/NDC — not medical advice. Confirm with packaging and a pharmacist.',
          nutriscore: null,
          nova: null,
          imageUrl: null,
          nutrition: [],
          source: 'openfda',
          summary: labeler ? `${name} · ${labeler}` : name,
        };
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

/** ISBN-13 bookland prefixes (978/979), including ISBN-10 converted forms. */
export function isIsbnBarcode(barcodeRaw: string): boolean {
  const d = barcodeRaw.replace(/\D/g, '');
  if (d.length === 13 && (d.startsWith('978') || d.startsWith('979'))) return true;
  if (d.length === 12 && (d.startsWith('978') || d.startsWith('979'))) return true;
  if (d.length === 10) return true;
  return false;
}

function isbn10To13(isbn10: string): string | null {
  if (!/^\d{9}[\dXx]$/.test(isbn10)) return null;
  const core = `978${isbn10.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${core}${check}`;
}

function isbnCandidates(barcodeRaw: string): string[] {
  const d = barcodeRaw.replace(/\D/g, '');
  const set = new Set<string>();
  for (const v of barcodeVariants(d)) {
    if (v.length === 13 && (v.startsWith('978') || v.startsWith('979'))) set.add(v);
  }
  if (d.length === 10) {
    set.add(d);
    const as13 = isbn10To13(d);
    if (as13) set.add(as13);
  }
  if (d.length === 13 && (d.startsWith('978') || d.startsWith('979'))) set.add(d);
  return [...set];
}

function classifyBookKind(title: string, categories: string, subjects: string): ProductKind {
  const blob = `${title} ${categories} ${subjects}`;
  return inferKind('book', blob, blob, 0) === 'manga' ? 'manga' : 'book';
}

async function lookupOpenLibrary(barcode: string): Promise<ProductLookup | null> {
  for (const isbn of isbnCandidates(barcode)) {
    try {
      const data = await fetchJson(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`
      );
      if (!data) continue;
      const entry = data[`ISBN:${isbn}`] as Record<string, unknown> | undefined;
      if (!entry || typeof entry !== 'object') continue;

      const name = String(entry.title || '').trim();
      if (!name) continue;
      const authors = Array.isArray(entry.authors)
        ? (entry.authors as Array<Record<string, unknown>>)
            .map((a) => String(a.name || '').trim())
            .filter(Boolean)
            .join(', ')
        : '';
      const publishers = Array.isArray(entry.publishers)
        ? (entry.publishers as Array<Record<string, unknown>>)
            .map((p) => String(p.name || '').trim())
            .filter(Boolean)
            .join(', ')
        : '';
      const subjects = Array.isArray(entry.subjects)
        ? (entry.subjects as Array<Record<string, unknown>>)
            .map((s) => String(s.name || s).trim())
            .filter(Boolean)
            .slice(0, 8)
            .join(' · ')
        : '';
      const pages =
        typeof entry.number_of_pages === 'number'
          ? `${entry.number_of_pages} pages`
          : String(entry.number_of_pages || '').trim();
      const published = String(entry.publish_date || '').trim();
      const cover = entry.cover as Record<string, unknown> | undefined;
      const imageUrl =
        (typeof cover?.large === 'string' && cover.large) ||
        (typeof cover?.medium === 'string' && cover.medium) ||
        (typeof cover?.small === 'string' && cover.small) ||
        null;
      const kind = classifyBookKind(name, subjects, subjects);
      const quantity = [pages, published].filter(Boolean).join(' · ');

      return {
        barcode: isbn,
        found: true,
        name,
        brand: publishers,
        authors,
        quantity,
        categories: subjects || (kind === 'manga' ? 'Manga' : 'Book'),
        kind,
        isFoodOrDrink: false,
        description: subjects,
        ingredients: '',
        allergens: '',
        activeIngredients: '',
        dosageForm: '',
        route: '',
        warnings: '',
        nutriscore: null,
        nova: null,
        imageUrl: imageUrl ? String(imageUrl).replace(/^http:/, 'https:') : null,
        nutrition: [],
        source: 'openlibrary',
        summary: authors ? `${name} · ${authors}` : name,
      };
    } catch {
      /* try next isbn */
    }
  }
  return null;
}

async function lookupGoogleBooks(barcode: string): Promise<ProductLookup | null> {
  for (const isbn of isbnCandidates(barcode)) {
    try {
      const data = await fetchJson(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`
      );
      const items = Array.isArray(data?.items) ? data!.items : [];
      const volume = items[0] as Record<string, unknown> | undefined;
      if (!volume) continue;
      const info = (volume.volumeInfo || {}) as Record<string, unknown>;
      const name = String(info.title || '').trim();
      if (!name) continue;
      const subtitle = String(info.subtitle || '').trim();
      const authors = Array.isArray(info.authors)
        ? info.authors.map(String).filter(Boolean).join(', ')
        : '';
      const publisher = String(info.publisher || '').trim();
      const categories = Array.isArray(info.categories)
        ? info.categories.map(String).slice(0, 6).join(' · ')
        : '';
      const description = String(info.description || '').trim();
      const pages =
        typeof info.pageCount === 'number' && info.pageCount > 0
          ? `${info.pageCount} pages`
          : '';
      const published = String(info.publishedDate || '').trim();
      const images = (info.imageLinks || {}) as Record<string, unknown>;
      const imageUrl =
        (typeof images.thumbnail === 'string' && images.thumbnail) ||
        (typeof images.smallThumbnail === 'string' && images.smallThumbnail) ||
        null;
      const fullTitle = subtitle ? `${name}: ${subtitle}` : name;
      const kind = classifyBookKind(fullTitle, categories, description);

      return {
        barcode: isbn,
        found: true,
        name: fullTitle,
        brand: publisher,
        authors,
        quantity: [pages, published].filter(Boolean).join(' · '),
        categories: categories || (kind === 'manga' ? 'Manga' : 'Book'),
        kind,
        isFoodOrDrink: false,
        description: description.slice(0, 600),
        ingredients: '',
        allergens: '',
        activeIngredients: '',
        dosageForm: '',
        route: '',
        warnings: '',
        nutriscore: null,
        nova: null,
        imageUrl: imageUrl
          ? String(imageUrl).replace(/^http:/, 'https:').replace(/&edge=curl/, '')
          : null,
        nutrition: [],
        source: 'googlebooks',
        summary: authors ? `${fullTitle} · ${authors}` : fullTitle,
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function lookupBook(barcode: string): Promise<ProductLookup | null> {
  const [ol, gb] = await Promise.all([
    lookupOpenLibrary(barcode),
    lookupGoogleBooks(barcode),
  ]);
  const hits = [ol, gb].filter(Boolean) as ProductLookup[];
  if (!hits.length) return null;
  hits.sort((a, b) => scoreLookup(b) - scoreLookup(a));
  if (hits.length === 1) return hits[0]!;
  return mergeLookups(hits[0]!, hits[1]!);
}

/**
 * Look up a retail barcode across books/manga (ISBN), Open * Facts, UPCItemDB,
 * and openFDA (medications). Hobby/TCG barcodes are rate-limit sensitive — keep
 * requests sequential and tight.
 */
export async function lookupProductBarcode(barcodeRaw: string): Promise<ProductLookup> {
  const barcode = barcodeRaw.replace(/\D/g, '');
  if (!barcode || barcode.length < 8) return emptyResult(barcode, barcodeRaw);

  const isbn = isIsbnBarcode(barcode);

  // ISBN bookland codes → prefer library catalogs first.
  if (isbn) {
    const book = await lookupBook(barcode);
    if (book) return book;
  }

  // UPCitemdb first for toys/TCG (best coverage), then Open Products Facts.
  // Avoid parallel storms that trip the free UPCitemdb rate limit.
  const upc = await lookupUpcItemDb(barcode);
  if (upc) return upc;

  const off = await lookupOpenFacts(barcode);
  if (off) return off;

  if (!isbn) {
    const book = await lookupBook(barcode);
    if (book) return book;
  }

  const fda = await lookupOpenFda(barcode);
  if (fda) return fda;

  // Manufacturer prefix fallback (e.g. Pokémon Company 820650…) so boosters
  // aren't a hard miss when catalogs don't have the exact SKU yet.
  const prefix = guessFromCompanyPrefix(barcode);
  if (prefix) return prefix;

  return emptyResult(barcode, barcodeRaw);
}

export function productKindLabel(kind: ProductKind): string {
  switch (kind) {
    case 'food':
      return 'Food';
    case 'drink':
      return 'Drink';
    case 'beauty':
      return 'Beauty / personal care';
    case 'pet':
      return 'Pet product';
    case 'medicine':
      return 'Medication';
    case 'book':
      return 'Book';
    case 'manga':
      return 'Manga / comics';
    case 'toy':
      return 'Toy';
    case 'tcg':
      return 'Trading card game';
    case 'general':
      return 'Product';
    default:
      return 'Item';
  }
}

export function productToScanText(p: ProductLookup): string {
  const lines: string[] = [`Barcode · ${p.barcode}`, p.name];
  if (p.authors) lines.push(`Author(s): ${p.authors}`);
  if (p.brand) {
    lines.push(
      p.kind === 'book' || p.kind === 'manga' ? `Publisher: ${p.brand}` : `Brand: ${p.brand}`
    );
  }
  if (p.quantity) {
    lines.push(
      p.kind === 'book' || p.kind === 'manga'
        ? `Details: ${p.quantity}`
        : `Size / pack: ${p.quantity}`
    );
  }
  if (p.categories) lines.push(`Categories: ${p.categories}`);
  if (p.description) lines.push(`About: ${p.description}`);
  if (p.kind === 'tcg') {
    lines.push('Type: Sealed / retail trading-card product');
  }
  if (p.kind === 'medicine') {
    if (p.activeIngredients) lines.push(`Active ingredients: ${p.activeIngredients}`);
    if (p.dosageForm) lines.push(`Form: ${p.dosageForm}`);
    if (p.route) lines.push(`Route: ${p.route}`);
    if (p.warnings) lines.push(`Note: ${p.warnings}`);
  }
  if (p.nutriscore) lines.push(`Nutri-Score: ${p.nutriscore}`);
  if (p.nova != null) lines.push(`NOVA group: ${p.nova}`);
  if (p.allergens) lines.push(`Allergens: ${p.allergens}`);
  if (p.ingredients) {
    lines.push('', 'Ingredients', p.ingredients);
  }
  if (p.nutrition.length) {
    lines.push('', 'Nutrition (per 100g)');
    for (const row of p.nutrition) {
      lines.push(
        `• ${row.label}: ${row.per100g}${row.perServing ? ` (serving ${row.perServing})` : ''}`
      );
    }
  }
  if (!p.found) lines.push(p.summary);
  return lines.join('\n');
}

/** True for retail product barcodes (not QR). */
export function isProductBarcodeType(type: string | undefined): boolean {
  if (!type) return false;
  const t = type.toLowerCase();
  return (
    t === 'ean13' ||
    t === 'ean8' ||
    t === 'upc_a' ||
    t === 'upc_e' ||
    t === 'itf14' ||
    t === 'code128' ||
    t === 'code39' ||
    t === 'codabar'
  );
}
