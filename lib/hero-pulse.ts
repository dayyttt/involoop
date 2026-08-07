// A one-shot signal from anywhere in the page to the hero's WebGL backdrop.
//
// Sent as a DOM event rather than React state on purpose: the demo card and the
// canvas are cousins, not parent and child, and the backdrop is decorative
// enough that it should never appear in anyone's props.
export const HERO_PULSE = "involoop:hero-pulse";

export interface HeroPulseDetail {
  /** Origin of the ripple in viewport fractions, 0–1 from the top left. */
  x: number;
  y: number;
}

// `el` is the element the pulse should appear to come from — the demo card, so
// the ripple starts where the invoice just appeared.
export function pulseFrom(el: HTMLElement | null) {
  if (typeof window === "undefined") return;
  const rect = el?.getBoundingClientRect();
  const detail: HeroPulseDetail = rect
    ? {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      }
    : { x: 0.75, y: 0.45 };
  window.dispatchEvent(new CustomEvent<HeroPulseDetail>(HERO_PULSE, { detail }));
}
