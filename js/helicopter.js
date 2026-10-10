class PlayerHelicopter {
  constructor(x = 4096, y = 4146) {
    this.x = x;
    this.y = y;
    this.heading = -Math.PI / 2; // Pointing North/Up
    this.vx = 0;
    this.vy = 0;
    this.angularVelocity = 0;
    this.speed = 0;

    // Flight Dynamics Constants
    this.maxTurnSpeed = Math.PI; // 1 rotation per 2 seconds (180 deg/sec)
    this.turnAccel = 18.0;       // Torque acceleration
    this.turnDamping = 0.88;     // Torque damping
    this.thrustPower = 1260;     // 1.5x thrust acceleration (was 840)
    this.drag = 0.982;
    this.maxSpeed = 1140;        // 1.5x max velocity (was 760)

    // Altitude & Landing System
    this.altitude = 0; // 0.0 (Landed) to 1.0 (Cruising Altitude)
    this.state = 'LANDED'; // LANDED, TAKEOFF, FLYING, LANDING
    this.carrierStopTimer = 0; // Timer tracking time stopped on carrier deck
    this.hasRefueled = false;

    // Stats & Weapons
    this.hp = 100;
    this.maxHp = 100;
    this.bombs = 9;
    this.maxBombs = 9;

    // Weapons Cooldown
    this.gunCooldown = 0;
    this.gunFireRate = 0.08; // 80ms per bullet
    this.bullets = [];
    this.droppedBombs = [];

    // Animations
    this.rotorAngle = 0;
    this.tailRotorAngle = 0;
  }

  update(dt, input, carrier, audioEngine, camera) {
    const overCarrier = carrier && carrier.isHelicopterOverDeck(this);

    // 1. Handle Landing Detection over Carrier (ONLY when FLYING and pressing DOWN/S key)
    if (overCarrier && this.state === 'FLYING' && input.keys.down) {
      this.state = 'LANDING';
    }

    // 2. State Machine Transitions (Takeoff / Landing / Landed)
    if (this.state === 'LANDED') {
      this.vx = 0;
      this.vy = 0;
      this.angularVelocity = 0;
      this.altitude = 0;

      if (overCarrier) {
        this.carrierStopTimer += dt;
        if (this.carrierStopTimer >= 1.0) {
          // Refuel & Repair HP and Bombs after 1 second stopped!
          if (!this.hasRefueled || this.hp < this.maxHp || this.bombs < this.maxBombs) {
            this.hp = this.maxHp;
            this.bombs = this.maxBombs;
            this.hasRefueled = true;
            if (audioEngine) audioEngine.playRefuelChime();
          }
        }
      } else {
        this.carrierStopTimer = 0;
        this.hasRefueled = false;
      }

      // Press Up/Thrust (W / ArrowUp) to Take off
      if (input.keys.up) {
        this.state = 'TAKEOFF';
        this.carrierStopTimer = 0;
        this.hasRefueled = false;
      }
    } else if (this.state === 'TAKEOFF') {
      this.carrierStopTimer = 0;
      this.hasRefueled = false;
      this.altitude = Math.min(1.0, this.altitude + dt * 2.0);
      if (this.altitude >= 1.0) {
        this.state = 'FLYING';
      }
    } else if (this.state === 'LANDING') {
      this.carrierStopTimer = 0;
      this.hasRefueled = false;
      this.altitude = Math.max(0.0, this.altitude - dt * 2.0);
      this.vx *= 0.88;
      this.vy *= 0.88;
      if (this.altitude <= 0.0) {
        this.state = 'LANDED';
      }
    }

    // 3. Calculate Main Rotor Rotation Speed
    let currentRotorSpeed = 35;
    if (this.state === 'LANDED') {
      if (overCarrier) {
        // Rotor decelerates to 0 over 1 second, then completely STOPS!
        currentRotorSpeed = Math.max(0, 35 * (1.0 - Math.min(1.0, this.carrierStopTimer)));
      } else {
        currentRotorSpeed = 0;
      }
    } else if (this.state === 'LANDING') {
      currentRotorSpeed = 35 * (0.3 + 0.7 * this.altitude);
    }

    this.rotorAngle += dt * currentRotorSpeed;
    this.tailRotorAngle += dt * currentRotorSpeed * 1.5;

    // 4. RC Inertia Flight Mechanics (FLYING & TAKEOFF)
    if (this.state === 'FLYING' || this.state === 'TAKEOFF') {
      // Rotation Torque
      if (input.keys.left) {
        this.angularVelocity -= this.turnAccel * dt;
      }
      if (input.keys.right) {
        this.angularVelocity += this.turnAccel * dt;
      }

      // Clamp max turn speed to Math.PI (1 rotation per 2 seconds = 180 deg/sec)
      if (Math.abs(this.angularVelocity) > this.maxTurnSpeed) {
        this.angularVelocity = Math.sign(this.angularVelocity) * this.maxTurnSpeed;
      }

      if (!input.keys.left && !input.keys.right) {
        this.angularVelocity *= 0.82;
      }

      this.heading += this.angularVelocity * dt;

      // Forward Thrust
      if (input.keys.up) {
        const ax = Math.cos(this.heading) * this.thrustPower;
        const ay = Math.sin(this.heading) * this.thrustPower;
        this.vx += ax * dt;
        this.vy += ay * dt;
      }

      // Reverse / Brake
      if (input.keys.down) {
        if (overCarrier) {
          this.state = 'LANDING';
        } else {
          this.vx *= 0.95;
          this.vy *= 0.95;
        }
      }

      // Linear Drag & Velocity Cap
      this.vx *= this.drag;
      this.vy *= this.drag;

      this.speed = Math.hypot(this.vx, this.vy);
      if (this.speed > this.maxSpeed) {
        this.vx = (this.vx / this.speed) * this.maxSpeed;
        this.vy = (this.vy / this.speed) * this.maxSpeed;
      }

      // Position Update
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Toroidal Map Boundary Wrap-Around (8192 x 8192)
      const mapSize = 8192;
      if (this.x < 0) this.x += mapSize;
      if (this.x >= mapSize) this.x -= mapSize;
      if (this.y < 0) this.y += mapSize;
      if (this.y >= mapSize) this.y -= mapSize;
    }

    // Update Rotor Audio Pitch
    if (audioEngine) {
      const speedRatio = this.speed / this.maxSpeed;
      audioEngine.updateRotorSound(speedRatio, currentRotorSpeed > 0);
    }

    // 5. Fire Machine Gun
    this.gunCooldown -= dt;
    if (input.keys.fire && this.gunCooldown <= 0 && this.state !== 'LANDED') {
      this.fireMachineGun(audioEngine);
      this.gunCooldown = this.gunFireRate;
    }

    // 6. Drop Bomb
    if (input.consumeJustPressed('bomb') && this.bombs > 0 && this.state === 'FLYING') {
      this.dropBomb(audioEngine);
    }

    // 7. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < 0) b.x += 8192;
      if (b.x >= 8192) b.x -= 8192;
      if (b.y < 0) b.y += 8192;
      if (b.y >= 8192) b.y -= 8192;
      if (b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }

    // 8. Update Dropped Bombs
    for (let i = this.droppedBombs.length - 1; i >= 0; i--) {
      const bomb = this.droppedBombs[i];
      bomb.progress += dt * 1.5; // Free-fall time
      bomb.x += bomb.vx * dt * 0.4;
      bomb.y += bomb.vy * dt * 0.4;
      if (bomb.x < 0) bomb.x += 8192;
      if (bomb.x >= 8192) bomb.x -= 8192;
      if (bomb.y < 0) bomb.y += 8192;
      if (bomb.y >= 8192) bomb.y -= 8192;

      if (bomb.progress >= 1.0) {
        // Impact explosion!
        if (audioEngine) audioEngine.playExplosionSound();
        if (camera) camera.addShake(12);
        this.droppedBombs.splice(i, 1);
      }
    }
  }

  fireMachineGun(audioEngine) {
    const muzzleOffset = 28;
    const bulletSpeed = 2200;

    const bx = this.x + Math.cos(this.heading) * muzzleOffset;
    const by = this.y + Math.sin(this.heading) * muzzleOffset;

    // Slight spread angle
    const spread = (Math.random() * 2 - 1) * 0.05;
    const bAngle = this.heading + spread;

    this.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(bAngle) * bulletSpeed + this.vx * 0.3,
      vy: Math.sin(bAngle) * bulletSpeed + this.vy * 0.3,
      life: 0.6
    });

    if (audioEngine) audioEngine.playGunSound();
  }

  dropBomb(audioEngine) {
    this.bombs--;

    this.droppedBombs.push({
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      progress: 0.0 // 0 = dropped, 1 = impact on ground
    });

    if (audioEngine) audioEngine.playBombReleaseSound();
  }

  render(ctx, camera) {
    const screenPos = camera.getScreenPos(this.x, this.y);
    const screenX = screenPos.x;
    const screenY = screenPos.y;

    // 1. Render Dropped Bombs in Air
    this.droppedBombs.forEach(b => {
      const bPos = camera.getScreenPos(b.x, b.y);
      const scale = 1.0 - b.progress * 0.4; // shrinks as it falls
      ctx.save();
      ctx.translate(bPos.x, bPos.y);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 2. Render Bullets
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    this.bullets.forEach(b => {
      const bPos = camera.getScreenPos(b.x, b.y);
      ctx.beginPath();
      ctx.moveTo(bPos.x, bPos.y);
      ctx.lineTo(bPos.x - b.vx * 0.02, bPos.y - b.vy * 0.02);
      ctx.stroke();
    });

    // 3. Render Helicopter Shadow
    if (this.altitude > 0.05) {
      const shadowDistance = 25 * this.altitude;
      const shadowX = screenX + shadowDistance;
      const shadowY = screenY + shadowDistance;

      ctx.save();
      ctx.translate(shadowX, shadowY);
      ctx.rotate(this.heading);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Render Helicopter Body
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.heading);

    // Fuselage (Dark Olive Green / Camo JGSDF Spec)
    ctx.fillStyle = '#1e3a8a'; // Navy Blue / Tactical Accent
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;

    // Main Body Capsule
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Windshield Canopy Gloss
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.ellipse(10, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail Boom
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-35, -3, 20, 6);

    // Tail Rotor Fin & Blade
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-38, -8, 4, 16);

    // Calculate current rotor speed for disk rendering opacity
    let currentRotorSpeed = 35;
    if (this.state === 'LANDED') {
      currentRotorSpeed = Math.max(0, 35 * (1.0 - Math.min(1.0, this.carrierStopTimer)));
    } else if (this.state === 'LANDING') {
      currentRotorSpeed = 35 * (0.3 + 0.7 * this.altitude);
    }

    // 5. Main Rotor Rendering (2 physical blades + 4-blade spinning blur effect)
    ctx.save();
    ctx.rotate(this.rotorAngle);

    // If spinning fast, draw rotor disk & perpendicular ghost blades (4-blade blur effect)
    if (currentRotorSpeed > 5) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();

      // Translucent perpendicular phantom blades (gives 4-blade spinning blur effect)
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-36, 0);
      ctx.lineTo(36, 0);
      ctx.stroke();
    }

    // 2 Primary Physical Rotor Blades
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(0, 36);
    ctx.stroke();

    // Yellow safety tips on primary blades
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-2, -36, 4, 6);
    ctx.fillRect(-2, 30, 4, 6);

    // Center Rotor Hub Cap
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }
}
