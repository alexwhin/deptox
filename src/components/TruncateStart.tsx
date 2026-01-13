import { useRef, useState, useEffect, type ReactElement } from "react";
import { cn } from "../utilities/cn";

interface TruncateStartProps {
  text: string;
  className?: string | undefined;
  onClick?: (() => void) | undefined;
}

export function TruncateStart({
  text,
  className = "",
  onClick,
}: TruncateStartProps): ReactElement {
  const clickableClass = onClick ? "cursor-pointer" : "";
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = (): void => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        setIsOverflowing(textWidth > containerWidth);
      }
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [text]);

  if (isOverflowing) {
    return (
      <div
        ref={containerRef}
        title={text}
        onClick={onClick}
        className={cn("overflow-hidden", clickableClass, className)}
        style={{
          maskImage: "linear-gradient(to right, transparent, black 24px)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 24px)",
        }}
      >
        <span
          ref={textRef}
          className="block whitespace-nowrap"
          style={{ direction: "rtl", textAlign: "left" }}
        >
          <bdi>{text}</bdi>
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      title={text}
      onClick={onClick}
      className={cn("overflow-hidden", clickableClass, className)}
    >
      <span ref={textRef} className="block whitespace-nowrap">
        {text}
      </span>
    </div>
  );
}
