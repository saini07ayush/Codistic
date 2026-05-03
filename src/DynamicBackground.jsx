import React, { useEffect, useRef } from 'react';

const SYMBOLS = [
  "{", "}", "(", ")", "=>", "</>", "||", "&&", "==", "[]", ";",
  "function", "const", "let", "return", "class", "import", "def", "if", "else", "await", "async", "public", "void", "printf", "System.out.println", "count", "i++"
];

export default function DynamicBackground({ wpm, accent }) {
  const canvasRef = useRef(null);

  // Need to smoothly interpolate display WPM to avoid harsh jumping
  const displayWpm = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Spawn 80 particles
    const P_COUNT = 80;
    for (let i = 0; i < P_COUNT; i++) {
      particles.push(createParticle(canvas));
    }

    function createParticle(cvs, resetTop = false) {
      return {
        x: Math.random() * cvs.width,
        y: resetTop ? -50 : Math.random() * cvs.height,
        text: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        size: Math.random() * 14 + 10,
        baseSpeed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.2 + 0.05
      };
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smooth interpolation for speed multiplier
      displayWpm.current += (wpm - displayWpm.current) * 0.05;
      const speedMulti = 1 + (displayWpm.current / 15);

      particles.forEach((p) => {
        p.y += p.baseSpeed * speedMulti;

        ctx.font = `${p.size}px 'JetBrains Mono', monospace`;
        // ensure hex handles opacity properly
        const safeAccent = accent.length === 7 ? accent : "#A855F7";
        const hexAlpha = Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = `${safeAccent}${hexAlpha}`;
        ctx.fillText(p.text, p.x, p.y);

        if (p.y > canvas.height + 50) {
          Object.assign(p, createParticle(canvas, true));
          p.x = Math.random() * canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [wpm, accent]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.8
      }}
    />
  );
}
