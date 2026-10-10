class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.radarCanvas = document.getElementById('radarCanvas');
    this.radarCtx = this.radarCanvas.getContext('2d');

    // System Modules
    this.audioEngine = new SoundEngine();
    this.input = new InputHandler();
    this.map = new WorldMap(128, 128, 64);
    this.camera = new Camera(1000, 700, this.map.width, this.map.height);
    this.particleSystem = new ParticleSystem();

    // Entities (Carrier at Map Center: 4096, 4096)
    this.carrier = new Carrier(4096, 4096);
    this.helicopter = new PlayerHelicopter(4096, 4146);
    this.enemyManager = new EnemyManager(this.map, this.carrier);

    // Game Loop & State
    this.lastTime = performance.now();
    this.gameTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.isVictory = false;

    // DOM Elements
    this.startOverlay = document.getElementById('start-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.endOverlay = document.getElementById('end-overlay');

    this.endTitle = document.getElementById('end-title');
    this.endSubtitle = document.getElementById('end-subtitle');
    this.endStats = document.getElementById('end-stats');

    this.btnStart = document.getElementById('btn-start');
    this.btnRestart = document.getElementById('btn-restart');

    this.hudState = document.getElementById('hud-state');
    this.hudHpText = document.getElementById('hud-hp-text');
    this.hpBarFill = document.getElementById('hp-bar-fill');

    this.hudCarrierHpText = document.getElementById('hud-carrier-hp-text');
    this.carrierHpBarFill = document.getElementById('carrier-hp-bar-fill');

    this.hudFactories = document.getElementById('hud-factories');
    this.hudBombs = document.getElementById('hud-bombs');

    this.hudThreatLevel = document.getElementById('hud-threat-level');
    this.hudBattleshipTimer = document.getElementById('hud-battleship-timer');
    this.audioIndicator = document.getElementById('audio-indicator');

    this.initEvents();
    this.handleResize();

    // Start main loop right away for overlay inputs & gamepads
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initEvents() {
    window.addEventListener('resize', () => this.handleResize());

    const startGame = () => {
      if (this.isRunning) return;
      this.audioEngine.init();
      this.startOverlay.classList.add('hidden');
      this.audioIndicator.textContent = "AUDIO: ON";
      this.isRunning = true;
      this.lastTime = performance.now();
    };

    const restartGame = () => {
      location.reload();
    };

    this.btnStart.addEventListener('click', startGame);
    this.btnRestart.addEventListener('click', restartGame);

    // Space key Start & Restart support
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        if (!this.startOverlay.classList.contains('hidden')) {
          startGame();
        } else if (!this.endOverlay.classList.contains('hidden')) {
          restartGame();
        }
      }
    });
  }

  togglePause() {
    if (!this.isRunning || this.isGameOver || this.isVictory) return;
    this.isPaused = !this.isPaused;
    if (this.pauseOverlay) {
      this.pauseOverlay.classList.toggle('hidden', !this.isPaused);
    }
  }

  handleResize() {
    const wrapper = document.getElementById('canvas-wrapper');
    this.canvas.width = wrapper.clientWidth;
    this.canvas.height = wrapper.clientHeight;
    this.camera.resize(this.canvas.width, this.canvas.height);
  }

  gameLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // Poll Gamepads every frame
    this.input.pollGamepad();

    // Handle Pause toggle key / button
    if (this.input.consumeJustPressed('pause')) {
      if (this.isRunning && !this.isGameOver && !this.isVictory) {
        this.togglePause();
      }
    }

    // Handle Start / Retry Gamepad buttons
    if (this.input.consumeJustPressed('start')) {
      if (!this.startOverlay.classList.contains('hidden')) {
        this.btnStart.click();
      } else if (!this.endOverlay.classList.contains('hidden')) {
        this.btnRestart.click();
      }
    }

    if (this.isRunning) {
      if (!this.isPaused && !this.isGameOver && !this.isVictory) {
        this.gameTime += dt;
        this.update(dt);
      }
      this.render();
    } else {
      // Idle background render while on start overlay
      this.map.update(dt);
      this.render();
    }

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    // 1. Audio Mute toggle
    if (this.input.consumeJustPressed('mute')) {
      const isMuted = this.audioEngine.toggleMute();
      this.audioIndicator.textContent = isMuted ? "AUDIO: MUTED" : "AUDIO: ON";
    }

    // 2. Map Animation
    this.map.update(dt);

    // 3. Carrier Update & Landing/Refuel Deck Check
    this.carrier.update(dt, this.helicopter, this.audioEngine);

    // 4. Helicopter Inertia & Control Update
    this.helicopter.update(dt, this.input, this.carrier, this.audioEngine, this.camera);

    // 5. Enemy AI Manager Update
    this.enemyManager.update(dt, this.helicopter, this.audioEngine, this.particleSystem, this.camera);

    // 6. Particle System Update
    this.particleSystem.update(dt);

    // 7. Camera Target Follow
    this.camera.follow(this.helicopter.x, this.helicopter.y);

    // 8. Check Game Over / Victory Conditions
    this.checkWinLossState();

    // 9. Update HUD UI & Radar
    this.updateHUD();
    this.renderRadarMinimap();
  }

  checkWinLossState() {
    // Victory: All 6 Factories Destroyed!
    if (this.enemyManager.getRemainingFactoriesCount() === 0) {
      this.isVictory = true;
      this.audioEngine.playVictoryFanfare();
      this.showEndModal(true);
      return;
    }

    // Defeat: Helicopter Destroyed or Carrier Destroyed!
    if (this.helicopter.hp <= 0 || this.carrier.isDestroyed) {
      this.isGameOver = true;
      this.particleSystem.addExplosion(this.helicopter.x, this.helicopter.y, 50, 40);
      this.audioEngine.playExplosionSound();
      this.showEndModal(false);
    }
  }

  showEndModal(isVictory) {
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60).toString().padStart(2, '0');
    const timeStr = `${minutes}:${seconds}`;

    if (isVictory) {
      this.endTitle.textContent = "MISSION VICTORY!";
      this.endTitle.style.color = "#4ade80";
      this.endSubtitle.textContent = "ALL 6 ENEMY FACTORIES DESTROYED";
    } else {
      this.endTitle.textContent = "GAME OVER";
      this.endTitle.style.color = "#ef4444";
      this.endSubtitle.textContent = this.carrier.isDestroyed ? "AIRCRAFT CARRIER SANK!" : "HELICOPTER DESTROYED!";
    }

    this.endStats.textContent = `MISSION TIME: ${timeStr} | FACTORIES DESTROYED: ${6 - this.enemyManager.getRemainingFactoriesCount()}/6`;
    this.endOverlay.classList.remove('hidden');
  }

  updateHUD() {
    // Flight State Label
    const stateStr = this.helicopter.state;
    this.hudState.textContent = stateStr;
    this.hudState.className = 'hud-value status-' + stateStr.toLowerCase();

    // Helicopter HP Bar
    const hpPercent = Math.max(0, Math.round((this.helicopter.hp / this.helicopter.maxHp) * 100));
    this.hudHpText.textContent = `${hpPercent}%`;
    this.hpBarFill.style.width = `${hpPercent}%`;

    // Carrier HP Bar
    const carrierHpPercent = Math.max(0, Math.round((this.carrier.hp / this.carrier.maxHp) * 100));
    this.hudCarrierHpText.textContent = `${carrierHpPercent}%`;
    this.carrierHpBarFill.style.width = `${carrierHpPercent}%`;

    // Factories Status
    const destroyedCount = 6 - this.enemyManager.getRemainingFactoriesCount();
    this.hudFactories.textContent = `${destroyedCount} / 6 DESTROYED`;

    // Bombs
    this.hudBombs.textContent = `💣 ${this.helicopter.bombs} / ${this.helicopter.maxBombs}`;

    // Threat Level
    const lvl = this.enemyManager.threatLevel;
    this.hudThreatLevel.textContent = `LV.${lvl} ${lvl === 4 ? 'CRITICAL' : lvl === 3 ? 'HIGH' : lvl === 2 ? 'ALERT' : 'NORMAL'}`;
    this.hudThreatLevel.className = `hud-value threat-${lvl}`;

    // Battleship Timer
    if (this.enemyManager.battleshipLaunched) {
      this.hudBattleshipTimer.textContent = "DEPLOYED!";
      this.hudBattleshipTimer.style.color = "#ef4444";
    } else {
      const sec = Math.ceil(this.enemyManager.battleshipCountdown);
      this.hudBattleshipTimer.textContent = `${sec}s`;
    }
  }

  renderRadarMinimap() {
    const rw = this.radarCanvas.width;
    const rh = this.radarCanvas.height;
    const mapW = this.map.width;
    const mapH = this.map.height;

    // Clear Radar
    this.radarCtx.fillStyle = '#0f172a';
    this.radarCtx.fillRect(0, 0, rw, rh);

    const scaleX = rw / mapW;
    const scaleY = rh / mapH;

    // 1. Draw Island Blips
    this.radarCtx.fillStyle = '#166534';
    for (let r = 0; r < this.map.rows; r += 4) {
      for (let c = 0; c < this.map.cols; c += 4) {
        if (this.map.grid[r * this.map.cols + c] === this.map.TILE_GRASS) {
          this.radarCtx.fillRect(c * 64 * scaleX, r * 64 * scaleY, 3, 3);
        }
      }
    }

    // 2. Draw Enemy Factories (Red square blips)
    this.enemyManager.factories.forEach(f => {
      this.radarCtx.fillStyle = f.isDestroyed ? '#475569' : '#ef4444';
      this.radarCtx.fillRect(f.x * scaleX - 3, f.y * scaleY - 3, 6, 6);
    });

    // 3. Draw Carrier (Blue square blip)
    if (!this.carrier.isDestroyed) {
      this.radarCtx.fillStyle = '#38bdf8';
      this.radarCtx.fillRect(this.carrier.x * scaleX - 3, this.carrier.y * scaleY - 3, 6, 6);
    }

    // 4. Draw Enemy Battleships (Purple blips)
    this.enemyManager.battleships.forEach(bs => {
      if (!bs.isDestroyed) {
        this.radarCtx.fillStyle = '#a855f7';
        this.radarCtx.fillRect(bs.x * scaleX - 3, bs.y * scaleY - 3, 6, 6);
      }
    });

    // 5. Draw Player Helicopter (Cyan pulsing dot)
    this.radarCtx.fillStyle = '#4ade80';
    this.radarCtx.beginPath();
    this.radarCtx.arc(this.helicopter.x * scaleX, this.helicopter.y * scaleY, 4, 0, Math.PI * 2);
    this.radarCtx.fill();
  }

  render() {
    // Clear main canvas
    this.ctx.fillStyle = '#0b2545';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Render World Map Tiles
    this.map.render(this.ctx, this.camera);

    // 2. Render Carrier Base
    this.carrier.render(this.ctx, this.camera);

    // 3. Render Enemy Manager Entities (Factories, Turrets, Missiles, Fighter Jets, Battleships)
    this.enemyManager.render(this.ctx, this.camera);

    // 4. Render Particle System (Explosions, Smoke, Trails)
    this.particleSystem.render(this.ctx, this.camera);

    // 5. Render Helicopter (Shadow, Fuselage, Rotors, Weapons)
    if (!this.isGameOver) {
      this.helicopter.render(this.ctx, this.camera);
    }

    // 6. On-Screen Touchdown Zone Guide Marker (if flying near carrier)
    this.renderLandingGuide();

    // 7. Render Low Health Danger Warning Overlay
    this.renderDangerOverlay();
  }

  renderDangerOverlay() {
    if (!this.helicopter || this.helicopter.hp <= 0) return;
    const hpRatio = this.helicopter.hp / this.helicopter.maxHp;

    if (hpRatio <= 0.20) {
      const pos = this.camera.getScreenPos(this.helicopter.x, this.helicopter.y);
      const dangerY = Math.max(90, pos.y - 110); // Positioned between helicopter and top of screen

      // Flash on/off pulse
      if (Math.floor(Date.now() / 250) % 2 === 0) {
        this.ctx.save();
        this.ctx.font = 'bold 16px "Press Start 2P", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ef4444';
        this.ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
        this.ctx.shadowBlur = 16;
        this.ctx.fillText('⚠️ DANGER! LOW ARMOR ⚠️', pos.x, dangerY);
        this.ctx.restore();
      }
    }
  }

  renderLandingGuide() {
    const pad = this.carrier.getHelipadWorldPos();
    const pos = this.camera.getScreenPos(pad.x, pad.y);
    const dist = Math.hypot(pos.x - this.camera.viewportWidth / 2, pos.y - this.camera.viewportHeight / 2);

    if (dist < 400 && this.helicopter.state === 'FLYING' && !this.carrier.isDestroyed) {
      const screenX = pos.x;
      const screenY = pos.y;

      this.ctx.save();
      this.ctx.strokeStyle = '#4ade80';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 6]);
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 65, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.fillStyle = '#4ade80';
      this.ctx.font = '11px "Press Start 2P", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('CARRIER TOUCHDOWN ZONE', screenX, screenY - 75);
      this.ctx.restore();
    }
  }
}

// Instantiate game on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new Game();
});
