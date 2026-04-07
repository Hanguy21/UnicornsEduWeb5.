"use client";

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
      className={`flex items-center justify-center overflow-hidden rounded-full ${className ?? ""}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`size-full object-cover ${imageClassName ?? ""}`}
        />
      ) : (
        <span className={fallbackClassName ?? ""}>{fallback}</span>
      )}
    </span>
  );
}
