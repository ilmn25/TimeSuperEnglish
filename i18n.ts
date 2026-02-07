import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

Promise.all([
  fetch('./locales/en.json').then(res => res.json()),
  fetch('./locales/zh-CN.json').then(res => res.json()),
  fetch('./locales/zh-TW.json').then(res => res.json()),
  fetch('./locales/ja.json').then(res => res.json()),
  fetch('./locales/ko.json').then(res => res.json())
]).then(([en, zhCN, zhTW, ja, ko]) => {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: {
          translation: en
        },
        "zh-CN": {
          translation: zhCN
        },
        "zh-TW": {
          translation: zhTW
        },
        ja: {
          translation: ja
        },
        ko: {
          translation: ko
        }
      },
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false
      }
    });
});

export default i18n;