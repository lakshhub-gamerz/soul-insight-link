import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const StarfieldBackground = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create starfield
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      
      // Random positions in a sphere
      const radius = Math.random() * 1000 + 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Mix of blue, purple, and white stars
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        // Blue stars (outer world)
        colors[i3] = 0.4;
        colors[i3 + 1] = 0.7;
        colors[i3 + 2] = 1.0;
      } else if (colorChoice < 0.6) {
        // Purple stars (inner world)
        colors[i3] = 0.8;
        colors[i3 + 1] = 0.4;
        colors[i3 + 2] = 1.0;
      } else {
        // White stars
        colors[i3] = 1.0;
        colors[i3 + 1] = 1.0;
        colors[i3 + 2] = 1.0;
      }

      sizes[i] = Math.random() * 2 + 0.5;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starsMaterial = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    starsRef.current = stars;

    // Create floating particles (closer, slower)
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      particlePositions[i3] = (Math.random() - 0.5) * 50;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 50;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 30 - 10;

      // Glowing particles with cosmic colors
      const colorChoice = Math.random();
      if (colorChoice < 0.5) {
        // Cyan glow
        particleColors[i3] = 0.3;
        particleColors[i3 + 1] = 0.9;
        particleColors[i3 + 2] = 1.0;
      } else {
        // Purple/pink glow
        particleColors[i3] = 1.0;
        particleColors[i3 + 1] = 0.4;
        particleColors[i3 + 2] = 0.9;
      }

      particleSizes[i] = Math.random() * 4 + 2;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 4,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // Mouse move handler for parallax
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Rotate stars slowly
      if (starsRef.current) {
        starsRef.current.rotation.y += 0.0002;
        starsRef.current.rotation.x += 0.0001;
      }

      // Animate floating particles
      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.001;
        
        // Gentle floating motion
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          positions[i3 + 1] += Math.sin(time + i) * 0.01;
        }
        
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Parallax camera movement based on mouse
      if (cameraRef.current) {
        const targetX = mouseRef.current.x * 2;
        const targetY = mouseRef.current.y * 2;
        
        cameraRef.current.position.x += (targetX - cameraRef.current.position.x) * 0.02;
        cameraRef.current.position.y += (targetY - cameraRef.current.position.y) * 0.02;
        
        cameraRef.current.lookAt(scene.position);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 -z-10"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default StarfieldBackground;
