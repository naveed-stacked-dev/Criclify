import React, { useRef, useState, useEffect, Suspense } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Check } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import PlayerModel from '../three/PlayerModel';
import { getCatchPlayerState, getBallPosition } from '../utils/ballTrajectory';

const features = [
  'Real-time ball-by-ball live scoring',
  'Advanced player performance analytics',
  'Automated tournament bracket generation',
  'Multi-device synchronized dashboards',
  'Role-based access for teams and admins',
  'Cloud-powered infrastructure with 99.9% uptime',
];

/* ─── Inline catch 3D scene ─────────────────────────────────────────────── */
function CatchScene({ sectionProgress = 0 }) {
  const playerRef = useRef();

  useFrame(() => {
    if (!playerRef.current) return;
    // const { rotationY, posY } = getCatchPlayerState(sectionProgress);
    const { x } = getBallPosition(sectionProgress); // get ball X
    const { rotationY, posY } = getCatchPlayerState(sectionProgress, x);
    playerRef.current.rotation.y = rotationY;
    playerRef.current.position.y = -0.2 + posY;
  });

  return (
    <>
    {/* /////////////////////LIGHTING////////////////////////////////////////////////////////////// */}
      {/* <ambientLight intensity={0.8} />
      <directionalLight position={[4, 6, 4]} intensity={1.9} color="#00f3ff" />
      <directionalLight position={[-3, 5, -3]} intensity={0.4} color="#bc13fe" /> */}
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

      {/* //////////////////////////////////////////////////////// */}
      {/* Player scaled up to 2.0 for better visibility */}
      {/* <group ref={playerRef} position={[-0.5, 1.2, 0]}> */}
      <group
        ref={playerRef}
        position={[-0.5, 1.2, 0]}
        rotation={[0, Math.PI, 0]} // 🔥 makes player face front
      >
        <PlayerModel scale={3.0} />
      </group>

      <ContactShadows
        position={[0, -1.41, 0]}
        opacity={0.25}
        scale={8}
        blur={2}
        far={5}
      />
    </>
  );
}

/* ─── CatchCanvas wrapper: reads section scroll and passes as number ───── */
function CatchCanvas({ sectionRef }) {
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => setProgress(v));
    return unsub;
  }, [scrollYProgress]);

  return (
    <Canvas
      camera={{ position: [0, 1.5, 4.5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <CatchScene sectionProgress={progress} />
      </Suspense>
    </Canvas>
  );
}

/* ─── About Section ─────────────────────────────────────────────────────── */
export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="about" className="py-24 relative z-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6" ref={ref}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — 3D Catch Player (replaces static image) */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] h-[400px]">
              <CatchCanvas sectionRef={ref} />
            </div>
            {/* Decorative glows */}
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#00f3ff]/10 rounded-full blur-[80px]" />
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#bc13fe]/10 rounded-full blur-[60px]" />
          </motion.div>

          {/* Right — Text */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
          >
            <p className="text-[#00f3ff] font-medium tracking-widest uppercase text-sm mb-3">About Us</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Built by Cricket Lovers,{' '}
              <span className="bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] bg-clip-text text-transparent">
                For Cricket Lovers
              </span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              CricArena was born out of a passion for cricket and a frustration with outdated management tools.
              We set out to create a platform that combines the thrill of the game with cutting-edge technology — 
              delivering real-time insights, seamless management, and an experience that matches the intensity of cricket itself.
            </p>

            <ul className="space-y-3">
              {features.map((feature, i) => (
                <motion.li
                  key={feature}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-center gap-3 text-gray-300"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


