import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { STATUS_COLORS, FLASH_HOLD_MS } from './constants';

/**
 * One procedural gas cylinder: body + dome cap + valve collar + an emissive base
 * ring that lights up in its assigned status color when the scan beam passes it.
 * All per-frame flash/glow updates mutate material refs directly (no React state)
 * to keep this cheap at 60fps — this is a background decorative element.
 */
export default function Cylinder({ position, rotation, status, beamYRef, bodyHeight = 2 }) {
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.transit;
  const baseRingRef = useRef(null);
  const decalRef = useRef(null);
  const lastHitAtRef = useRef(-Infinity);

  const bodyRadius = 0.42;
  const domeRadius = bodyRadius;
  const collarHeight = 0.22;

  // World-space Y of this cylinder's base ring (rotation is Y-axis only, so it never
  // moves this coordinate — safe to compare directly against the beam's world Y).
  const baseWorldY = position[1] - bodyHeight / 2;

  useFrame((state) => {
    const beamY = beamYRef.current;
    const hit = Math.abs(beamY - baseWorldY) < 0.35;
    if (hit) lastHitAtRef.current = state.clock.elapsedTime;

    const sinceHit = (state.clock.elapsedTime - lastHitAtRef.current) * 1000;
    const holdT = Math.max(0, 1 - sinceHit / FLASH_HOLD_MS);

    if (baseRingRef.current) {
      baseRingRef.current.emissiveIntensity = 0.15 + holdT * 2.2;
    }
    if (decalRef.current) {
      // Barcode glyph flashes briefly and sharply right as the beam crosses, then fades.
      decalRef.current.opacity = Math.max(0, holdT * 1.6 - 0.6) * 0.9;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Body */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[bodyRadius, bodyRadius, bodyHeight, 20]} />
        <meshStandardMaterial color="#e7ebef" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* Dome cap */}
      <mesh position={[0, bodyHeight / 2, 0]}>
        <sphereGeometry args={[domeRadius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e7ebef" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* Valve collar */}
      <mesh position={[0, bodyHeight / 2 + collarHeight / 2, 0]}>
        <cylinderGeometry args={[bodyRadius * 0.32, bodyRadius * 0.38, collarHeight, 12]} />
        <meshStandardMaterial color="#9aa4af" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Barcode decal — small emissive plane on the body, flashes when scanned */}
      <mesh position={[0, 0.1, bodyRadius + 0.005]}>
        <planeGeometry args={[0.34, 0.5]} />
        <meshStandardMaterial
          ref={decalRef}
          color="#0f172a"
          emissive="#ffffff"
          emissiveIntensity={1}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Base ring — status-color emissive glow, lit briefly when the beam passes */}
      <mesh position={[0, -bodyHeight / 2 + 0.03, 0]}>
        <cylinderGeometry args={[bodyRadius + 0.02, bodyRadius + 0.02, 0.06, 20]} />
        <meshStandardMaterial
          ref={baseRingRef}
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={0.15}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

/** Deterministic-enough randomized cluster layout, computed once per mount. */
export function useClusterLayout(count, bodyHeight) {
  return useMemo(() => {
    const layout = [];
    const statuses = Object.keys(STATUS_COLORS);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const radius = 1.1 + Math.random() * 0.9;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 0.6;
      const tilt = (Math.random() - 0.5) * 0.35;
      layout.push({
        position: [x, y, z],
        rotation: [tilt, Math.random() * Math.PI * 2, tilt * 0.6],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        bodyHeight,
      });
    }
    return layout;
  }, [count, bodyHeight]);
}
