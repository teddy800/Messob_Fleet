import { useEffect, useRef } from "react";

const AnimatedWaveBackground = ({ className = "" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId = 0;
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;
    let time = 0;

    const settings = {
      spacing: 35, // Increased spacing = fewer particles
      amplitude: 28, // Reduced amplitude to keep waves lower
      scaleX: 120,
      scaleZ: 140,
      focalLength: 450, // Camera focal length for 3D-to-2D projection
      depth: 720,
    };

    let centerX = 0;
    let centerY = 0;
    const points = [];

    const buildGrid = () => {
      points.length = 0;
      const cols = Math.ceil(width / settings.spacing) + 4; // Reduced from +6
      const rows = Math.ceil(settings.depth / settings.spacing);
      const xStart = -((cols - 1) * settings.spacing) / 2;

      for (let zIndex = 0; zIndex < rows; zIndex += 1) {
        const z = zIndex * settings.spacing;
        for (let xIndex = 0; xIndex < cols; xIndex += 1) {
          points.push({
            x: xStart + xIndex * settings.spacing,
            z,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      centerX = width / 2;
      centerY = height * 0.85; // Position horizon lower to keep waves in bottom half
      settings.depth = height * 0.85 + 180;
      buildGrid();
    };

    // 3D-to-2D Camera Projection with proper perspective
    const projectPoint = (x, y, z) => {
      // Ensure z is always positive and add minimum distance to prevent division by zero
      const zDistance = Math.max(z + 50, 1);
      // True 3D-to-2D projection: x' = (x / z) * focalLength + centerX
      const projectedX = (x / zDistance) * settings.focalLength + centerX;
      const projectedY = (y / zDistance) * settings.focalLength + centerY;
      return {
        x: projectedX,
        y: projectedY,
        z: zDistance,
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.006; // Reduced from 0.012 for slower motion

      const freqX = 1 / settings.scaleX;
      const freqZ = 1 / settings.scaleZ;
      const freqMix = 1 / 200;
      const ampPrimary = settings.amplitude;
      const ampSecondary = settings.amplitude * 0.6; // Reduced secondary wave
      const ampTertiary = settings.amplitude * 0.35; // Reduced tertiary wave

      points.forEach((point) => {
        // Calculate wave height with multiple frequencies
        const wavePrimary = Math.sin(point.x * freqX + time) * ampPrimary;
        const waveSecondary = Math.sin(point.z * freqZ + time * 0.9) * ampSecondary;
        const waveTertiary =
          Math.sin((point.x + point.z) * freqMix + time * 1.1 + point.phase) *
          ampTertiary;

        // Z-Buffer Logic: Increase vertical dispersion for foreground particles
        const depthFactor = 1 - (point.z / settings.depth);
        const foregroundBoost = Math.pow(depthFactor, 2) * 1.5; // Reduced from 2.5
        const y = (wavePrimary + waveSecondary + waveTertiary) * (1 + foregroundBoost);

        // Apply 3D-to-2D projection
        const projection = projectPoint(point.x, y, point.z);

        // Skip particles that would appear above the center line
        if (projection.y < height * 0.5) {
          return;
        }

        // Dynamic Scaling & Opacity based on Z-depth
        const normalizedZ = point.z / settings.depth;

        // Foreground particles (low z): 6-8px, opacity 0.85
        // Background particles (high z): 0.5px, opacity 0.1
        const size = normalizedZ < 0.2 
          ? 6 + Math.random() * 2  // Foreground: 6-8px (reduced from 8-10px)
          : normalizedZ < 0.5
          ? 3 + (1 - (normalizedZ - 0.2) / 0.3) * 3  // Mid-range: 3-6px
          : 0.5 + (1 - (normalizedZ - 0.5) / 0.5) * 2.5;  // Background: 0.5-3px

        const opacity = normalizedZ < 0.2
          ? 0.8 + Math.random() * 0.05  // Foreground: 0.8-0.85
          : normalizedZ < 0.5
          ? 0.45 + (1 - (normalizedZ - 0.2) / 0.3) * 0.35  // Mid-range: 0.45-0.8
          : 0.1 + (1 - (normalizedZ - 0.5) / 0.5) * 0.35;  // Background: 0.1-0.45

        // Cull particles outside viewport
        if (
          projection.x < -20 ||
          projection.x > width + 20 ||
          projection.y < -20 ||
          projection.y > height + 20
        ) {
          return;
        }

        // Render particle with subtle glow effect for foreground
        if (normalizedZ < 0.3) {
          // Add subtle glow for foreground particles
          ctx.shadowBlur = 6; // Reduced from 8
          ctx.shadowColor = `rgba(235, 242, 255, ${opacity * 0.5})`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = `rgba(235, 242, 255, ${opacity})`;
        ctx.fillRect(projection.x - size / 2, projection.y - size / 2, size, size);
      });

      animationId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
};

export default AnimatedWaveBackground;
