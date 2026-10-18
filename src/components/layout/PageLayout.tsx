import type { ReactNode } from "react";
import AppFooter from "./AppFooter";

const widths = {
  auth: "max-w-md",
  account: "max-w-2xl",
  home: "max-w-5xl",
  rulesets: "max-w-6xl",
  tracker: "max-w-480",
};

type PageLayoutProps = {
  width: keyof typeof widths;
  children: ReactNode;
  className?: string;
  compactFooter?: boolean;
  showFooter?: boolean;
};

export default function PageLayout({
  width,
  children,
  className,
  compactFooter = false,
  showFooter = true,
}: PageLayoutProps) {
  return (
    <div className={`mx-auto w-full min-w-0 ${widths[width]}`}>
      <div className={className}>{children}</div>
      {showFooter && (
        <div className="mt-6">
          <AppFooter
            compact={compactFooter}
            trackerLayout={width === "tracker"}
          />
        </div>
      )}
    </div>
  );
}
