import th from './locales/th.json';
import en from './locales/en.json';

export type Language = 'th' | 'en';

export const translations = { th, en } as const;
