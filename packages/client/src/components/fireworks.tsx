import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FF69B4', '#FFA500', '#7B68EE'];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

/** Lightweight canvas fireworks animation for special hands (Lieng/Sap) */
export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    let animId: number;
    let burstCount = 0;
    const maxBursts = 8;

    function burst(cx: number, cy: number) {
      const count = 30 + Math.floor(Math.random() * 20);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + randomBetween(-0.2, 0.2);
        const speed = randomBetween(2, 6);
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: randomBetween(40, 70),
          color,
          size: randomBetween(1.5, 3),
        });
      }
    }

    // Launch bursts over time
    const burstInterval = setInterval(() => {
      if (burstCount >= maxBursts) { clearInterval(burstInterval); return; }
      burst(
        randomBetween(canvas.width * 0.2, canvas.width * 0.8),
        randomBetween(canvas.height * 0.15, canvas.height * 0.5),
      );
      burstCount++;
    }, 400);

    // Initial burst
    burst(canvas.width / 2, canvas.height * 0.3);
    burstCount++;

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.vx *= 0.98; // drag
        p.life--;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const alpha = Math.min(1, p.life / 20);
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(burstInterval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[60]"
    />
  );
}
