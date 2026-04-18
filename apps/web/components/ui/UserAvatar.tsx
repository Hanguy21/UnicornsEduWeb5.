"use client";

import Image from "next/image";

type UserAvatarProps = {
  src?: string | null;
  fallback: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export default function UserAvatar({
  src,
  fallback,
  alt,
  className,
  imageClassName,
  fallbackClassName,
}: UserAvatarProps) {
  return (
    <span
      className={`relative flex items-center justify-center overflow-hidden rounded-full ${className ?? ""}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          unoptimized
          className={`size-full object-cover ${imageClassName ?? ""}`}
        />
      ) : (
        <span className={fallbackClassName ?? ""}>{fallback}</span>
      )}
    </span>
  );
}
