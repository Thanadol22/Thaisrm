'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface MemberAvatarProps {
  photoUrl?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  roundedClassName?: string;
}

export function MemberAvatar({
  photoUrl,
  name = '',
  size = 'md',
  className = '',
  roundedClassName = 'rounded-2xl',
}: MemberAvatarProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  // Dimensions mapping
  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-black',
    lg: 'w-14 h-14 text-base font-black',
    xl: 'w-20 h-20 text-xl font-black',
    '2xl': 'w-24 h-24 text-2xl font-black',
  }[size];

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10',
    '2xl': 'w-12 h-12',
  }[size];

  // Extract clean initial letter
  const getInitial = (str?: string | null) => {
    if (!str || str.trim() === '') return 'M';
    const trimmed = str.trim();
    // Thai or English initial character
    return trimmed.slice(0, 1);
  };

  const initial = getInitial(name);
  const showImage = Boolean(photoUrl && photoUrl.trim() !== '' && !hasError);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden select-none shadow-xs border border-blue-200/50 bg-gradient-to-br from-[#0026b3] via-[#001f94] to-[#001770] text-white ${roundedClassName} ${sizeClasses} ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : initial ? (
        <span className="leading-none drop-shadow-xs font-black tracking-normal">
          {initial}
        </span>
      ) : (
        <User className={`${iconSizes} text-white/80`} />
      )}
    </div>
  );
}
