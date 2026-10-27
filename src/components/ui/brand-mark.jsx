import Image from "next/image";

export function BrandMark({ size = 36, className }) {
  return (
    <Image
      src="/icon.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      unoptimized
      className={className}
    />
  );
}
