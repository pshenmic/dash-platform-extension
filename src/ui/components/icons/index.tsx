import React from 'react';

interface IconProps {
  color?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export const ArrowIcon: React.FC<IconProps> = ({ 
  color = 'white', 
  size = 14, 
  className = '', 
  onClick 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox='0 0 9 14' 
      fill='none' 
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      onClick={onClick}
    >
      <path 
        d='M7.29297 0.292893C7.68349 -0.0976311 8.31651 -0.0976311 8.70703 0.292893C9.09756 0.683418 9.09756 1.31643 8.70703 1.70696L3.41406 6.99992L8.70703 12.2929L8.77539 12.3691C9.09574 12.7618 9.07315 13.3408 8.70703 13.707C8.34092 14.0731 7.76191 14.0957 7.36914 13.7753L7.29297 13.707L0.585938 6.99992L7.29297 0.292893Z' 
        fill={color}
      />
    </svg>
  );
};

// You can add more icon components here as needed
