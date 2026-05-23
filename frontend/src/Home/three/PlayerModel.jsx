import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

/**
 * Pure presentational fielder/player component.
 * NO useFrame, NO delta, NO time-based animation.
 * Catch animation driven entirely by parent via getCatchPlayerState().
 */
export default function PlayerModel({ position, rotation, scale = 2.0, ...props }) {
  const { scene } = useGLTF('/3D-models/player.glb');
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

useGLTF.preload('/3D-models/player.glb');
