// Helper for wrapped angle & distance on toroidal map (8192 x 8192)
function getWrappedAngle(fromX, fromY, toX, toY, mapSize = 8192) {
  let dx = toX - fromX;
  let dy = toY - fromY;
  if (dx > mapSize / 2) dx -= mapSize;
  if (dx < -mapSize / 2) dx += mapSize;
  if (dy > mapSize / 2) dy -= mapSize;
  if (dy < -mapSize / 2) dy += mapSize;
  return Math.atan2(dy, dx);
}

function getWrappedDist(x1, y1, x2, y2, mapSize = 8192) {
  let dx = Math.abs(x1 - x2);
  let dy = Math.abs(y1 - y2);
  if (dx > mapSize / 2) dx = mapSize - dx;
  if (dy > mapSize / 2) dy = mapSize - dy;
  return Math.hypot(dx, dy);
}

// 1. Enemy Factory Class
class Factory {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = 90;
    this.height = 90;
    this.hp = 180;
    this.maxHp = 180;
    this.isDestroyed = false;

    this.smokeTimer = 0;
    this.spawnTimer = 0;
  }

  takeDamage(amount) {
    if (this.isDestroyed) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.isDestroyed = true;
      return true; // Just destroyed
    }
    return false;
  }

  update(dt, particleSystem) {
    if (this.isDestroyed) {
      // Continuous charred smoke
      this.smokeTimer += dt;
      if (this.smokeTimer >= 0.15) {
        particleSystem.addSmoke(this.x + (Math.random() * 40 - 20), this.y + (Math.random() * 40 - 20), 'rgba(30, 41, 59, 0.8)', 14);
        this.smokeTimer = 0;
      }
      return;
    }

    // Working Factory Smoke
    this.smokeTimer += dt;
    if (this.smokeTimer >= 0.4) {
      particleSystem.addSmoke(this.x - 15, this.y - 25, 'rgba(148, 163, 184, 0.6)', 10);
      particleSystem.addSmoke(this.x + 15, this.y - 25, 'rgba(148, 163, 184, 0.6)', 10);
      this.smokeTimer = 0;
    }
  }

  render(ctx, camera) {
    if (!camera.isVisible(this.x, this.y, 150)) return;

    const pos = camera.getScreenPos(this.x, this.y);
    const screenX = pos.x;
    const screenY = pos.y;

    ctx.save();
    ctx.translate(screenX, screenY);

    if (this.isDestroyed) {
      // Charred Destroyed Factory Ruins
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

      // Debris & Cracks
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(-10, 5, 18, 0, Math.PI * 2);
      ctx.arc(15, -10, 14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Intact Enemy Factory Complex
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

      // Main Building Roof (Red Industrial Accents)
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-30, -30, 60, 60);

      // Smokestacks
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(-18, -20, 8, 0, Math.PI * 2);
      ctx.arc(18, -20, 8, 0, Math.PI * 2);
      ctx.fill();

      // Factory Insignia Star/Symbol
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏭', 0, 10);

      // Health Bar above factory
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-35, -55, 70, 8);
      ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(-35, -55, 70 * hpRatio, 8);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(-35, -55, 70, 8);
    }

    ctx.restore();
  }
}

// 2. Anti-Air Turret Class
class Turret {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.range = 500;
    this.hp = 60;
    this.maxHp = 60;
    this.isDestroyed = false;
    this.fireCooldown = 0;
    this.fireRate = 1.4; // sec per shell
  }

  update(dt, targetHeli, bulletsArray, audioEngine) {
    if (this.isDestroyed) return;

    this.fireCooldown -= dt;

    if (targetHeli && targetHeli.state !== 'LANDED') {
      const dist = getWrappedDist(this.x, this.y, targetHeli.x, targetHeli.y);
      if (dist <= this.range) {
        // Track target
        this.angle = getWrappedAngle(this.x, this.y, targetHeli.x, targetHeli.y);

        // Fire Flak Shell
        if (this.fireCooldown <= 0) {
          this.fireCooldown = this.fireRate;
          bulletsArray.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(this.angle) * 360,
            vy: Math.sin(this.angle) * 360,
            life: 1.5,
            isEnemy: true
          });
        }
      }
    }
  }

  render(ctx, camera) {
    if (this.isDestroyed || !camera.isVisible(this.x, this.y, 80)) return;

    const pos = camera.getScreenPos(this.x, this.y);
    const screenX = pos.x;
    const screenY = pos.y;

    ctx.save();
    ctx.translate(screenX, screenY);

    // Base Pit
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotating Barrel
    ctx.rotate(this.angle);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, -3, 22, 6);

    ctx.restore();
  }
}

// 3. Anti-Air Homing Missile Class
class Missile {
  constructor(x, y, target) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.heading = getWrappedAngle(x, y, target.x, target.y);
    this.speed = 340;
    this.turnRate = 2.2; // Rad/s homing
    this.life = 5.0; // Max flight time
    this.isDestroyed = false;
  }

  update(dt, particleSystem) {
    if (this.isDestroyed) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.isDestroyed = true;
      particleSystem.addExplosion(this.x, this.y, 15, 10);
      return;
    }

    // Homing trajectory steering towards target
    if (this.target) {
      const targetAngle = getWrappedAngle(this.x, this.y, this.target.x, this.target.y);
      let angleDiff = targetAngle - this.heading;

      // Normalize angle
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      this.heading += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate * dt);
    }

    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;

    // Wrap missile on map boundary
    if (this.x < 0) this.x += 8192;
    if (this.x >= 8192) this.x -= 8192;
    if (this.y < 0) this.y += 8192;
    if (this.y >= 8192) this.y -= 8192;

    // Smoke trail
    particleSystem.addSmoke(this.x, this.y, 'rgba(241, 245, 249, 0.7)', 6);
  }

  render(ctx, camera) {
    if (this.isDestroyed || !camera.isVisible(this.x, this.y, 50)) return;

    const pos = camera.getScreenPos(this.x, this.y);
    const screenX = pos.x;
    const screenY = pos.y;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.heading);

    // Red Missile Body
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-10, -3, 16, 6);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(6, -3);
    ctx.lineTo(12, 0);
    ctx.lineTo(6, 3);
    ctx.fill();

    ctx.restore();
  }
}

// 4. Enemy Fighter Jet Class
class FighterJet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.heading = Math.random() * Math.PI * 2;
    this.speed = 360;
    this.hp = 50;
    this.maxHp = 50;
    this.isDestroyed = false;
    this.fireCooldown = 0;
  }

  update(dt, targetHeli, carrier, bulletsArray, particleSystem) {
    if (this.isDestroyed) return;

    // Select active target: Heli or Carrier
    const target = (targetHeli && targetHeli.state !== 'LANDED' && Math.random() > 0.4) ? targetHeli : carrier;

    if (target) {
      const targetAngle = getWrappedAngle(this.x, this.y, target.x, target.y);
      let angleDiff = targetAngle - this.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.heading += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 1.5 * dt);
    }

    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;

    // Wrap jet position on map boundary
    if (this.x < 0) this.x += 8192;
    if (this.x >= 8192) this.x -= 8192;
    if (this.y < 0) this.y += 8192;
    if (this.y >= 8192) this.y -= 8192;

    // Fire machine gun at target
    this.fireCooldown -= dt;
    if (target && getWrappedDist(this.x, this.y, target.x, target.y) < 450 && this.fireCooldown <= 0) {
      this.fireCooldown = 0.8;
      bulletsArray.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(this.heading) * 550,
        vy: Math.sin(this.heading) * 550,
        life: 1.2,
        isEnemy: true
      });
    }

    particleSystem.addSmoke(this.x - Math.cos(this.heading) * 15, this.y - Math.sin(this.heading) * 15, 'rgba(203, 213, 225, 0.4)', 4);
  }

  render(ctx, camera) {
    if (this.isDestroyed || !camera.isVisible(this.x, this.y, 60)) return;

    const pos = camera.getScreenPos(this.x, this.y);
    const screenX = pos.x;
    const screenY = pos.y;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.heading);

    // Jet Vector Graphic (Red/Grey Delta Wing)
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-14, -14);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-14, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

// 5. Giant Enemy Battleship (Dreadnought) Class
class Battleship {
  constructor(x, y, targetCarrier) {
    this.x = x;
    this.y = y;
    this.targetCarrier = targetCarrier;
    this.heading = getWrappedAngle(x, y, targetCarrier.x, targetCarrier.y);
    this.speed = 45; // Slow giant ship
    this.hp = 500;
    this.maxHp = 500;
    this.isDestroyed = false;

    this.fireTimer = 0;
    this.fireRate = 4.0; // Shell burst every 4 sec
  }

  update(dt, carrier, enemyBullets, particleSystem, camera) {
    if (this.isDestroyed) return;

    // Navigate toward Carrier
    if (carrier && !carrier.isDestroyed) {
      this.heading = getWrappedAngle(this.x, this.y, carrier.x, carrier.y);
      this.x += Math.cos(this.heading) * this.speed * dt;
      this.y += Math.sin(this.heading) * this.speed * dt;

      // Wrap battleship position on map boundary
      if (this.x < 0) this.x += 8192;
      if (this.x >= 8192) this.x -= 8192;
      if (this.y < 0) this.y += 8192;
      if (this.y >= 8192) this.y -= 8192;

      // Heavy Naval Gun Shell Bombardment
      this.fireTimer += dt;
      const distToCarrier = getWrappedDist(this.x, this.y, carrier.x, carrier.y);

      if (distToCarrier < 800 && this.fireTimer >= this.fireRate) {
        this.fireTimer = 0;

        // Fire 3 heavy naval shells
        for (let i = -1; i <= 1; i++) {
          const spread = i * 0.15;
          enemyBullets.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(this.heading + spread) * 320,
            vy: Math.sin(this.heading + spread) * 320,
            life: 2.5,
            isHeavyNavalShell: true,
            isEnemy: true
          });
        }

        if (camera) camera.addShake(15);
      }
    }
  }

  render(ctx, camera) {
    if (this.isDestroyed || !camera.isVisible(this.x, this.y, 250)) return;

    const pos = camera.getScreenPos(this.x, this.y);
    const screenX = pos.x;
    const screenY = pos.y;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.heading);

    // Dark Red Armored Hull
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(100, 0);
    ctx.lineTo(40, -28);
    ctx.lineTo(-90, -25);
    ctx.lineTo(-100, 0);
    ctx.lineTo(-90, 25);
    ctx.lineTo(40, 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin Heavy Gun Turrets
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(30, 0, 14, 0, Math.PI * 2);
    ctx.arc(-30, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Barrels
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(30, -3, 25, 6);
    ctx.fillRect(-30, -3, 25, 6);

    // HP Bar above Battleship
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-50, -45, 100, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-50, -45, 100 * hpRatio, 8);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-50, -45, 100, 8);

    ctx.restore();
  }
}

// 6. Main Enemy Manager Master Controller
class EnemyManager {
  constructor(map, carrier) {
    this.map = map;
    this.carrier = carrier;

    this.factories = [];
    this.turrets = [];
    this.missiles = [];
    this.fighterJets = [];
    this.battleships = [];
    this.enemyBullets = [];

    // System Stats
    this.threatLevel = 1; // 1 to 4
    this.threatProgress = 0; // 0 to 100%
    this.battleshipCountdown = 100; // Countdown until launch (seconds)
    this.battleshipLaunched = false;

    this.initFactoriesAndTurrets();
  }

  initFactoriesAndTurrets() {
    this.map.factoryPositions.forEach((pos, idx) => {
      this.factories.push(new Factory(idx + 1, pos.x, pos.y));

      // Place 2 Turrets per factory site
      this.turrets.push(new Turret(pos.x - 120, pos.y - 120));
      this.turrets.push(new Turret(pos.x + 120, pos.y + 120));
    });
  }

  update(dt, helicopter, audioEngine, particleSystem, camera) {
    // 1. Threat & Countdown Escalation
    this.threatProgress = Math.min(100, this.threatProgress + dt * 0.8);
    if (this.threatProgress >= 75) this.threatLevel = 4;
    else if (this.threatProgress >= 50) this.threatLevel = 3;
    else if (this.threatProgress >= 25) this.threatLevel = 2;

    // Battleship Launch Countdown
    if (!this.battleshipLaunched) {
      this.battleshipCountdown = Math.max(0, this.battleshipCountdown - dt * (1 + (4 - this.getRemainingFactoriesCount()) * 0.5));

      if (this.battleshipCountdown <= 0) {
        this.battleshipLaunched = true;
        // Spawn Battleship in sea near Island 4 (east ocean)
        this.battleships.push(new Battleship(7000, 4000, this.carrier));
        if (audioEngine) audioEngine.playSirenAlarm();
      }
    }

    // 2. Update Factories
    this.factories.forEach(f => f.update(dt, particleSystem));

    // 3. Update Turrets
    this.turrets.forEach(t => t.update(dt, helicopter, this.enemyBullets, audioEngine));

    // 4. Factory Spawning (Fighter Jets & Missiles based on Threat Level)
    if (this.threatLevel >= 2 && Math.random() < 0.005) {
      // Spawn Homing Missile near active factory
      const activeFactories = this.factories.filter(f => !f.isDestroyed);
      if (activeFactories.length > 0 && helicopter.state !== 'LANDED') {
        const randFactory = activeFactories[Math.floor(Math.random() * activeFactories.length)];
        if (getWrappedDist(randFactory.x, randFactory.y, helicopter.x, helicopter.y) < 800) {
          this.missiles.push(new Missile(randFactory.x, randFactory.y, helicopter));
        }
      }
    }

    if (this.threatLevel >= 3 && this.fighterJets.length < 3 && Math.random() < 0.008) {
      // Spawn Fighter Jet from runway
      const activeFactories = this.factories.filter(f => !f.isDestroyed);
      if (activeFactories.length > 0) {
        const randFactory = activeFactories[Math.floor(Math.random() * activeFactories.length)];
        this.fighterJets.push(new FighterJet(randFactory.x, randFactory.y));
      }
    }

    // 5. Update Missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.update(dt, particleSystem);

      // Check collision with Helicopter
      if (helicopter && helicopter.state !== 'LANDED') {
        if (getWrappedDist(m.x, m.y, helicopter.x, helicopter.y) < 22) {
          helicopter.hp = Math.max(0, helicopter.hp - 25);
          particleSystem.addExplosion(m.x, m.y, 25, 20);
          if (camera) camera.addShake(15);
          if (audioEngine) audioEngine.playExplosionSound();
          m.isDestroyed = true;
        }
      }

      if (m.isDestroyed) this.missiles.splice(i, 1);
    }

    // 6. Update Fighter Jets
    for (let i = this.fighterJets.length - 1; i >= 0; i--) {
      const jet = this.fighterJets[i];
      jet.update(dt, helicopter, this.carrier, this.enemyBullets, particleSystem);
      if (jet.isDestroyed) this.fighterJets.splice(i, 1);
    }

    // 7. Update Battleships
    for (let i = this.battleships.length - 1; i >= 0; i--) {
      const bs = this.battleships[i];
      bs.update(dt, this.carrier, this.enemyBullets, particleSystem, camera);
      if (bs.isDestroyed) this.battleships.splice(i, 1);
    }

    // 8. Update Enemy Bullets & Check Damage vs Helicopter / Carrier
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.x < 0) eb.x += 8192;
      if (eb.x >= 8192) eb.x -= 8192;
      if (eb.y < 0) eb.y += 8192;
      if (eb.y >= 8192) eb.y -= 8192;

      eb.life -= dt;

      // Hit Helicopter
      if (helicopter && helicopter.state !== 'LANDED') {
        if (getWrappedDist(eb.x, eb.y, helicopter.x, helicopter.y) < 18) {
          const damage = eb.isHeavyNavalShell ? 30 : 6;
          helicopter.hp = Math.max(0, helicopter.hp - damage);
          particleSystem.addExplosion(eb.x, eb.y, 10, 5);
          if (camera) camera.addShake(6);
          this.enemyBullets.splice(i, 1);
          continue;
        }
      }

      // Hit Carrier
      if (this.carrier && !this.carrier.isDestroyed) {
        if (getWrappedDist(eb.x, eb.y, this.carrier.x, this.carrier.y) < 100) {
          const damage = eb.isHeavyNavalShell ? 35 : 8;
          this.carrier.hp = Math.max(0, this.carrier.hp - damage);
          particleSystem.addExplosion(eb.x, eb.y, 20, 10);
          if (camera) camera.addShake(12);
          if (this.carrier.hp <= 0) this.carrier.isDestroyed = true;
          this.enemyBullets.splice(i, 1);
          continue;
        }
      }

      if (eb.life <= 0) this.enemyBullets.splice(i, 1);
    }

    // 9. Check Player Weapons vs Enemy Entities (Machine Gun & Bombs)
    this.checkPlayerWeapons(helicopter, particleSystem, audioEngine, camera);
  }

  checkPlayerWeapons(helicopter, particleSystem, audioEngine, camera) {
    // Check Machine Gun Bullets vs Turrets & Fighter Jets & Factories
    helicopter.bullets.forEach((b, bIdx) => {
      // Vs Factories
      this.factories.forEach(f => {
        if (!f.isDestroyed && getWrappedDist(b.x, b.y, f.x, f.y) < 45) {
          f.takeDamage(4);
          particleSystem.addExplosion(b.x, b.y, 8, 4);
          b.life = 0;
        }
      });

      // Vs Turrets
      this.turrets.forEach(t => {
        if (!t.isDestroyed && getWrappedDist(b.x, b.y, t.x, t.y) < 20) {
          t.hp -= 15;
          if (t.hp <= 0) {
            t.isDestroyed = true;
            particleSystem.addExplosion(t.x, t.y, 18, 12);
          }
          b.life = 0;
        }
      });

      // Vs Fighter Jets
      this.fighterJets.forEach(j => {
        if (!j.isDestroyed && getWrappedDist(b.x, b.y, j.x, j.y) < 22) {
          j.hp -= 20;
          if (j.hp <= 0) {
            j.isDestroyed = true;
            particleSystem.addExplosion(j.x, j.y, 22, 15);
          }
          b.life = 0;
        }
      });
    });

    // Check Player Dropped Bombs Impact vs Factories & Battleship
    for (let i = helicopter.droppedBombs.length - 1; i >= 0; i--) {
      const bomb = helicopter.droppedBombs[i];
      if (bomb.progress >= 0.95) { // Ground Impact
        // Vs Factories
        this.factories.forEach(f => {
          if (!f.isDestroyed && getWrappedDist(bomb.x, bomb.y, f.x, f.y) < 65) {
            const destroyed = f.takeDamage(60); // 3 direct bomb hits destroy a factory!
            particleSystem.addExplosion(f.x, f.y, 45, 30);
            if (camera) camera.addShake(20);
            this.threatProgress += 15; // Damaging factory increases threat!
          }
        });

        // Vs Battleships
        this.battleships.forEach(bs => {
          if (!bs.isDestroyed && getWrappedDist(bomb.x, bomb.y, bs.x, bs.y) < 90) {
            bs.hp -= 120;
            particleSystem.addExplosion(bs.x, bs.y, 40, 25);
            if (bs.hp <= 0) {
              bs.isDestroyed = true;
              particleSystem.addExplosion(bs.x, bs.y, 60, 40);
            }
          }
        });
      }
    }
  }

  getRemainingFactoriesCount() {
    return this.factories.filter(f => !f.isDestroyed).length;
  }

  render(ctx, camera) {
    // Render Factories
    this.factories.forEach(f => f.render(ctx, camera));

    // Render Turrets
    this.turrets.forEach(t => t.render(ctx, camera));

    // Render Missiles
    this.missiles.forEach(m => m.render(ctx, camera));

    // Render Fighter Jets
    this.fighterJets.forEach(j => j.render(ctx, camera));

    // Render Battleships
    this.battleships.forEach(bs => bs.render(ctx, camera));

    // Render Enemy Bullets
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    this.enemyBullets.forEach(eb => {
      if (!camera.isVisible(eb.x, eb.y, 40)) return;
      const pos = camera.getScreenPos(eb.x, eb.y);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, eb.isHeavyNavalShell ? 5 : 2.5, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}
