"use client";
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Globe() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 3;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Create globe
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Create a more sophisticated material with multiple layers
    const material = new THREE.MeshPhongMaterial({
      color: 0x2a4a6a,
      emissive: 0x112233,
      shininess: 25,
      transparent: true,
      opacity: 0.85,
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(1.15, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Add grid lines for Earth-like appearance
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.3,
    });

    // Latitude lines
    for (let i = 0; i < 9; i++) {
      const lat = (i / 8) * Math.PI - Math.PI / 2;
      const radius = Math.cos(lat);
      const y = Math.sin(lat);
      
      const points = [];
      for (let j = 0; j <= 64; j++) {
        const angle = (j / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(
          radius * Math.cos(angle),
          y,
          radius * Math.sin(angle)
        ));
      }
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeometry, gridMaterial);
      globe.add(line);
    }

    // Longitude lines
    for (let i = 0; i < 16; i++) {
      const points = [];
      const angle = (i / 16) * Math.PI * 2;
      
      for (let j = 0; j <= 32; j++) {
        const lat = (j / 32) * Math.PI - Math.PI / 2;
        const radius = Math.cos(lat);
        const y = Math.sin(lat);
        
        points.push(new THREE.Vector3(
          radius * Math.cos(angle),
          y,
          radius * Math.sin(angle)
        ));
      }
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeometry, gridMaterial);
      globe.add(line);
    }

    // Add some "landmark" dots representing historical locations
    const dotGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.8,
    });

    // Historical locations (lat, lon) - major ancient civilizations
    const historicalSites = [
      { lat: 51.5074, lon: -0.1278 },   // London
      { lat: 41.9028, lon: 12.4964 },   // Rome
      { lat: 37.9838, lon: 23.7275 },   // Athens
      { lat: 30.0444, lon: 31.2357 },   // Cairo
      { lat: 39.9042, lon: 116.4074 },  // Beijing
      { lat: 35.6762, lon: 139.6503 },  // Tokyo
      { lat: 19.0760, lon: 72.8777 },   // Mumbai
      { lat: -22.9068, lon: -43.1729 }, // Rio
      { lat: 40.7128, lon: -74.0060 },  // New York
      { lat: -33.8688, lon: 151.2093 }, // Sydney
    ];

    historicalSites.forEach(site => {
      const phi = (90 - site.lat) * (Math.PI / 180);
      const theta = (site.lon + 180) * (Math.PI / 180);
      
      const x = -(1.01 * Math.sin(phi) * Math.cos(theta));
      const y = 1.01 * Math.cos(phi);
      const z = 1.01 * Math.sin(phi) * Math.sin(theta);
      
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(x, y, z);
      globe.add(dot);

      // Add glow to each dot
      const glowGeometry = new THREE.SphereGeometry(0.025, 8, 8);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0.3,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(x, y, z);
      globe.add(glow);
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Add a subtle rim light from the side
    const rimLight = new THREE.DirectionalLight(0xd4af37, 0.3);
    rimLight.position.set(-5, 0, 2);
    scene.add(rimLight);

    // Animation
    let rotationSpeed = 0.0005;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Slow rotation
      globe.rotation.y += rotationSpeed;
      atmosphere.rotation.y += rotationSpeed * 0.8;
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 1,
        opacity: 0.6,
        filter: 'blur(0.5px)'
      }}
    />
  );
}
