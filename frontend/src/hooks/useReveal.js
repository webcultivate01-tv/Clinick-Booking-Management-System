simport { useEffect } from 'react';

/**
 * Adds the `.revealed` class to every `.reveal | .reveal-left |
 * .reveal-right | .reveal-scale` element on the page once it scrolls
 * into view. Call once near the top of each page that uses these classes.
 */
export function useReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale'
    );
    if (!targets.length) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
