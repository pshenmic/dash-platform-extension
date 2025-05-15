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
      color={color}
    >
      <path
        d='M7.29297 0.292893C7.68349 -0.0976311 8.31651 -0.0976311 8.70703 0.292893C9.09756 0.683418 9.09756 1.31643 8.70703 1.70696L3.41406 6.99992L8.70703 12.2929L8.77539 12.3691C9.09574 12.7618 9.07315 13.3408 8.70703 13.707C8.34092 14.0731 7.76191 14.0957 7.36914 13.7753L7.29297 13.707L0.585938 6.99992L7.29297 0.292893Z'
        fill='currentColor'
      />
    </svg>
  );
};

export const CopyIcon: React.FC<IconProps> = ({
  color = 'white',
  size = 16,
  className = '',
  onClick
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 16 16'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      onClick={onClick}
      color={color}
    >
      <g clipPath='url(#clip0_3876_6767)'>
        <g clipPath='url(#clip1_3876_6767)'>
          <g clipPath='url(#clip2_3876_6767)'>
            <path
              d='M11.4512 10.5645H5.28516V1.75586H9.32335L11.4512 3.88369V10.5645ZM12.332 3.51758L9.68945 0.875H5.28516H4.4043V1.75586V10.5645V11.4453H5.28516H11.4512H12.332V10.5645V3.51758ZM0.880859 4.39844H0V5.2793V14.0879V14.9688H0.880859H7.04688H7.92773V14.0879V12.3262H7.04688V14.0879H0.880859V5.2793H3.52344V4.39844H0.880859Z'
              fill='currentColor'
            />
          </g>
        </g>
      </g>
      <defs>
        <clipPath id='clip0_3876_6767'>
          <rect width='16' height='16' fill='white'/>
        </clipPath>
        <clipPath id='clip1_3876_6767'>
          <rect width='16' height='14.25' fill='white' transform='translate(0 0.875)'/>
        </clipPath>
        <clipPath id='clip2_3876_6767'>
          <rect width='12.332' height='14.0938' fill='white' transform='translate(0 0.875)'/>
        </clipPath>
      </defs>
    </svg>
  )
}
