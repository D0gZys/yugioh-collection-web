export type LanguageCode =
  | "EN"
  | "FR"
  | "DE"
  | "SP"
  | "IT"
  | "PT"
  | "JP"
  | "KR"
  | "ZH"
  | "RU";

type LanguageDefinition = {
  code: LanguageCode;
  label: string;
  aliases?: string[];
};

const LANGUAGE_DEFINITIONS: LanguageDefinition[] = [
  { code: "EN", label: "Anglais", aliases: ["US", "UK"] },
  { code: "FR", label: "Francais" },
  { code: "DE", label: "Allemand" },
  { code: "SP", label: "Espagnol", aliases: ["ES"] },
  { code: "IT", label: "Italien" },
  { code: "PT", label: "Portugais" },
  { code: "JP", label: "Japonais" },
  { code: "KR", label: "Coreen" },
  { code: "ZH", label: "Chinois", aliases: ["CN"] },
  { code: "RU", label: "Russe" },
];

const ALIAS_TO_CODE: Record<string, LanguageCode> = LANGUAGE_DEFINITIONS.reduce(
  (accumulator, definition) => {
    accumulator[definition.code] = definition.code;
    (definition.aliases ?? []).forEach((alias) => {
      accumulator[alias] = definition.code;
    });
    return accumulator;
  },
  {} as Record<string, LanguageCode>
);

export const DEFAULT_LANGUAGE_CODE: LanguageCode = "EN";

export const LANGUAGE_OPTIONS = LANGUAGE_DEFINITIONS.map((definition) => ({
  code: definition.code,
  label: definition.label,
}));

export const resolveLanguageCode = (
  rawCode: string | null | undefined
): LanguageCode | null => {
  if (!rawCode) {
    return null;
  }

  const normalized = rawCode.trim().toUpperCase();
  return ALIAS_TO_CODE[normalized] ?? null;
};

export const getLanguageLabel = (code: LanguageCode): string => {
  const definition = LANGUAGE_DEFINITIONS.find(
    (language) => language.code === code
  );
  return definition ? definition.label : code;
};

export const detectLanguageFromCardCode = (
  rawCode: string
): LanguageCode | null => {
  const normalized = rawCode?.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const suffixMatch = normalized.match(/([A-Z]{2,3})(\d{2,})$/);
  if (suffixMatch) {
    const resolved = resolveLanguageCode(suffixMatch[1]);
    if (resolved) {
      return resolved;
    }
  }

  const segments = normalized.split(/[-_\/\s]+/).filter(Boolean).reverse();

  for (const segment of segments) {
    const resolved = resolveLanguageCode(segment);
    if (resolved) {
      return resolved;
    }

    const alphaMatch = segment.match(/^([A-Z]{2,3})\d+/);
    if (alphaMatch) {
      const alias = resolveLanguageCode(alphaMatch[1]);
      if (alias) {
        return alias;
      }
    }
  }

  return null;
};

export const detectDominantLanguageFromCodes = (
  codes: string[]
): {
  code: LanguageCode | null;
  matches: number;
  total: number;
  confidence: number;
} => {
  const tally = new Map<LanguageCode, number>();
  let matchedCodes = 0;

  codes.forEach((code) => {
    const detected = detectLanguageFromCardCode(code);
    if (detected) {
      matchedCodes += 1;
      tally.set(detected, (tally.get(detected) ?? 0) + 1);
    }
  });

  if (tally.size === 0) {
    return {
      code: null,
      matches: 0,
      total: codes.length,
      confidence: 0,
    };
  }

  let winner: LanguageCode | null = null;
  let highestCount = 0;

  for (const [code, count] of tally.entries()) {
    if (count > highestCount) {
      winner = code;
      highestCount = count;
    }
  }

  const confidence =
    matchedCodes === 0 ? 0 : Number((highestCount / matchedCodes).toFixed(2));

  return {
    code: winner,
    matches: matchedCodes,
    total: codes.length,
    confidence,
  };
};
