import React, { useEffect, useState } from 'react';

export const ScrollProgress: React.FC = () => {
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    let frame = 0;
    let lastScrollContainer: HTMLElement | null = null;

    const isScrollable = (el: HTMLElement | null) =>
      Boolean(el && el.scrollHeight - el.clientHeight > 1);

    const updateProgress = () => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollingElement = document.scrollingElement as HTMLElement | null;

      const container = isScrollable(lastScrollContainer)
        ? lastScrollContainer
        : isScrollable(scrollingElement)
          ? scrollingElement
          : null;

      const scrollTop = container
        ? container.scrollTop
        : Math.max(window.scrollY || 0, doc.scrollTop || 0, body.scrollTop || 0);

      const scrollHeight = container
        ? container.scrollHeight
        : Math.max(scrollingElement?.scrollHeight || 0, doc.scrollHeight || 0, body.scrollHeight || 0);

      const clientHeight = container
        ? container.clientHeight
        : Math.max(scrollingElement?.clientHeight || 0, doc.clientHeight || 0, window.innerHeight || 0);

      const scrollRange = Math.max(scrollHeight - clientHeight, 0);
      const nextRatio = scrollRange > 0 ? Math.min(Math.max(scrollTop / scrollRange, 0), 1) : 0;
      const nextPct = Number.isFinite(nextRatio) ? nextRatio * 100 : 0;
      setProgressPct(nextPct);
      frame = 0;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    const onAnyScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && isScrollable(target)) {
        lastScrollContainer = target;
      }
      onScroll();
    };

    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onAnyScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onAnyScroll, true);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-black/20 z-50">
      <div
        className="h-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600"
        style={{
          width: `${progressPct}%`,
          transition: 'width 120ms linear',
        }}
      />
    </div>
  );
};
