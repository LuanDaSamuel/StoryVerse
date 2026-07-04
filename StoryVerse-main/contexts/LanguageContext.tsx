import * as React from 'react';
import { translations } from '../utils/translations';

// The type will be one of the language objects from translations
export type TranslationSet = typeof translations['en'];

export const LanguageContext = React.createContext<TranslationSet>(translations.en);
