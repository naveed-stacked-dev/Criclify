import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

/**
 * Pure presentational batsman component.
 * NO useFrame, NO delta, NO time-based animation.
 * rotation.y driven entirely by parent via getBatsmanSwing().
 */
export default function BatsmanModel({ position, rotation, scale = 2.5, ...props }) {
  const { scene } = useGLTF('/3D-models/Hero-batsman.glb');
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
    </group>
  );
}

useGLTF.preload('/3D-models/Hero-batsman.glb');
