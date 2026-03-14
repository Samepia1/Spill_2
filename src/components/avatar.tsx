import Image from "next/image";

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 80,
};

type AvatarProps = {
  src: string | null;
  alt: string;
  isAnonymous?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
};

export default function Avatar({
  src,
  alt,
  isAnonymous = false,
  size = "sm",
}: AvatarProps) {
  const px = sizeMap[size];
  const iconScale = size === "xs" ? 12 : size === "sm" ? 16 : size === "md" ? 20 : 36;

  // Anonymous: always show silhouette
  if (isAnonymous) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"
        style={{ width: px, height: px }}
      >
        <SilhouetteIcon size={iconScale} />
      </div>
    );
  }

  // Has avatar: show image
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        className="shrink-0 rounded-full object-cover"
        style={{ width: px, height: px }}
      />
    );
  }

  // No avatar: show placeholder
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      style={{ width: px, height: px }}
    >
      <SilhouetteIcon size={iconScale} />
    </div>
  );
}

function SilhouetteIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
