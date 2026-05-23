import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

/**
 * Pure presentational ball component.
 * NO useFrame, NO delta, NO time-based animation.
 * All position/rotation is set by the parent via props.
 */
export default function BallModel({ position, rotation, scale = 0.08, ...props }) {
  const { scene } = useGLTF('/3D-models/ball.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
      {...props}
      dispose={null}
    >
      <primitive object={clonedScene} />
      {/* Neon glow follows ball */}
      <pointLight intensity={2} distance={4} color="#00f3ff" />
    </group>
  );
}

useGLTF.preload('/3D-models/ball.glb');
