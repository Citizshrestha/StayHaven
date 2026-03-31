import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Canvas-based Sparkline Component
 * Optimized rendering for performance vs SVG
 */
const Sparkline = ({ data, color, height = 32, width = null }) => {
  const canvasRef = useRef(null);
  const dprRef = useRef(window.devicePixelRatio || 1);
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !Array.isArray(data) || data.length < 2) return;
    
    const parent = canvas.parentElement;
    const parentWidth = width || parent?.clientWidth || 100;
    const dpr = dprRef.current;
    
    // Set canvas size with DPR for crisp rendering
    canvas.width = Math.max(1, Math.floor(parentWidth * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${parentWidth}px`;
    canvas.style.height = `${height}px`;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Reset transform and scale for DPR
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, parentWidth, height);
    
    // Calculate data range
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const padding = 2;
    const chartHeight = height - padding * 2;
    
    // Generate points
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * parentWidth,
      y: height - padding - ((v - min) / range) * chartHeight,
    }));
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${color}33`); // 20% opacity
    gradient.addColorStop(1, `${color}00`); // 0% opacity
    
    // Draw area under line
    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Draw dots at peaks and valleys for emphasis
    ctx.fillStyle = color;
    points.forEach((p, i) => {
      if (i === 0 || i === points.length - 1 || data[i] === max || data[i] === min) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [data, color, height, width]);
  
  useEffect(() => {
    draw();
    
    const handleResize = () => {
      requestAnimationFrame(draw);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Redraw when visible (tab switch)
    const handleVisibility = () => {
      if (!document.hidden) draw();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [draw]);
  
  return (
    <div className="sh-kpi-sparkline" style={{ width: '100%', height }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export default Sparkline;
