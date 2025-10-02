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
    camera.position.z = 2.5;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Create globe with gradient
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Use shader material for a nice gradient effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0x1a4d7a) }, // Deep ocean blue
        color2: { value: new THREE.Color(0x0d2847) }, // Darker blue
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          // Create subtle gradient
          vec3 color = mix(color1, color2, vUv.y);
          
          // Add some variation for depth
          float noise = sin(vUv.x * 50.0) * cos(vUv.y * 50.0) * 0.02;
          color += noise;
          
          // Lighting calculation
          vec3 light = normalize(vec3(1.0, 0.5, 1.0));
          float dProd = max(0.0, dot(vNormal, light));
          
          gl_FragColor = vec4(color * (0.5 + dProd * 0.5), 1.0);
        }
      `,
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add subtle atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(1.08, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.4, 0.7, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Add latitude/longitude grid lines (very subtle)
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
    });

    // Latitude lines
    for (let i = 1; i < 9; i++) {
      const lat = (i / 9) * Math.PI - Math.PI / 2;
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

    // Add small golden dots for historical cities
    const dotGeometry = new THREE.SphereGeometry(0.008, 8, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.8,
    });

    // Historical locations
    const historicalSites = [
      { lat: 51.5074, lon: -0.1278 },   // London
      { lat: 41.9028, lon: 12.4964 },   // Rome
      { lat: 37.9838, lon: 23.7275 },   // Athens
      { lat: 30.0444, lon: 31.2357 },   // Cairo
      { lat: 39.9042, lon: 116.4074 },  // Beijing
      { lat: 35.6762, lon: 139.6503 },  // Tokyo
      { lat: 28.6139, lon: 77.2090 },   // Delhi
      { lat: 19.4326, lon: -99.1332 },  // Mexico City
      { lat: 40.7128, lon: -74.0060 },  // New York
      { lat: -23.5505, lon: -46.6333 }, // Sao Paulo
    ];

    historicalSites.forEach(site => {
      const phi = (90 - site.lat) * (Math.PI / 180);
      const theta = (site.lon + 180) * (Math.PI / 180);
      
      const x = -(1.015 * Math.sin(phi) * Math.cos(theta));
      const y = 1.015 * Math.cos(phi);
      const z = 1.015 * Math.sin(phi) * Math.sin(theta);
      
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(x, y, z);
      globe.add(dot);

      // Add a subtle glow around each dot
      const glowGeometry = new THREE.SphereGeometry(0.015, 8, 8);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.15,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(x, y, z);
      globe.add(glow);
    });

    // Add stars in background
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
    });

    const starVertices = [];
    for (let i = 0; i < 800; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starVertices, 3)
    );

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Animation
    const rotationSpeed = 0.0003;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      globe.rotation.y += rotationSpeed;
      atmosphere.rotation.y += rotationSpeed * 0.95;
      stars.rotation.y += rotationSpeed * 0.05;
      
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
      starGeometry.dispose();
      starMaterial.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 1,
        opacity: 0.35,
      }}
    />
  );
}
