import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SCAN_PERIOD_MS } from './constants';

/**
 * Thin glowing plane that sweeps top-to-bottom on a loop. Writes the current beam Y
 * into beamYRef every frame (a plain ref, not React state) so each Cylinder can react
 * without triggering a re-render on every animation tick.
 */
export default function ScanBeam({ beamYRef, topY, bottomY, width }) {
  const meshRef = useRef(null);

  useFrame((state) => {
    const t = (state.clock.elapsedTime * 1000) % SCAN_PERIOD_MS;
    const progress = t / SCAN_PERIOD_MS; // 0 -> 1, loops
    const y = topY - progress * (topY - bottomY);
    beamYRef.current = y;
    if (meshRef.current) {
      meshRef.current.position.y = y;
      // Fade the beam near the top/bottom turnaround so the loop reads as continuous.
      const edgeFade = Math.min(1, Math.min(progress, 1 - progress) * 6);
      meshRef.current.material.opacity = 0.35 * edgeFade;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, width]} />
      <meshBasicMaterial color="#7dd3d0" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
