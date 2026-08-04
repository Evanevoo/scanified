import React from 'react';
import { render } from '@testing-library/react';
import HeroCylinderScene from '../../components/landing/HeroCylinderScene';

describe('HeroCylinderScene', () => {
  it('renders only the static fallback when reduceMotion is true (no 3D scene mounted)', () => {
    const { container } = render(<HeroCylinderScene reduceMotion />);
    // StaticFallback renders a single aria-hidden gradient div with no canvas.
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('does not render a canvas synchronously when reduceMotion is false (lazy-loaded, not yet resolved)', () => {
    const { container } = render(<HeroCylinderScene reduceMotion={false} />);
    // The 3D scene is behind React.lazy/Suspense — on first synchronous render it must
    // show the Suspense fallback (StaticFallback), never a canvas, regardless of how
    // fast the dynamic import resolves in a real browser.
    expect(container.querySelector('canvas')).toBeNull();
  });
});
