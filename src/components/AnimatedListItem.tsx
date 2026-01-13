import { useState, useEffect, useRef, useCallback, memo } from "react";
import { ANIMATION } from "../utilities/constants";

interface AnimatedListItemProps {
  children: React.ReactNode;
  isExiting: boolean;
  onExitComplete: () => void;
}

type AnimationPhase = "measuring" | "entering" | "visible" | "exiting" | "done";

export const AnimatedListItem = memo(function AnimatedListItem({
  children,
  isExiting,
  onExitComplete,
}: AnimatedListItemProps): React.ReactElement | null {
  const [phase, setPhase] = useState<AnimationPhase>("measuring");
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);
  const onExitCompleteRef = useRef(onExitComplete);

  onExitCompleteRef.current = onExitComplete;

  const measureAndEnter = useCallback((): void => {
    if (contentRef.current) {
      const measuredHeight = contentRef.current.offsetHeight;
      setHeight(measuredHeight);

      requestAnimationFrame(() => {
        setPhase("entering");
        requestAnimationFrame(() => {
          setPhase("visible");
        });
      });
    }
  }, []);

  useEffect(() => {
    if (phase === "measuring") {
      measureAndEnter();
    }
  }, [phase, measureAndEnter]);

  useEffect(() => {
    if (isExiting && (phase === "visible" || phase === "entering")) {
      setPhase("exiting");

      const exitTimer = setTimeout(() => {
        setPhase("done");
        onExitCompleteRef.current();
      }, ANIMATION.LIST_ITEM_DURATION_MS);

      return () => {
        clearTimeout(exitTimer);
      };
    }
  }, [isExiting, phase]);

  if (phase === "done") {
    return null;
  }

  const isExpanded = phase === "visible";
  const isContentVisible = phase === "visible";

  return (
    <div
      style={{
        height: phase === "measuring" ? "auto" : isExpanded ? height : 0,
        overflow: "hidden",
        opacity: phase === "measuring" ? 0 : 1,
        position: phase === "measuring" ? "absolute" : "relative",
        visibility: phase === "measuring" ? "hidden" : "visible",
        transition:
          phase !== "measuring"
            ? `height ${ANIMATION.LIST_ITEM_DURATION_MS}ms ease-out`
            : "none",
      }}
    >
      <div
        ref={contentRef}
        style={{
          opacity: isContentVisible ? 1 : 0,
          transition: `opacity ${
            ANIMATION.LIST_ITEM_DURATION_MS - ANIMATION.LIST_ITEM_FADE_DELAY_MS
          }ms ease-out`,
          transitionDelay: isContentVisible
            ? `${ANIMATION.LIST_ITEM_FADE_DELAY_MS}ms`
            : "0ms",
        }}
      >
        {children}
      </div>
    </div>
  );
});
