import * as React from 'react';
import { LanguageContext } from '../contexts/LanguageContext';

export const useTranslations = () => React.useContext(LanguageContext);
