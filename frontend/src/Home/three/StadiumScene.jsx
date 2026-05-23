import React, { useMemo } from 'react';
import { useGLTF, OrbitControls, ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

function StadiumModel(props) {
  const { scene } = useGLTF('/3D-models/stadium.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group {...props} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

export default function StadiumScene() {
  return (
    <Canvas
      camera={{ position: [0, 8, 20], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >

      {/* /////////////////LIGHTING////////////////////////////////////////////////////////////// */}
        <ambientLight intensity={0.6} />

        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          color="#ffffff"
        />

        <directionalLight
          position={[-5, 6, -5]}
          intensity={0.5}
          color="#ffffff"
        />

        <pointLight
          position={[0, 4, 2]}
          intensity={0.6}
          color="#ffffff"
        />

        <hemisphereLight
  skyColor="#ffffff"
  groundColor="#444444"
  intensity={0.6}
/>

{/* ////////////////////////////////////////////////////////////////////// */}
      <React.Suspense fallback={null}>
        <StadiumModel scale={17} position={[0.3, 0.9, 0]} />
      </React.Suspense>

      <ContactShadows
        position={[0, -2.01, 0]}
        opacity={0.4}
        scale={30}
        blur={2}
        far={15}
      />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
      />
    </Canvas>
  );
}

useGLTF.preload('/3D-models/stadium.glb');
