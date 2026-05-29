import React from 'react';

const Icon = ({ d, size = 16, stroke = 'currentColor', fill = 'none', strokeWidth = 1.5, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={fill} stroke={stroke}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

export const IconInbox = (p) => <Icon {...p}><path d="M2 9.5V12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 12V9.5M2 9.5l1.6-5.2A1.5 1.5 0 0 1 5 3.3h6a1.5 1.5 0 0 1 1.4 1L14 9.5M2 9.5h3l1 1.5h4l1-1.5h3" /></Icon>;
export const IconStar = (p) => <Icon {...p}><path d="M8 2.2l1.7 3.6 3.9.5-2.9 2.8.8 4-3.5-1.9-3.5 1.9.8-4L2.4 6.3l3.9-.5z" /></Icon>;
export const IconSend = (p) => <Icon {...p}><path d="M13.8 2.2L2.5 6.6l4.2 2.1m7.1-6.5L9.4 13.8l-2.6-5.1m7-6.5L6.8 8.7" /></Icon>;
export const IconSettings = (p) => <Icon {...p}><circle cx="8" cy="8" r="2" /><path d="M12.6 9.6a1 1 0 0 0 .2 1.1l.1.1a1.3 1.3 0 1 1-1.9 1.9l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v.2a1.3 1.3 0 1 1-2.6 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.3 1.3 0 1 1-1.9-1.9l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6h-.2a1.3 1.3 0 1 1 0-2.6h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1A1.3 1.3 0 1 1 4.6 2.8l.1.1a1 1 0 0 0 1.1.2H6a1 1 0 0 0 .6-.9v-.2a1.3 1.3 0 1 1 2.6 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.3 1.3 0 1 1 1.9 1.9l-.1.1a1 1 0 0 0-.2 1.1V6a1 1 0 0 0 .9.6h.2a1.3 1.3 0 1 1 0 2.6h-.1a1 1 0 0 0-.9.6z" /></Icon>;
export const IconArchive = (p) => <Icon {...p}><path d="M2 4.5h12V6H2zM3 6v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6M6.5 9h3" /></Icon>;
export const IconTrash = (p) => <Icon {...p}><path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5V13a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V4.5M6.5 7v4M9.5 7v4" /></Icon>;
export const IconCheck = (p) => <Icon {...p}><path d="M3 8.5L6.2 11.5 13 5" /></Icon>;
export const IconX = (p) => <Icon {...p}><path d="M4 4l8 8M12 4l-8 8" /></Icon>;
export const IconReply = (p) => <Icon {...p}><path d="M7 4L2.5 8 7 12M2.5 8h6a4.5 4.5 0 0 1 4.5 4.5" /></Icon>;
export const IconForward = (p) => <Icon {...p}><path d="M9 4l4.5 4L9 12M13.5 8h-6A4.5 4.5 0 0 0 3 12.5" /></Icon>;
export const IconUnsub = (p) => <Icon {...p}><path d="M2.5 4.5h11v7a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1zM2.5 4.5L8 9l5.5-4.5M11 11l2-2M13 11l-2-2" /></Icon>;
export const IconPlus = (p) => <Icon {...p}><path d="M8 3v10M3 8h10" /></Icon>;
export const IconSearch = (p) => <Icon {...p}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L13.5 13.5" /></Icon>;
export const IconChevronRight = (p) => <Icon {...p}><path d="M6 3.5l4 4.5-4 4.5" /></Icon>;
export const IconChevronDown = (p) => <Icon {...p}><path d="M3.5 6l4.5 4 4.5-4" /></Icon>;
export const IconArrowLeft = (p) => <Icon {...p}><path d="M7 3.5L2.5 8 7 12.5M2.5 8h11" /></Icon>;
export const IconPaperclip = (p) => <Icon {...p}><path d="M11.5 7.5L7 12a2.5 2.5 0 1 1-3.5-3.5l5-5a1.7 1.7 0 0 1 2.4 2.4L6 10.4a.8.8 0 0 1-1.2-1.2L9 5" /></Icon>;
export const IconClock = (p) => <Icon {...p}><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3l2 1.5" /></Icon>;
export const IconSparkle = (p) => <Icon {...p}><path d="M8 2.5l1.2 3.3L12.5 7l-3.3 1.2L8 11.5 6.8 8.2 3.5 7l3.3-1.2zM12.5 11l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4L10.5 13l1.4-.6z" /></Icon>;
export const IconBell = (p) => <Icon {...p}><path d="M4 6.5a4 4 0 1 1 8 0v2l1.5 3h-11L4 8.5zM6 12.5a2 2 0 0 0 4 0" /></Icon>;
export const IconBan = (p) => <Icon {...p}><circle cx="8" cy="8" r="5.5" /><path d="M4 4l8 8" /></Icon>;
export const IconMail = (p) => <Icon {...p}><rect x="2" y="3.5" width="12" height="9" rx="1.2" /><path d="M2.5 4.5L8 9l5.5-4.5" /></Icon>;
export const IconCornerUpLeft = (p) => <Icon {...p}><path d="M6 3.5L2.5 7 6 10.5M2.5 7h7a3 3 0 0 1 3 3v2.5" /></Icon>;
export const IconEye = (p) => <Icon {...p}><path d="M1.5 8S4 3 8 3s6.5 5 6.5 5-2.5 5-6.5 5S1.5 8 1.5 8z" /><circle cx="8" cy="8" r="1.8" /></Icon>;
export const IconRefresh = (p) => <Icon {...p}><path d="M13 4.5A6 6 0 1 0 14 8M13 4.5V2M13 4.5H10.5" /></Icon>;

export const IconCircle = ({ size = 8, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill={color} /></svg>
);

export const IconSpinner = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ animation: 'spin 0.9s linear infinite' }}>
    <circle cx="8" cy="8" r="6" stroke="#3F3F46" strokeWidth="1.5" fill="none" />
    <path d="M14 8a6 6 0 0 0-6-6" stroke="#6366F1" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

export const GmailMark = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <rect x="2" y="4" width="16" height="12" rx="1.5" stroke="#E4E4E7" strokeWidth="1.4" />
    <path d="M2.5 5L10 11L17.5 5" stroke="#E4E4E7" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="15.5" cy="13.5" r="2.2" fill="#EF4444" />
    <text x="15.5" y="14.7" textAnchor="middle" fontSize="3" fontWeight="700" fill="#fff" fontFamily="Inter">G</text>
  </svg>
);

export const OutlookMark = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <rect x="2" y="4" width="16" height="12" rx="1.5" stroke="#E4E4E7" strokeWidth="1.4" />
    <rect x="4.5" y="6.5" width="7" height="7" rx="0.8" fill="#6366F1" />
    <text x="8" y="11.6" textAnchor="middle" fontSize="5" fontWeight="700" fill="#fff" fontFamily="Inter">O</text>
  </svg>
);
