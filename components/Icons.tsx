import React from 'react';

// Using a consistent "solid" icon style as a reversion from the outline style.

export const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
    </svg>
);

export const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

// This is the user-approved Settings icon.
export const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 12h9.75M10.5 18h9.75M3.75 6a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0ZM3.75 12a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0ZM3.75 18a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Z" />
    </svg>
);

export const LoadingIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" {...props}>
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M12 2.99988V5.99988" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M12 18V21" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5.63607 5.63604L7.75739 7.75736" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M16.2426 16.2426L18.364 18.364" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M3 12H6" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M18 12H21" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5.63607 18.364L7.75739 16.2426" />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M16.2426 7.75736L18.364 5.63604" />
    </svg>
);

export const AppLogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
);

export const DocumentPlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M3.75 3a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75zM12 6a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3v-3A.75.75 0 0112 6z" clipRule="evenodd" />
    </svg>
);

export const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19.5 21a3 3 0 003-3v-8.5a3 3 0 00-3-3h-5.379a.75.75 0 01-.53-.22L11.47 5.03a.75.75 0 00-.53-.22H4.5a3 3 0 00-3 3v10.5a3 3 0 003 3h15z" />
    </svg>
);

export const LightbulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V18.75a.75.75 0 01.75-.75zM5.166 17.834a.75.75 0 001.06 1.06l1.591-1.59a.75.75 0 00-1.06-1.061l-1.591 1.59zM4.5 12.75a.75.75 0 010-1.5h2.25a.75.75 0 010 1.5H4.5zM6.166 5.106a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591z" />
    </svg>
);

// This is the user-approved Demo icon.
export const QuillPenIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l10 -10a2.828 2.828 0 1 0 -4 -4l-10 10v4h4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6.5l4 4" />
    </svg>
);

export const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a.75.75 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
    </svg>
);

export const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

export const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.006a.75.75 0 01-.749.658h-7.5a.75.75 0 01-.749-.658L5.168 6.63c-.012-.157-.024-.315-.035-.472a.75.75 0 011.478-.256l.036.208 1.005 13.006h4.992l.992-12.999a.75.75 0 01.75-.75h2.25a.75.75 0 01.75.75v.227z" clipRule="evenodd" />
    </svg>
);

export const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M10.5 3.75a.75.75 0 01.75.75v8.19l2.47-2.47a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 111.06-1.06l2.47 2.47V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
        <path d="M3 16.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" />
    </svg>
);

export const BackIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
    </svg>
);

export const BookOpenIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
);

export const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

export const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

export const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

export const TextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M1.5 2.25a.75.75 0 01.75-.75H3a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V2.25zM21 2.25a.75.75 0 00-.75-.75h-.75a.75.75 0 000 1.5h.75v1.5a.75.75 0 001.5 0V2.25zM5.25 21.75a.75.75 0 01-.75.75H3a.75.75 0 01-.75-.75v-1.5a.75.75 0 011.5 0v.75h.75a.75.75 0 01.75.75zM21.75 21a.75.75 0 01-.75.75h-.75a.75.75 0 010-1.5h.75v-.75a.75.75 0 011.5 0v1.5zM12 4.5a.75.75 0 00-1.5 0v15a.75.75 0 001.5 0v-15z" />
    </svg>
);

export const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
    </svg>
);

export const BoldIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M8 4h4.5a4.5 4.5 0 1 1 0 9H8V4zm2 2v5h2.5a2.5 2.5 0 0 0 0-5H10zm-2 7h5.5a4.5 4.5 0 1 1 0 9H8v-9zm2 2v5h3.5a2.5 2.5 0 0 0 0-5H10z" />
    </svg>
);

export const ItalicIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M10 5v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V5h-8z" />
    </svg>
);

export const UndoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M9.53 2.47a.75.75 0 010 1.06L4.81 8.25H15a6.75 6.75 0 010 13.5h-3a.75.75 0 010-1.5h3a5.25 5.25 0 100-10.5H4.81l4.72 4.72a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
);

export const RedoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M14.47 2.47a.75.75 0 011.06 0l6 6a.75.75 0 010 1.06l-6 6a.75.75 0 11-1.06-1.06L19.19 9.75H9a5.25 5.25 0 100 10.5h3a.75.75 0 010 1.5H9a6.75 6.75 0 010-13.5h10.19l-4.72-4.72a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
);

export const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

export const ListBulletIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M2.625 6.75a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H3.375a.75.75 0 01-.75-.75v-.01zM8.25 6.75a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75zM2.625 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H3.375a.75.75 0 01-.75-.75v-.01zM8.25 12a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75zM2.625 17.25a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H3.375a.75.75 0 01-.75-.75v-.01zM8.25 17.25a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75z" clipRule="evenodd" />
    </svg>
);

export const OrderedListIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
         <path d="M3 5.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-.75v.75h.75a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75V5.75zM9 6a.75.75 0 000 1.5h12a.75.75 0 000-1.5H9zM3.106 12.342c.06.042.11.09.154.142l.028.034c.106.126.23.242.368.344l1.07 1.07a.75.75 0 11-1.06 1.06l-1.07-1.07a.54.54 0 01-.157-.384V12.75a.75.75 0 011.5 0v.092zm.504-1.282a.75.75 0 00-1.22-.872l-1.03 1.03a.75.75 0 001.06 1.06l.19-.19v-.002zM9 12a.75.75 0 000 1.5h12a.75.75 0 000-1.5H9zM4.5 17.25a.75.75 0 00-.75.75v.25a.75.75 0 00.75.75h.75a.75.75 0 00.75-.75V18a.75.75 0 00-.75-.75H5.25v-.75a.75.75 0 00-1.5 0v1.5a.75.75 0 00.75.75h.75a.75.75 0 00.75-.75v-.25a.75.75 0 00-.75-.75H4.5zM9 18a.75.75 0 000 1.5h12a.75.75 0 000-1.5H9z" />
    </svg>
);

export const BlockquoteIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
    </svg>
);

export const H1Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M7 5h2v5h4V5h2v14h-2v-7H9v7H7V5zm12 0h-2l-2 4h2v10h2V5z" />
    </svg>
);

export const H2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M7 5h2v5h4V5h2v14h-2v-7H9v7H7V5z M19 19v-2c0-1.11-.9-2-2-2h-2v4h4zm-2-4h-2V9c0-1.1.9-2 2-2s2 .9 2 2v2h2V9c0-2.2-1.8-4-4-4h-4v2h4v2h-2c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h2z" />
    </svg>
);

export const H3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M7 5h2v5h4V5h2v14h-2v-7H9v7H7V5z M17 6c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-2v2h4v2h-4c-1.1 0-2-.9-2-2v-2c0-1.1.9-2 2-2h2V8h-4V6h4zm-2 2h-2v2h2V8z" />
    </svg>
);

export const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

export const ArrowsPointingOutIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h4.5a.75.75 0 010 1.5h-2.25V9.75a.75.75 0 01-1.5 0V6.75zM15.75 6h4.5a.75.75 0 010 1.5h-2.25V9.75a.75.75 0 01-1.5 0V6.75A.75.75 0 0115.75 6zM3.75 18h4.5a.75.75 0 010 1.5h-2.25v-2.25a.75.75 0 01-1.5 0v4.5A.75.75 0 013.75 18zM15.75 18h4.5a.75.75 0 010 1.5h-2.25v-2.25a.75.75 0 01-1.5 0v4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

export const ArrowsPointingInIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M6.75 3A.75.75 0 017.5 3.75v4.5a.75.75 0 01-1.5 0V6H3.75a.75.75 0 010-1.5h4.5zM16.5 3.75A.75.75 0 0117.25 3h4.5a.75.75 0 010 1.5H18v2.25a.75.75 0 01-1.5 0v-4.5zM7.5 15.75A.75.75 0 016.75 15h-4.5a.75.75 0 010-1.5H6v-2.25a.75.75 0 011.5 0v4.5zM17.25 15.75A.75.75 0 0116.5 15h4.5a.75.75 0 010 1.5H18v2.25a.75.75 0 01-1.5 0v-4.5z" clipRule="evenodd" />
    </svg>
);