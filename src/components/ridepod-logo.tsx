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
    <span className={cn("inline-flex h-8 items-center", className)} aria-label="RidePod">
      <Image
        src="/ridepod/darkmode-logo.png"
        alt="RidePod"
        width={190}
        height={48}
        priority={priority}
        className={cn("ridepod-theme-image-dark h-full w-auto object-contain", imageClassName)}
      />
      <Image
        src="/ridepod/lightmode-logo.png"
        alt="RidePod"
        width={260}
        height={72}
        priority={priority}
        className={cn("ridepod-theme-image-light h-full w-auto object-contain", imageClassName)}
      />
    </span>
  );
}
