import React, { useEffect, useState } from "react";

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
    return (
      fallback ?? (
        <span
          className={`${props.className ?? ""} inline-block rounded bg-gray-100 dark:bg-gray-700`}
          role={props.alt ? "img" : undefined}
          aria-label={props.alt || undefined}
          aria-hidden={props["aria-hidden"] ?? (props.alt ? undefined : true)}
        />
      )
    );
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
const SpriteImage: React.FC<SpriteImageProps> = (props) => (
  <SpriteImageAttempt key={props.src} {...props} />
);

export default SpriteImage;
