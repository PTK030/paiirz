import { BRAND_NAME } from "../../utils/brand";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  premium?: boolean;
}

const sizeConfig = {
  sm: "text-xl sm:text-2xl",
  md: "text-3xl sm:text-4xl",
  lg: "text-5xl sm:text-6xl",
};

export function BrandLogo({
  size = "sm",
  className = "",
  premium = false,
}: BrandLogoProps) {
  if (!premium) {
    return (
      <span
        className={`inline-flex items-center font-extrabold tracking-tight text-white leading-none select-none ${sizeConfig[size]} ${className}`}
        aria-label={BRAND_NAME}
      >
        {BRAND_NAME}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center font-extrabold tracking-tight leading-none select-none ${sizeConfig[size]} ${className}`}
      aria-label={BRAND_NAME}
    >
      <span className="brand-logo-premium-base">{BRAND_NAME}</span>
      <span
        aria-hidden="true"
        className="absolute inset-0 brand-logo-premium-fill"
      >
        {BRAND_NAME}
      </span>
    </span>
  );
}
