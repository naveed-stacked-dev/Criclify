import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import BallModel from '../three/BallModel';
import BatsmanModel from '../three/BatsmanModel';
import { getBallPosition, getBatsmanSwing } from '../utils/ballTrajectory';

function GlobalBallScene({ scrollProgressRef, onLoad }) {
  const ballRef = useRef();
  const batsmanRef = useRef();

  useEffect(() => {
    onLoad?.();
  }, []);

  useFrame(() => {
    const scrollProgress = scrollProgressRef?.current || 0;
    // ── Ball ─────────────────────────────────────────────
    if (ballRef.current) {
      const { x, y, z, rotationX, rotationZ } = getBallPosition(scrollProgress);

      ballRef.current.position.set(x, y, z);

      // smoother rotation update
      ballRef.current.rotation.x = rotationX;
      ballRef.current.rotation.z = rotationZ;
    }

    // ── Batsman ──────────────────────────────────────────
    if (batsmanRef.current) {
      const { rotationY } = getBatsmanSwing(scrollProgress);
      batsmanRef.current.rotation.y = rotationY;

      const batsmanVisible = scrollProgress < 0.2;

      if (batsmanVisible) {
        const fadeT =
          scrollProgress < 0.18
            ? 1
            : Math.max(0, 1 - (scrollProgress - 0.18) / 0.04);

        batsmanRef.current.scale.setScalar(2.2 * fadeT);
        batsmanRef.current.visible = true;
      } else {
        batsmanRef.current.scale.setScalar(0);
        batsmanRef.current.visible = false;
      }
    }
  });

  return (
    <>
      {/* Lighting */}
      {/* <ambientLight intensity={0.25} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} color="#00f3ff" />
      <directionalLight position={[-3, 6, -3]} intensity={0.5} color="#bc13fe" />
      <pointLight position={[0, 4, 2]} intensity={0.4} color="#ffffff" /> */}

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

      {/* ////////////////////////////////////////////////////////////////// */}

      {/* Ball */}
      <group ref={ballRef}>
        <BallModel scale={0.035} />
      </group>

      {/* Batsman */}
      <group ref={batsmanRef} position={[-3.4, -0.5, 0]} rotation={[0, -0.3, 0]}>
        <BatsmanModel scale={2.2} />
      </group>
    </>
  );
}

export default function FloatingBall({ scrollProgressRef }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="canvas-container">
      {/* Placeholder shown while the GLB model loads */}
      <img
        src="/batsman-load.png"
        alt=""
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '42%',
          height: '95%',
          objectFit: 'contain',
          objectPosition: 'bottom left',
          pointerEvents: 'none',
          opacity: loaded ? 0 : 1,
          transition: 'opacity 0.4s ease',
        }}
      />
      <Canvas
        camera={{ position: [0, 1, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <GlobalBallScene scrollProgressRef={scrollProgressRef} onLoad={() => setLoaded(true)} />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}