import Image from "next/image";
import { cn } from "@/components/ui";

export function RidePodLogo({
  className,
  imageClassName,
  priority = false,
}: {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex h-8 items-center", className)} aria-label="Fare Enough">
      <Image
        src="/ridepod/fare-enough-logo-gold.png"
        alt="Fare Enough"
        width={1559}
        height={315}
        priority={priority}
        className={cn("h-full w-auto object-contain", imageClassName)}
      />
    </span>
  );
}
