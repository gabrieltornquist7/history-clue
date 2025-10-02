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

    // Create realistic Earth globe
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Create realistic Earth-like material
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a5490, // Ocean blue
      emissive: 0x0a1f3d,
      emissiveIntensity: 0.1,
      shininess: 15,
      specular: 0x333333,
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add continents as darker patches
    const continentMaterial = new THREE.MeshPhongMaterial({
      color: 0x2d5a3d, // Forest green for land
      emissive: 0x1a2f1f,
      emissiveIntensity: 0.2,
    });

    // Create simplified continent shapes
    const createContinent = (lat, lon, size) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      
      const continentGeom = new THREE.SphereGeometry(size, 16, 16);
      const continent = new THREE.Mesh(continentGeom, continentMaterial);
      
      const x = -(1.005 * Math.sin(phi) * Math.cos(theta));
      const y = 1.005 * Math.cos(phi);
      const z = 1.005 * Math.sin(phi) * Math.sin(theta);
      
      continent.position.set(x, y, z);
      continent.lookAt(0, 0, 0);
      globe.add(continent);
    };

    // Add simplified continents
    createContinent(40, -95, 0.25);  // North America
    createContinent(-15, -60, 0.22); // South America
    createContinent(50, 15, 0.28);   // Europe
    createContinent(15, 25, 0.35);   // Africa
    createContinent(45, 85, 0.32);   // Asia
    createContinent(-25, 135, 0.2);  // Australia

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
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Add latitude/longitude grid lines (subtle)
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08,
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

    // Add city lights/markers (small golden dots)
    const dotGeometry = new THREE.SphereGeometry(0.01, 8, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.6,
    });

    // Historical locations
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
      
      const x = -(1.015 * Math.sin(phi) * Math.cos(theta));
      const y = 1.015 * Math.cos(phi);
      const z = 1.015 * Math.sin(phi) * Math.sin(theta);
      
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(x, y, z);
      globe.add(dot);
    });

    // Add stars in background
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      transparent: true,
      opacity: 0.8,
    });

    const starVertices = [];
    for (let i = 0; i < 1000; i++) {
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

    // Realistic lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Sun-like directional light
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // Subtle fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0x6699ff, 0.3);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);

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
        opacity: 0.4,
      }}
    />
  );
}
