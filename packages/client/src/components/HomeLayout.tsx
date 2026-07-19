import { useEffect, useRef, type ReactNode } from 'react';
import { Background } from './Background';
import { MongolianCloud } from './MongolianCloud';

export function GlobalSVGDefs() {
  return (
    <svg className="pointer-events-none absolute h-0 w-0" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="handDrawn" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="0.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter id="paperTexture" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="3" result="noise" />
          <feDiffuseLighting in="noise" lightingColor="#f5e6d3" surfaceScale="1.2" result="light">
            <feDistantLight azimuth="45" elevation="65" />
          </feDiffuseLighting>
          <feBlend mode="multiply" in="SourceGraphic" in2="light" />
        </filter>
      </defs>
    </svg>
  );
}

function EmberParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (
      typeof (globalThis as any).process !== 'undefined' &&
      (globalThis as any).process.env?.NODE_ENV === 'test'
    ) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    class Particle {
      x = Math.random() * width;
      y = height + Math.random() * 20;
      size = Math.random() * 1.6 + 0.5;
      speedY = -(Math.random() * 0.9 + 0.25);
      speedX = Math.random() * 0.3 - 0.15;
      alpha = Math.random() * 0.45 + 0.2;
      decay = Math.random() * 0.0028 + 0.0012;
      color = 'rgba(218, 170, 61,';

      update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y / 28) * 0.12;
        this.alpha -= this.decay;

        if (this.alpha <= 0 || this.y < -10) {
          this.x = Math.random() * width;
          this.y = height + Math.random() * 20;
          this.alpha = Math.random() * 0.45 + 0.2;
          this.size = Math.random() * 1.6 + 0.5;
          this.speedY = -(Math.random() * 0.9 + 0.25);
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.globalAlpha = this.alpha;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = this.color + this.alpha + ')';
        c.shadowColor = 'rgba(202, 138, 4, 0.35)';
        c.shadowBlur = this.size * 2.5;
        c.fill();
        c.restore();
      }
    }

    const particles = Array.from({ length: 24 }, () => new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });
      animationFrameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-5 h-full w-full opacity-45"
    />
  );
}

export function HomeLayout({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative min-h-full w-full overflow-hidden">
      <GlobalSVGDefs />
      <Background />
      <EmberParticles />
      <MongolianCloud className="absolute right-[-30px] top-[-30px] w-56 h-56 opacity-25 select-none pointer-events-none" />
      <MongolianCloud
        className="absolute left-[-30px] bottom-[-30px] w-56 h-56 opacity-25 select-none pointer-events-none"
        flip
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(202,138,4,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.05),transparent_32%)]" />
      <div
        className={`relative z-10 flex min-h-full w-full items-center justify-center ${className}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}
