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

    // Optimized settings for better performance
    const settings = {
      spacing: 40, // Slightly increased for fewer particles
      amplitude: 25, // Optimized amplitude
      scaleX: 120,
      scaleZ: 140,
      focalLength: 450,
      depth: 720,
    };

    let centerX = 0;
    let centerY = 0;
    const points = [];

    const buildGrid = () => {
      points.length = 0;
      const cols = Math.ceil(width / settings.spacing) + 3; // Reduced for performance
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
      centerY = height * 0.85;
      settings.depth = height * 0.85 + 180;
      buildGrid();
    };

    // Optimized 3D-to-2D projection
    const projectPoint = (x, y, z) => {
      const zDistance = Math.max(z + 50, 1);
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
      time += 0.005; // Slightly slower for smoother performance

      const freqX = 1 / settings.scaleX;
      const freqZ = 1 / settings.scaleZ;
      const freqMix = 1 / 200;
      const ampPrimary = settings.amplitude;
      const ampSecondary = settings.amplitude * 0.6;
      const ampTertiary = settings.amplitude * 0.35;

      // Performance optimization: batch similar operations
      const visiblePoints = [];
      
      points.forEach((point) => {
        // Calculate wave height
        const wavePrimary = Math.sin(point.x * freqX + time) * ampPrimary;
        const waveSecondary = Math.sin(point.z * freqZ + time * 0.9) * ampSecondary;
        const waveTertiary =
          Math.sin((point.x + point.z) * freqMix + time * 1.1 + point.phase) *
          ampTertiary;

        const depthFactor = 1 - (point.z / settings.depth);
        const foregroundBoost = Math.pow(depthFactor, 2) * 1.3;
        const y = (wavePrimary + waveSecondary + waveTertiary) * (1 + foregroundBoost);

        const projection = projectPoint(point.x, y, point.z);

        // Early culling for performance
        if (projection.y < height * 0.5 ||
            projection.x < -30 ||
            projection.x > width + 30 ||
            projection.y < -30 ||
            projection.y > height + 30) {
          return;
        }

        const normalizedZ = point.z / settings.depth;
        
        visiblePoints.push({
          x: projection.x,
          y: projection.y,
          normalizedZ,
          size: normalizedZ < 0.2 
            ? 5 + Math.random() * 2
            : normalizedZ < 0.5
            ? 2.5 + (1 - (normalizedZ - 0.2) / 0.3) * 2.5
            : 0.5 + (1 - (normalizedZ - 0.5) / 0.5) * 2,
          opacity: normalizedZ < 0.2
            ? 0.75 + Math.random() * 0.05
            : normalizedZ < 0.5
            ? 0.4 + (1 - (normalizedZ - 0.2) / 0.3) * 0.35
            : 0.1 + (1 - (normalizedZ - 0.5) / 0.5) * 0.3
        });
      });

      // Batch render all visible points
      visiblePoints.forEach(point => {
        if (point.normalizedZ < 0.3) {
          ctx.shadowBlur = 5;
          ctx.shadowColor = `rgba(235, 242, 255, ${point.opacity * 0.4})`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = `rgba(235, 242, 255, ${point.opacity})`;
        ctx.fillRect(point.x - point.size / 2, point.y - point.size / 2, point.size, point.size);
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
        // Performance optimization
        willChange: "transform",
        transform: "translateZ(0)",
      }}
    />
  );
};

export default AnimatedWaveBackground;
