import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

Promise.all([
  fetch('./locales/en.json').then(res => res.json()),
  fetch('./locales/zh-CN.json').then(res => res.json()),
  fetch('./locales/zh-TW.json').then(res => res.json())
]).then(([en, zhCN, zhTW]) => {
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
        }
      },
      fallbackLng: 'en',
      detection: {
        // Removed 'navigator' to ensure browser language settings don't override the English default 
        // unless the user has explicitly selected a language (stored in cookie or localStorage)
        order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'htmlTag'],
        lookupCookie: 'i18next',
        lookupLocalStorage: 'i18next',
        caches: ['localStorage', 'cookie'],
      },
      interpolation: {
        escapeValue: false
      }
    });
});

export default i18n;