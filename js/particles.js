class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  addExplosion(x, y, radius = 25, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * radius * 4;
      const size = Math.random() * (radius * 0.4) + 4;
      const life = Math.random() * 0.4 + 0.3;

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        life: life,
        maxLife: life,
        color: i % 2 === 0 ? '#f97316' : (i % 3 === 0 ? '#ef4444' : '#fef08a'),
        type: 'explosion'
      });
    }

    // Add Smoke
    for (let i = 0; i < count / 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * radius * 1.5;
      const life = Math.random() * 0.8 + 0.5;

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15, // Rise up
        size: Math.random() * 12 + 8,
        life: life,
        maxLife: life,
        color: 'rgba(71, 85, 105, 0.7)',
        type: 'smoke'
      });
    }
  }

  addSmoke(x, y, color = 'rgba(100, 116, 139, 0.5)', size = 8) {
    this.particles.push({
      x: x + (Math.random() * 10 - 5),
      y: y + (Math.random() * 10 - 5),
      vx: (Math.random() * 2 - 1) * 10,
      vy: -Math.random() * 25 - 10, // Smoke rises
      size: size,
      life: Math.random() * 0.6 + 0.4,
      maxLife: 1.0,
      color: color,
      type: 'smoke'
    });
  }

  addWaterSplash(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 50 + 10;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        life: 0.4,
        maxLife: 0.4,
        color: '#7dd3fc',
        type: 'splash'
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wrap particles on map boundary
      if (p.x < 0) p.x += 8192;
      if (p.x >= 8192) p.x -= 8192;
      if (p.y < 0) p.y += 8192;
      if (p.y >= 8192) p.y -= 8192;

      p.life -= dt;

      if (p.type === 'smoke') {
        p.size += dt * 8; // Smoke expands
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx, camera) {
    this.particles.forEach(p => {
      if (!camera.isVisible(p.x, p.y, 50)) return;

      const pos = camera.getScreenPos(p.x, p.y);
      const alpha = Math.max(0, p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(1, p.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
