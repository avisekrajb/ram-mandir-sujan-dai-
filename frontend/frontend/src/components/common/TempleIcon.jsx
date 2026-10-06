import React from 'react';

const TempleIcon = ({ size = 44, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 48 48" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <path
      d="M24 3.5C24 3.5 15 17 13 26C11.4 33.2 15.6 39.5 24 39.5C32.4 39.5 36.6 33.2 35 26C33 17 24 3.5 24 3.5Z"
      stroke="currentColor" 
      strokeWidth="2.3" 
      strokeLinejoin="round" 
      strokeLinecap="round" 
      fill="none"
    />
    <path 
      d="M17 26.5C19 24 29 24 31 26.5" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
    <path 
      d="M9 39.5H39" 
      stroke="currentColor" 
      strokeWidth="2.3" 
      strokeLinecap="round" 
    />
    <circle 
      cx="24" 
      cy="9.5" 
      r="1.7" 
      fill="currentColor" 
    />
  </svg>
);

export default TempleIcon;