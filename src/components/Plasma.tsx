import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface PlasmaProps {
  color?: string;
  darkMode?: boolean;
  speed?: number;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_color;
  uniform float u_darkmode;
  uniform float u_speed;
  uniform float u_scale;
  uniform vec2 u_mouse;

  varying vec2 vUv;

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;

    float time = u_time * u_speed * 0.3;
    vec2 p = st * u_scale * 2.5;

    // Mouse wave influence
    vec2 mouse = u_mouse / u_resolution.xy;
    mouse.x *= u_resolution.x / u_resolution.y;
    float dist = length(st - mouse);
    float mouseWave = sin(dist * 10.0 - time * 2.5) * exp(-dist * 2.2) * 0.35;

    // Plasma trigonometric synthesis
    float v1 = sin(p.x * 1.4 + time);
    float v2 = sin(p.y * 1.4 + time * 1.2);
    float v3 = sin((p.x + p.y) * 1.1 + time * 0.8);
    
    vec2 center = vec2(sin(time * 0.4) * 0.5 + 0.5, cos(time * 0.3) * 0.5 + 0.5);
    float v4 = sin(length(p - center * 2.2) * 1.8 - time * 1.4);

    float plasmaVal = v1 + v2 + v3 + v4 + mouseWave;

    float pattern = sin(plasmaVal * 1.5) * 0.5 + 0.5;
    float pattern2 = cos(plasmaVal * 2.2 + time) * 0.5 + 0.5;

    // Base background color
    vec3 bgBase = mix(vec3(0.96, 0.97, 0.98), vec3(0.035, 0.035, 0.045), u_darkmode);

    // Accent color and hue shift for rich fluid depth
    vec3 accent = u_color;
    vec3 complement = mix(accent, vec3(accent.g, accent.b, accent.r), 0.35);
    vec3 glowColor = mix(accent, complement, pattern2);

    // Plasma opacity blending
    float intensity = pow(pattern, 1.4) * mix(0.22, 0.45, u_darkmode);

    vec3 finalColor = mix(bgBase, glowColor, intensity);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const Plasma: React.FC<PlasmaProps> = ({
  color = '#f97316',
  darkMode = false,
  speed = 0.6,
  scale = 1.2,
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Setup Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Color conversion
    const threeColor = new THREE.Color(color || '#f97316');

    // Uniforms
    const uniforms = {
      u_resolution: {
        value: new THREE.Vector2(
          container.clientWidth * dpr,
          container.clientHeight * dpr
        ),
      },
      u_time: { value: 0 },
      u_color: { value: new THREE.Vector3(threeColor.r, threeColor.g, threeColor.b) },
      u_darkmode: { value: darkMode ? 1.0 : 0.0 },
      u_speed: { value: speed },
      u_scale: { value: scale },
      u_mouse: { value: new THREE.Vector2(0, 0) },
    };
    uniformsRef.current = uniforms;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse handling
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) * dpr;
      const y = (rect.height - (e.clientY - rect.top)) * dpr;
      uniforms.u_mouse.value.set(x, y);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize handling
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const newDpr = Math.min(window.devicePixelRatio || 1, 2);

      renderer.setPixelRatio(newDpr);
      renderer.setSize(width, height);
      uniforms.u_resolution.value.set(width * newDpr, height * newDpr);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationFrameId: number;
    let startTime = performance.now();

    const animate = (now: number) => {
      uniforms.u_time.value = (now - startTime) / 1000;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // Update uniforms when props change dynamically
  const uniformsRef = useRef<any>(null);

  useEffect(() => {
    // When color changes, update uniform smoothly
    const threeColor = new THREE.Color(color || '#f97316');
    if (uniformsRef.current) {
      uniformsRef.current.u_color.value.set(threeColor.r, threeColor.g, threeColor.b);
      uniformsRef.current.u_darkmode.value = darkMode ? 1.0 : 0.0;
      uniformsRef.current.u_speed.value = speed;
      uniformsRef.current.u_scale.value = scale;
    }
  }, [color, darkMode, speed, scale]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-screen ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
};

export default Plasma;
