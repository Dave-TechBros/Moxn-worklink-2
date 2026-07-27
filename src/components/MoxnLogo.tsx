import React from 'react';

interface MoxnLogoProps {
  className?: string;
  size?: number;
}

export const MoxnLogo: React.FC<MoxnLogoProps> = ({ className = "", size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Briefcase Handle */}
      <path
        d="M8.5 6.5V4.8C8.5 3.80589 9.30589 3 10.3 3H13.7C14.6941 3 15.5 3.80589 15.5 4.8V6.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Briefcase Outer Frame */}
      <rect
        x="2.5"
        y="6.5"
        width="19"
        height="14.5"
        rx="2.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stylized M-Fold Inside Briefcase */}
      <path
        d="M6 16.5V10.5L12 15L18 10.5V16.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
