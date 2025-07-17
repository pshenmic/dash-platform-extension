import React from 'react'

interface IconProps {
  color?: string
  size?: number
  className?: string
  onClick?: () => void
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
  )
}

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
          <rect width='16' height='16' fill='white' />
        </clipPath>
        <clipPath id='clip1_3876_6767'>
          <rect width='16' height='14.25' fill='white' transform='translate(0 0.875)' />
        </clipPath>
        <clipPath id='clip2_3876_6767'>
          <rect width='12.332' height='14.0938' fill='white' transform='translate(0 0.875)' />
        </clipPath>
      </defs>
    </svg>
  )
}

export const SuccessIcon: React.FC<IconProps> = ({
  color = '#1CC400',
  size = 18,
  className = '',
  onClick
}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 18 18'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
    onClick={onClick}
    color={color}
  >
    <circle cx='9' cy='9' r='9' fill='currentColor' fillOpacity='.2' />
    <path d='M5 8.5L8 11.5L13.5 6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
  </svg>
)

export const ErrorIcon: React.FC<IconProps> = ({
  color = '#F45858',
  size = 18,
  className = '',
  onClick
}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 18 18'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
    onClick={onClick}
    color={color}
  >
    <rect width='18' height='18' rx='4' fill='currentColor' fillOpacity='.2' />
    <path d='M9.06951 10L9.0695 4.86092' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
    <path d='M9.06951 13L9.06951 13.0102' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
  </svg>
)

export const QueuedIcon: React.FC<IconProps> = ({
  color = '#F4A358',
  size = 18,
  className = '',
  onClick
}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 18 18'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
    onClick={onClick}
    color={color}
  >
    <rect width='18' height='18' rx='4' fill='currentColor' fillOpacity='.2' />
    <path
      d='M11.6756 12.6482C11.8311 12.8601 12.1306 12.9075 12.3268 12.7326C13.1311 12.0158 13.6857 11.055 13.9009 9.99071C14.1476 8.77034 13.9301 7.50182 13.2909 6.43333C12.6518 5.36484 11.637 4.57324 10.4451 4.2134C9.25315 3.85356 7.96985 3.95136 6.84622 4.48768C5.72259 5.024 4.83949 5.96024 4.36966 7.11325C3.89983 8.26626 3.87708 9.55308 4.30587 10.722C4.73466 11.8909 5.58412 12.8577 6.6881 13.4334C7.65084 13.9355 8.74673 14.1085 9.80981 13.934C10.0691 13.8914 10.2207 13.6287 10.1537 13.3746C10.0867 13.1205 9.82636 12.9718 9.56614 13.0086C8.7336 13.1262 7.88063 12.982 7.12813 12.5896C6.23429 12.1235 5.5465 11.3406 5.19933 10.3942C4.85216 9.44781 4.87057 8.40592 5.25098 7.47237C5.63138 6.53882 6.3464 5.78078 7.25616 5.34654C8.16592 4.91231 9.20497 4.83312 10.17 5.12447C11.1351 5.41582 11.9567 6.05674 12.4742 6.92186C12.9917 7.78698 13.1678 8.81405 12.9681 9.80215C12.7999 10.634 12.3756 11.3878 11.7605 11.9612C11.5683 12.1404 11.5202 12.4362 11.6756 12.6482Z'
      fill='currentColor'
    />
  </svg>
)

export const PooledIcon: React.FC<IconProps> = ({
  color = '#008DE4',
  size = 18,
  className = '',
  onClick
}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 18 18'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
    onClick={onClick}
    color={color}
  >
    <rect width='18' height='18' rx='4' fill='currentColor' fillOpacity='.2' />
    <path
      d='M14 7L12.4328 6.01491C11.4484 5.39611 10.1941 5.40565 9.21918 6.03935V6.03935C8.30752 6.63193 7.14565 6.6816 6.18674 6.16899L4 5'
      stroke='currentColor'
      strokeLinecap='round'
    />
    <path
      d='M14 10L12.4328 9.01491C11.4484 8.39611 10.1941 8.40565 9.21918 9.03935V9.03935C8.30752 9.63193 7.14565 9.6816 6.18674 9.16899L4 8'
      stroke='currentColor'
      strokeLinecap='round'
    />
    <path
      d='M14 13L12.4328 12.0149C11.4484 11.3961 10.1941 11.4057 9.21918 12.0393V12.0393C8.30752 12.6319 7.14565 12.6816 6.18674 12.169L4 11'
      stroke='currentColor'
      strokeLinecap='round'
    />
  </svg>
)

export const BroadcastedIcon: React.FC<IconProps> = ({
  color = '#008DE4',
  size = 18,
  className = '',
  onClick
}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 18 18'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
    onClick={onClick}
    color={color}
  >
    <rect width='18' height='18' rx='4' fill='currentColor' fillOpacity='.2' />
    <path
      d='M4.86093 8.74967L12.5 8.74993M12.5 8.74993L9.5 5.74993M12.5 8.74993L9.5 11.7499'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

export const CalendarIcon: React.FC<IconProps> = ({
  color = 'currentColor',
  size = 14,
  className = '',
  onClick
}) => (
  <svg
    width={size}
    height={(size * 14) / 12}
    viewBox='0 0 12 14'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
    onClick={onClick}
    color={color}
  >
    <path
      fill='currentColor'
      d='M3.42857 0.143066V0.571638V1.85735H8.57143V0.571638V0.143066H9.42857V0.571638V1.85735H11.1429H12V2.71449V4.42878V5.28592V13.0002V13.8574H11.1429H0.857143H0V13.0002V5.28592V4.42878V2.71449V1.85735H0.857143H2.57143V0.571638V0.143066H3.42857ZM11.1429 5.28592H0.857143V13.0002H11.1429V5.28592ZM11.1429 2.71449H0.857143V4.42878H11.1429V2.71449Z'
    />
  </svg>
)

export const EyeOpenIcon: React.FC<IconProps> = ({
  color = 'currentColor',
  size = 16,
  className = '',
  onClick
}) => (
  <svg
    width={size}
    height={(size * 10) / 16}
    viewBox='0 0 16 10'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
    onClick={onClick}
    color={color}
  >
    <path
      d='M7.89888 0C6.24409 0.000806406 4.62351 0.471042 3.22533 1.35609C1.82715 2.24114 0.708743 3.50469 0 5C0.708092 6.49578 1.82635 7.75974 3.22468 8.64489C4.623 9.53004 6.24392 9.99999 7.89888 9.99999C9.55378 9.99999 11.1747 9.53004 12.573 8.64489C13.9713 7.75974 15.0896 6.49578 15.7977 5C15.089 3.50469 13.9706 2.24114 12.5724 1.35609C11.1742 0.471042 9.55364 0.000806406 7.89888 0ZM7.89888 8.98344C6.52084 8.97755 5.16914 8.60565 3.98212 7.90571C2.79509 7.20576 1.81538 6.20297 1.14327 5C1.81083 3.7931 2.78951 2.78709 3.97757 2.08654C5.16561 1.38601 6.51964 1.01653 7.89888 1.01653C9.27804 1.01653 10.6321 1.38601 11.8201 2.08654C13.0082 2.78709 13.9868 3.7931 14.6545 5C13.9823 6.20297 13.0026 7.20576 11.8156 7.90571C10.6285 8.60565 9.27689 8.97755 7.89888 8.98344ZM7.89888 2.51693C7.40772 2.51693 6.92767 2.66256 6.51934 2.93541C6.11101 3.20825 5.79274 3.59605 5.60481 4.0498C5.41687 4.50349 5.3677 5.00271 5.46351 5.48439C5.55932 5.96606 5.7958 6.4085 6.14306 6.7558C6.49033 7.10303 6.93275 7.33953 7.41443 7.43535C7.8961 7.53117 8.39533 7.48197 8.84909 7.29406C9.30277 7.10608 9.69059 6.78785 9.96342 6.3795C10.2362 5.97114 10.3819 5.4911 10.3819 5C10.3819 4.34146 10.1203 3.70989 9.65461 3.24421C9.189 2.77854 8.55742 2.51693 7.89888 2.51693ZM7.89888 6.46658C7.60878 6.46658 7.32525 6.38058 7.08407 6.21937C6.8429 6.05822 6.65492 5.82918 6.54392 5.56123C6.43291 5.29322 6.40387 4.99837 6.46045 4.7139C6.51704 4.42942 6.65675 4.16805 6.8618 3.96299C7.06693 3.75786 7.32823 3.61818 7.61271 3.5616C7.89726 3.50501 8.1921 3.53405 8.46011 3.64504C8.72806 3.75603 8.9571 3.94402 9.11825 4.18519C9.27939 4.42637 9.36546 4.7099 9.36546 5C9.36498 5.38884 9.21034 5.76161 8.93542 6.03654C8.66043 6.31146 8.28765 6.4661 7.89888 6.46658Z'
      fill='currentColor'
    />
  </svg>
)

export const EyeClosedIcon: React.FC<IconProps> = ({
  color = 'currentColor',
  size = 16,
  className = '',
  onClick
}) => (
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
    <path
      d='M7.89888 3C6.24409 3.00081 4.62351 3.47104 3.22533 4.35609C1.82715 5.24114 0.708743 6.50469 0 8C0.708092 9.49578 1.82635 10.7597 3.22468 11.6449C4.623 12.53 6.24392 13 7.89888 13C9.55378 13 11.1747 12.53 12.573 11.6449C13.9713 10.7597 15.0896 9.49578 15.7977 8C15.089 6.50469 13.9706 5.24114 12.5724 4.35609C11.1742 3.47104 9.55364 3.00081 7.89888 3ZM7.89888 11.9834C6.52084 11.9776 5.16914 11.6056 3.98212 10.9057C2.79509 10.2058 1.81538 9.20297 1.14327 8C1.81083 6.7931 2.78951 5.78709 3.97757 5.08654C5.16561 4.38601 6.51964 4.01653 7.89888 4.01653C9.27804 4.01653 10.6321 4.38601 11.8201 5.08654C13.0082 5.78709 13.9868 6.7931 14.6545 8C13.9823 9.20297 13.0026 10.2058 11.8156 10.9057C10.6285 11.6056 9.27689 11.9776 7.89888 11.9834Z'
      fill='currentColor'
    />
    <line x1='1' y1='15' x2='15' y2='1' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
)
