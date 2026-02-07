import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

Promise.all([
  fetch('./locales/en.json').then(res => res.json()),
  fetch('./locales/zh-CN.json').then(res => res.json())
]).then(([en, zhCN]) => {
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
        }
      },
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false
      }
    });
});

export default i18n;