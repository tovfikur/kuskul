import { useEffect, useMemo, useState } from "react";

export function useRevealOnScroll<T extends Element>(opts?: {
  rootMargin?: string;
  threshold?: number;
}) {
  const [el, setEl] = useState<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const options = useMemo(
    () => ({
      rootMargin: opts?.rootMargin ?? "0px 0px -10% 0px",
      threshold: opts?.threshold ?? 0.12,
    }),
    [opts?.rootMargin, opts?.threshold],
  );

  useEffect(() => {
    if (!el) return;
    if (isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: options.rootMargin, threshold: options.threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [el, isVisible, options.rootMargin, options.threshold]);

  return { setRef: setEl, isVisible };
}
