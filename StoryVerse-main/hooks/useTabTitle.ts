import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { TabContext } from '../contexts/TabContext';
import { TabIconType } from '../types';

export function useTabTitle(title: string, iconType?: TabIconType) {
    const { updateTabInfo } = React.useContext(TabContext);
    const location = useLocation();

    React.useEffect(() => {
        if (title) {
            updateTabInfo(location.pathname, { title, iconType });
        }
    }, [title, iconType, location.pathname, updateTabInfo]);
}
