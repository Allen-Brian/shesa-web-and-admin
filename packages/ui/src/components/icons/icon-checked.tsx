import * as React from 'react';

interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
}

/** Filled green circle with a white check mark — used for success/healthy states. */
export function IconChecked({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      <rect width="20" height="20" rx="10" fill="#31B768" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.5 7.28695L8.78596 14.001L4.5 9.71503L5.78768 8.42735L8.78596 11.4256L14.2123 5.99927L15.5 7.28695Z"
        fill="white"
      />
    </svg>
  );
}
