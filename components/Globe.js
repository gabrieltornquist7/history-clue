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

    // Create main globe with rich shader
    const geometry = new THREE.SphereGeometry(1, 128, 128);
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // Improved noise functions
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        
        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        void main() {
          // Create landmass-like patterns
          vec2 noiseCoord = vUv * 8.0;
          float landPattern = fbm(noiseCoord + time * 0.0001);
          
          // Ocean and land colors
          vec3 deepOcean = vec3(0.05, 0.15, 0.35);
          vec3 shallowOcean = vec3(0.1, 0.3, 0.5);
          vec3 coastline = vec3(0.15, 0.4, 0.55);
          vec3 land = vec3(0.2, 0.35, 0.25);
          vec3 mountains = vec3(0.25, 0.25, 0.2);
          
          // Create terrain
          float terrain = landPattern;
          vec3 baseColor;
          
          if (terrain < 0.35) {
            baseColor = mix(deepOcean, shallowOcean, terrain / 0.35);
          } else if (terrain < 0.45) {
            baseColor = mix(shallowOcean, coastline, (terrain - 0.35) / 0.1);
          } else if (terrain < 0.6) {
            baseColor = mix(coastline, land, (terrain - 0.45) / 0.15);
          } else {
            baseColor = mix(land, mountains, (terrain - 0.6) / 0.4);
          }
          
          // Add subtle animated clouds
          float cloudPattern = fbm(vUv * 12.0 + time * 0.0002);
          vec3 clouds = vec3(1.0) * smoothstep(0.6, 0.8, cloudPattern) * 0.3;
          baseColor += clouds;
          
          // Add polar ice caps
          float latitude = abs(vUv.y - 0.5) * 2.0;
          if (latitude > 0.85) {
            float iceMix = (latitude - 0.85) / 0.15;
            baseColor = mix(baseColor, vec3(0.9, 0.95, 1.0), iceMix * 0.7);
          }
          
          // Lighting
          vec3 lightDir = normalize(vec3(1.0, 0.5, 1.0));
          float diffuse = max(dot(vNormal, lightDir), 0.0);
          float ambient = 0.4;
          float lighting = ambient + diffuse * 0.6;
          
          // Rim lighting
          float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          rim = pow(rim, 3.0) * 0.3;
          
          // Specular highlight (water reflection)
          vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
          vec3 reflectDir = reflect(-lightDir, vNormal);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0);
          if (terrain > 0.45) spec = 0.0; // Only on water
          
          vec3 finalColor = baseColor * lighting + vec3(rim) + vec3(spec * 0.4);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Atmospheric glow - only on sides, not front
    const atmosphereGeometry = new THREE.SphereGeometry(1.15, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          // Only show atmosphere on the sides and back, not the front
          float frontFacing = vPosition.z;
          if (frontFacing > -0.2) discard; // Remove front-facing atmosphere
          
          float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 0.9, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Add orbital rings for sci-fi effect
    const ringGeometry = new THREE.TorusGeometry(1.3, 0.002, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.3,
    });
    
    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.rotation.x = Math.PI / 2;
    ring1.rotation.z = Math.PI / 6;
    scene.add(ring1);
    
    const ring2 = new THREE.Mesh(ringGeometry, ringMaterial.clone());
    ring2.rotation.x = Math.PI / 2;
    ring2.rotation.z = -Math.PI / 6;
    scene.add(ring2);

    // Historical sites
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

    // Convert lat/lon to 3D position
    const latLonToVector3 = (lat, lon, radius) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    };

    // Create pin markers (similar to game pins)
    const pinMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.9,
    });

    historicalSites.forEach((site) => {
      const pos = latLonToVector3(site.lat, site.lon, 1.0);
      
      // Create pin shape
      const pinGroup = new THREE.Group();
      
      // Pin head (sphere)
      const headGeometry = new THREE.SphereGeometry(0.015, 8, 8);
      const head = new THREE.Mesh(headGeometry, pinMaterial);
      head.position.y = 0.025;
      pinGroup.add(head);
      
      // Pin body (cone/cylinder)
      const bodyGeometry = new THREE.CylinderGeometry(0.003, 0.003, 0.025, 8);
      const body = new THREE.Mesh(bodyGeometry, pinMaterial);
      body.position.y = 0.0125;
      pinGroup.add(body);
      
      // Pin point (small cone)
      const pointGeometry = new THREE.ConeGeometry(0.005, 0.01, 8);
      const point = new THREE.Mesh(pointGeometry, pinMaterial);
      point.position.y = 0;
      point.rotation.x = Math.PI;
      pinGroup.add(point);
      
      // Position pin on globe
      pinGroup.position.copy(pos);
      pinGroup.lookAt(0, 0, 0);
      pinGroup.rotateX(Math.PI);
      
      globe.add(pinGroup);
      
      // Add subtle glow around pin
      const glowGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.15,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(pos);
      globe.add(glow);
    });

    // Enhanced star field with different sizes
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starSizes = [];
    
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starVertices.push(x, y, z);
      starSizes.push(Math.random() * 2 + 0.5);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying float vSize;
        void main() {
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying float vSize;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - (dist * 2.0);
          float twinkle = sin(time * vSize * 2.0) * 0.3 + 0.7;
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * twinkle);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.5);
    rimLight.position.set(-3, 1, -3);
    scene.add(rimLight);

    // Animation
    let time = 0;
    const rotationSpeed = 0.0004;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      time += 0.01;
      material.uniforms.time.value = time;
      starMaterial.uniforms.time.value = time;
      
      // Rotate globe and elements
      globe.rotation.y += rotationSpeed;
      atmosphere.rotation.y += rotationSpeed * 0.95;
      ring1.rotation.z += rotationSpeed * 0.5;
      ring2.rotation.z -= rotationSpeed * 0.5;
      stars.rotation.y += rotationSpeed * 0.05;
      stars.rotation.x += rotationSpeed * 0.02;
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
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
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 1,
        opacity: 0.5,
      }}
    />
  );
}
