import React, { useEffect, useState } from "react";
import { useImageLoading } from "@/src/contexts/ImageLoadingContext";
import { useImageConsent } from "@/src/contexts/ImageConsentContext";
import { useTranslation } from "react-i18next";
import { FiImage, FiSettings } from "react-icons/fi";

interface SpriteImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  fallback?: React.ReactNode;
}

const SpriteImageAttempt: React.FC<SpriteImageProps> = ({
  src,
  fallback,
  onError,
  ...props
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed) return;
    // Retry only failed images, once per connectivity event. Another failure
    // keeps the placeholder until the next event instead of starting a loop.
    const retry = () => setFailed(false);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [failed]);

  if (!src || failed) {
    return fallback ?? null;
  }

  return (
    <img
      {...props}
      src={src}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
};

// A new source starts clean. Replacing the failed image with a placeholder
// also ensures that retry mounts a fresh img, without changing its cache URL.
const SpriteImage: React.FC<SpriteImageProps> = (props) => {
  const allowed = useImageLoading();
  const { decision, openConsent } = useImageConsent();
  const { t } = useTranslation();
  const external = [
    props.src,
    ...(props.srcSet
      ?.split(",")
      .map((candidate) => candidate.trim().split(/\s+/)[0]) ?? []),
  ].some((source) => {
    if (!source) return false;
    try {
      const url = new URL(source, window.location.href);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        url.origin !== window.location.origin
      );
    } catch {
      return false;
    }
  });
  const blocked = external && !allowed;
  if (blocked && decision === false && props.fallback == null && openConsent) {
    return (
      <button
        type="button"
        title={t("privacy.images.placeholder")}
        aria-label={t("privacy.images.placeholder")}
        className={`${
          (props.className ?? "h-8 w-8")
            .split(/\s+/)
            .filter((name) => name !== "pointer-events-none")
            .join(" ") ?? ""
        } inline-flex shrink-0 cursor-pointer items-center justify-center rounded border border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-gray-700`}
        style={{
          width: props.width,
          height: props.height,
          ...props.style,
          pointerEvents: "auto",
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
        }}
        onClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          openConsent();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        onKeyUp={(event) => event.stopPropagation()}
        onContextMenu={(event) => {
          event.stopPropagation();
          event.preventDefault();
        }}
      >
        <span
          className="relative flex h-full w-full items-center justify-center"
          aria-hidden="true"
        >
          <FiImage className="h-2/3 w-2/3" />
          <FiSettings className="absolute bottom-0 right-0 h-1/2 w-1/2 rounded-full bg-blue-50 dark:bg-gray-800" />
        </span>
      </button>
    );
  }
  return (
    <SpriteImageAttempt
      key={blocked ? "blocked" : props.src}
      {...props}
      src={blocked ? null : props.src}
      srcSet={blocked ? undefined : props.srcSet}
    />
  );
};

export default SpriteImage;
