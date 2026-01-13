import { forwardRef } from "react";
import { cn } from "../utilities/cn";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const Layout = forwardRef<HTMLDivElement, LayoutProps>(function Layout(
  { children, className = "" },
  ref
): React.ReactElement {
  return (
    <div
      ref={ref}
      className={cn(
        "h-[calc(100vh-8px)] w-[calc(100vw-8px)] m-1",
        "flex flex-col",
        "bg-surface-base-light dark:bg-surface-base",
        "text-text-primary dark:text-text-primary-dark",
        "relative overflow-hidden rounded-xl",
        className
      )}
    >
      {children}
    </div>
  );
});
