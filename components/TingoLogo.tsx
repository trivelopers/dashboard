import React from 'react';

interface TingoLogoProps {
  className?: string;
}

const TingoLogo: React.FC<TingoLogoProps> = ({ className }) => {
  const containerClass = ['flex items-center', className].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      <svg
        viewBox="0 0 160 160"
        role="img"
        aria-labelledby="tingoLogoTitle tingoLogoDesc"
        className="h-14 w-14"
      >
        <title id="tingoLogoTitle">Tingo robot logo</title>
        <desc id="tingoLogoDesc">
          Stylized teal robot head with orange clock eye representing the Tingo brand.
        </desc>
        <defs>
          <linearGradient id="tingo-head" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#28B2B7" />
            <stop offset="100%" stopColor="#1C8FA0" />
          </linearGradient>
        </defs>
        <rect x="56" y="128" width="48" height="16" rx="8" fill="#E76A52" />
        <circle cx="112" cy="32" r="8" fill="#E76A52" />
        <circle cx="48" cy="32" r="8" fill="#E76A52" />
        <rect x="103" y="20" width="6" height="20" rx="3" fill="#1A3C4A" />
        <rect x="51" y="20" width="6" height="20" rx="3" fill="#1A3C4A" />
        <circle cx="80" cy="88" r="60" fill="url(#tingo-head)" />
        <rect
          x="36"
          y="64"
          width="64"
          height="36"
          rx="12"
          fill="#F6B53D"
        />
        <circle cx="64" cy="82" r="6" fill="#0E3342" />
        <path
          d="M84 106c4.5 6 13.5 6 18 0"
          stroke="#0E3342"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="112" cy="82" r="27" fill="#F6B53D" />
        <circle cx="112" cy="82" r="24" fill="none" stroke="#0E3342" strokeWidth="4" />
        <circle cx="112" cy="82" r="4" fill="#0E3342" />
        <path
          d="M112 70v12l11 6"
          stroke="#0E3342"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="ml-3">
        <p className="text-2xl font-extrabold leading-none text-[#F6B53D]">Tingo</p>
        <p className="text-[10px] tracking-[0.28em] uppercase text-[#E76A52]">
          {'el Asistente'}
        </p>
      </div>
    </div>
  );
};

export default TingoLogo;
