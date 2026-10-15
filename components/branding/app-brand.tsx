import Image from "next/image";
import Link from "next/link";

type AppBrandSize =
  | "sm"
  | "md"
  | "lg";

type AppBrandProps = {
  size?: AppBrandSize;
  showName?: boolean;
  href?: string | null;
  priority?: boolean;
  className?: string;
};

const sizeStyles: Record<
  AppBrandSize,
  {
    image: string;
    width: number;
    height: number;
    text: string;
    gap: string;
  }
> = {
  sm: {
    image: "h-8 w-8",
    width: 36,
    height: 36,
    text: "text-base",
    gap: "gap-0",
  },

  md: {
    image: "h-10 w-10",
    width: 50,
    height: 50,
    text: "text-lg",
    gap: "gap-0",
  },

  lg: {
    image: "h-20 w-20",
    width: 80,
    height: 80,
    text: "text-2xl",
    gap: "gap-0",
  },
};

export function AppBrand({
  size = "md",
  showName = true,
  href = null,
  priority = false,
  className = "",
}: AppBrandProps) {
  const styles = sizeStyles[size];

  const brand = (
    <div
      className={`
        inline-flex items-center
        ${styles.gap}
        ${className}
      `}
    >
      <Image
        src="/images/logo.png"
        alt={showName ? "" : "Diary AI"}
        width={styles.width}
        height={styles.height}
        priority={priority}
        className={`
          shrink-0 object-contain
          ${styles.image}
        `}
      />

      {showName && (
        <span
          className={`
            whitespace-nowrap
            font-bold
            tracking-tight
            text-slate-950
            dark:text-white
            ${styles.text}
          `}
        >
          Diary AI
        </span>
      )}
    </div>
  );

  if (!href) {
    return brand;
  }

  return (
    <Link
      href={href}
      aria-label="Diary AI home"
      className="
        inline-flex
        rounded-xl
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-sky-500
        focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-slate-950
      "
    >
      {brand}
    </Link>
  );
}