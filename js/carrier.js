class Carrier {
  constructor(x = 4096, y = 4096) {
    this.x = x;
    this.y = y;
    this.width = 160;
    this.height = 300;
    this.heading = -Math.PI / 2; // Pointing North (upwards)

    this.hp = 500;
    this.maxHp = 500;
    this.isDestroyed = false;

    // Helipad Landing Zone Center Offset (relative to carrier x, y)
    this.helipadOffset = { x: 0, y: 50 };
    this.wakeTimer = 0;
  }

  getHelipadWorldPos() {
    return {
      x: this.x + this.helipadOffset.x,
      y: this.y + this.helipadOffset.y
    };
  }

  isHelicopterOverDeck(heli) {
    // Toroidal map distance check
    const mapSize = 8192;
    let dx = Math.abs(heli.x - this.x);
    let dy = Math.abs(heli.y - this.y);
    if (dx > mapSize / 2) dx = mapSize - dx;
    if (dy > mapSize / 2) dy = mapSize - dy;

    // Generous bounding box covering the aircraft carrier flight deck
    return dx <= 85 && dy <= 165;
  }

  update(dt, heli, audioEngine) {
    if (this.isDestroyed) return;
    this.wakeTimer += dt * 3;

    // Carrier sails North at 60 px/sec (300px = 1 carrier length in 5 seconds)
    const carrierSpeed = 60;
    this.y -= carrierSpeed * dt;

    // Wrap carrier position at map boundary (8192 x 8192)
    const mapSize = 8192;
    if (this.y < 0) this.y += mapSize;
    if (this.y >= mapSize) this.y -= mapSize;

    // If helicopter is LANDED or LANDING on carrier deck, move helicopter with carrier
    if (heli && (heli.state === 'LANDED' || heli.state === 'LANDING') && this.isHelicopterOverDeck(heli)) {
      heli.y -= carrierSpeed * dt;
      if (heli.y < 0) heli.y += mapSize;
      if (heli.y >= mapSize) heli.y -= mapSize;
    }
  }

  render(ctx, camera) {
    if (!camera.isVisible(this.x, this.y, 250)) return;

    const screenPos = camera.getScreenPos(this.x, this.y);
    const screenX = screenPos.x;
    const screenY = screenPos.y;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.heading);

    // 1. Water Wake Trails
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-this.width / 2 - 10, this.height / 2 + 10);
    ctx.lineTo(-this.width / 2 - 30, this.height / 2 + 60);
    ctx.moveTo(this.width / 2 + 10, this.height / 2 + 10);
    ctx.lineTo(this.width / 2 + 30, this.height / 2 + 60);
    ctx.stroke();

    // 2. Carrier Hull (Dark Steel)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Bow (pointed top)
    ctx.moveTo(0, -this.height / 2 - 25);
    ctx.lineTo(this.width / 2, -this.height / 2 + 20);
    ctx.lineTo(this.width / 2, this.height / 2);
    ctx.lineTo(-this.width / 2, this.height / 2);
    ctx.lineTo(-this.width / 2, -this.height / 2 + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Flight Deck (Grey Asphalt)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2 - 15);
    ctx.lineTo(this.width / 2 - 8, -this.height / 2 + 25);
    ctx.lineTo(this.width / 2 - 8, this.height / 2 - 10);
    ctx.lineTo(-this.width / 2 + 8, this.height / 2 - 10);
    ctx.lineTo(-this.width / 2 + 8, -this.height / 2 + 25);
    ctx.closePath();
    ctx.fill();

    // 4. Yellow Runway Line Markings
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2 + 15);
    ctx.lineTo(0, this.height / 2 - 20);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 5. Helipad Landing Target ("H" Circle)
    const padY = -this.helipadOffset.y; // rotated coordinates
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, padY, 50, 0, Math.PI * 2);
    ctx.stroke();

    // "H" Letter
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 0, padY);

    // 6. Island Superstructure / Control Tower (Right side of deck)
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(this.width / 2 - 32, -40, 24, 80);
    ctx.strokeRect(this.width / 2 - 32, -40, 24, 80);

    // Radar Mast
    ctx.strokeStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(this.width / 2 - 20, 0);
    ctx.lineTo(this.width / 2 - 20, -60);
    ctx.stroke();

    ctx.restore();
  }
}
