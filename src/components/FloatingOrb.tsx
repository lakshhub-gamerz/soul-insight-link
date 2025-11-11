import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";

interface FloatingOrbProps {
  emotion?: "calm" | "joy" | "focus" | "sad" | "grateful" | "neutral";
}

const emotionColors: Record<string, string> = {
  calm: "#4A90E2",
  joy: "#FFD36A",
  focus: "#8AFFEE",
  sad: "#9353FF",
  grateful: "#FF7AF5",
  neutral: "#999999",
};

export default function FloatingOrb({ emotion = "neutral" }: FloatingOrbProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    const size = 300;
    renderer.setSize(size, size);
    mountRef.current.appendChild(renderer.domElement);

    // Create glowing sphere
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: emotionColors[emotion],
      emissive: emotionColors[emotion],
      emissiveIntensity: 0.5,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphereRef.current = sphere;
    scene.add(sphere);

    // Add glow effect with point light
    const light = new THREE.PointLight(emotionColors[emotion], 2, 10);
    light.position.set(0, 0, 0);
    scene.add(light);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Add particles around the sphere
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 2 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: emotionColors[emotion],
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    camera.position.z = 4;

    // Animation
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;

      // Rotate sphere slowly
      sphere.rotation.y += 0.003;
      sphere.rotation.x += 0.001;

      // Breathing effect
      const scale = 1 + Math.sin(time) * 0.05;
      sphere.scale.set(scale, scale, scale);

      // Rotate particles
      particles.rotation.y += 0.002;
      particles.rotation.x += 0.001;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update colors when emotion changes
  useEffect(() => {
    if (sphereRef.current && sceneRef.current) {
      const sphere = sphereRef.current;
      const material = sphere.material as THREE.MeshPhongMaterial;
      const newColor = new THREE.Color(emotionColors[emotion]);
      
      material.color.set(newColor);
      material.emissive.set(newColor);
      
      // Update light color
      const light = sceneRef.current.children.find(
        (child) => child instanceof THREE.PointLight
      ) as THREE.PointLight;
      if (light) {
        light.color.set(newColor);
      }
      
      // Update particles color
      const particles = sceneRef.current.children.find(
        (child) => child instanceof THREE.Points
      ) as THREE.Points;
      if (particles) {
        const particlesMaterial = particles.material as THREE.PointsMaterial;
        particlesMaterial.color.set(newColor);
      }
    }
  }, [emotion]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="relative"
    >
      <div ref={mountRef} className="rounded-full overflow-hidden" />
    </motion.div>
  );
}
