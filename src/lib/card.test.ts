import { describe, expect, it } from 'vitest';
import { detectArtworkType, normalizeCardName, normalizeFrenchName } from './card';

describe('card utilities', () => {
  describe('normalizeCardName', () => {
    it('removes surrounding quotes and normalises spaces', () => {
      expect(normalizeCardName('  "Blue-Eyes   White   Dragon" ')).toBe('Blue-Eyes White Dragon');
    });
  });

  describe('normalizeFrenchName', () => {
    it('handles french quotes and spacing', () => {
      expect(normalizeFrenchName('  "Dragon Blanc aux Yeux Bleus"  ')).toBe('Dragon Blanc aux Yeux Bleus');
    });
  });

  describe('detectArtworkType', () => {
    it('detects artwork from english name patterns', () => {
      const result = detectArtworkType({
        code: 'BLMM-FR001',
        englishName: 'Dark Magician (Alternate Artwork)',
      });

      expect(result.artwork).toBe('Alternative');
      expect(result.cleanedEnglishName).toBe('Dark Magician');
    });

    it('detects artwork from code suffix', () => {
      const result = detectArtworkType({
        code: 'BLMM-FR001-NEW',
        englishName: 'Dark Magician',
      });

      expect(result.artwork).toBe('New');
    });

    it('detects artwork from extra cell text', () => {
      const result = detectArtworkType({
        code: 'BLMM-FR001',
        englishName: 'Dark Magician',
        extraText: 'New artwork',
      });

      expect(result.artwork).toBe('New');
    });

    it('defaults to None when no signals', () => {
      const result = detectArtworkType({
        code: 'BLMM-FR001',
        englishName: 'Dark Magician',
      });

      expect(result.artwork).toBe('None');
      expect(result.cleanedEnglishName).toBe('Dark Magician');
    });
  });
});
