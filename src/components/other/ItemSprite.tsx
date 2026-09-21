import React from "react";
import SpriteImage from "./SpriteImage.tsx";

interface ItemSpriteProps {
  src?: string | null;
  className?: string;
  placeholderClassName?: string;
  used?: boolean;
  pixelated?: boolean;
  loading?: "eager" | "lazy";
  ariaHidden?: boolean;
}

const ItemSprite: React.FC<ItemSpriteProps> = ({
  src,
  className = "w-6 h-6 shrink-0 object-contain",
  placeholderClassName = "",
  used = false,
  pixelated = true,
  loading = "lazy",
  ariaHidden,
}) => {
  const placeholder = (
    <div
      aria-hidden={ariaHidden}
      className={`${className} rounded bg-gray-100 dark:bg-gray-700 ${placeholderClassName}`}
    />
  );

  return (
    <SpriteImage
      src={src}
      alt=""
      aria-hidden={ariaHidden}
      className={`${className} ${used ? "grayscale-[0.5]" : ""}`}
      style={pixelated ? { imageRendering: "pixelated" } : undefined}
      loading={loading}
      fallback={placeholder}
    />
  );
};

export default ItemSprite;
