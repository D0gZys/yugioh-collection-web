export type ArtworkType = "None" | "New" | "Alternative";

const QUOTE_REGEX = /^["“](.*)["”]$/;

const NAME_ARTWORK_PATTERNS: Array<{ test: RegExp; replace: RegExp; type: ArtworkType }> = [
  { test: /\(new artwork\)/i, replace: /\(new artwork\)/gi, type: "New" },
  { test: /\(nouvel? artwork\)/i, replace: /\(nouvel? artwork\)/gi, type: "New" },
  { test: /\(alternate artwork\)/i, replace: /\(alternate artwork\)/gi, type: "Alternative" },
  { test: /\(alternative artwork\)/i, replace: /\(alternative artwork\)/gi, type: "Alternative" },
  { test: /\(alt artwork\)/i, replace: /\(alt artwork\)/gi, type: "Alternative" },
  { test: /\(alt\)/i, replace: /\(alt\)/gi, type: "Alternative" },
  { test: /\(alternative\)/i, replace: /\(alternative\)/gi, type: "Alternative" },
  { test: /\(alternate\)/i, replace: /\(alternate\)/gi, type: "Alternative" },
  { test: /\(new\)/i, replace: /\(new\)/gi, type: "New" },
];

const CODE_ARTWORK_PATTERNS: Array<{ regex: RegExp; type: ArtworkType }> = [
  { regex: /-new$/i, type: "New" },
  { regex: /-(aa|alt|alternative)$/i, type: "Alternative" },
  { regex: /-a$/i, type: "Alternative" },
];

const EXTRA_CELL_PATTERNS: Array<{ regex: RegExp; type: ArtworkType }> = [
  { regex: /\bnew artwork\b/i, type: "New" },
  { regex: /\bnouvel? artwork\b/i, type: "New" },
  { regex: /\bnew\b/i, type: "New" },
  { regex: /\balternate artwork\b/i, type: "Alternative" },
  { regex: /\balternative artwork\b/i, type: "Alternative" },
  { regex: /\balt(?:ernate)?\b/i, type: "Alternative" },
];

export const normalizeCardName = (name: string): string => {
  let normalized = name.trim();
  const quoteMatch = normalized.match(QUOTE_REGEX);
  if (quoteMatch) {
    normalized = quoteMatch[1];
  }
  return normalized.replace(/\s+/g, " ").trim();
};

export const detectArtworkType = ({
  code,
  englishName,
  extraText,
}: {
  code: string;
  englishName?: string;
  extraText?: string;
}): { artwork: ArtworkType; cleanedEnglishName: string } => {
  let cleanedEnglishName = englishName ? normalizeCardName(englishName) : "";
  let artwork: ArtworkType = "None";

  if (cleanedEnglishName.length > 0) {
    for (const pattern of NAME_ARTWORK_PATTERNS) {
      if (pattern.test.test(cleanedEnglishName)) {
        artwork = pattern.type;
        cleanedEnglishName = cleanedEnglishName.replace(pattern.replace, "").trim();
        break;
      }
    }
  }

  if (artwork === "None" && extraText) {
    for (const pattern of EXTRA_CELL_PATTERNS) {
      if (pattern.regex.test(extraText)) {
        artwork = pattern.type;
        break;
      }
    }
  }

  if (artwork === "None" && code) {
    for (const pattern of CODE_ARTWORK_PATTERNS) {
      if (pattern.regex.test(code)) {
        artwork = pattern.type;
        break;
      }
    }
  }

  return { artwork, cleanedEnglishName };
};

export const normalizeFrenchName = (name: string): string => normalizeCardName(name);
