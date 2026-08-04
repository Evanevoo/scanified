import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import Cylinder, { useClusterLayout } from './Cylinder';
import ScanBeam from './ScanBeam';
import { CYLINDER_COUNT, ROTATION_PERIOD_MS } from './constants';

const BODY_HEIGHT = 2;

function ClusterGroup() {
  const groupRef = useRef(null);
  const beamYRef = useRef(BODY_HEIGHT);
  const layout = useClusterLayout(CYLINDER_COUNT, BODY_HEIGHT);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += (delta * Math.PI * 2) / (ROTATION_PERIOD_MS / 1000);
  });

  return (
    <group ref={groupRef}>
      {layout.map((c, i) => (
        <Cylinder
          key={i}
          position={c.position}
          rotation={c.rotation}
          status={c.status}
          bodyHeight={c.bodyHeight}
          beamYRef={beamYRef}
        />
      ))}
      <ScanBeam beamYRef={beamYRef} topY={BODY_HEIGHT * 0.9} bottomY={-BODY_HEIGHT * 0.9} width={4} />
    </group>
  );
}

/**
 * The actual Three.js scene — this whole module is the lazy-loaded chunk (only
 * CylinderClusterScene.jsx and its imports, not the lightweight index.jsx wrapper).
 */
export default function CylinderClusterScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0.6, 6.5], fov: 40 }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} />
      <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#c7d2fe" />
      <hemisphereLight args={['#ffffff', '#e7ebef', 0.4]} />
      <ClusterGroup />
    </Canvas>
  );
}
