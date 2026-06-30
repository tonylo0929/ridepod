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
        src="/ridepod/darkmode-logo-transparent.png"
        alt="RidePod"
        width={999}
        height={273}
        priority={priority}
        className={cn("h-full w-auto object-contain", imageClassName)}
      />
    </span>
  );
}
