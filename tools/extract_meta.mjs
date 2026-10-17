// Extracts mushaf metadata (Madani 604-page Hafs layout) from the `quran-meta` npm package.
//   npm i quran-meta   (Node 22+)   then:   node tools/extract_meta.mjs > tools/source/quran_meta.json
import { quran, surahNamesEn } from 'quran-meta';
const surahs = [];
for (let n = 1; n <= 114; n++) {
  const m = quran.getSurahMeta(n);
  surahs.push({ n, ar: m.name, en: surahNamesEn[n][1], verses: m.ayahCount, meccan: m.isMeccan, ruku: m.rukuCount });
}
const pages = [], juz = [], hizb = [];
for (let p = 1; p <= 604; p++) pages.push(quran.getPageMeta(p).first);
for (let j = 1; j <= 30; j++) juz.push(quran.getJuzMeta(j).first);
for (let h = 1; h <= 60; h++) hizb.push(quran.getRubAlHizbMeta(4 * (h - 1) + 1).first);
console.log(JSON.stringify({ numAyahs: quran.meta.numAyahs, numSurahs: quran.meta.numSurahs, surahs, pages, juz, hizb }));
