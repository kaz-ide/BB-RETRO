class WorldMap {
  constructor(cols = 128, rows = 128, tileSize = 64) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.width = cols * tileSize;
    this.height = rows * tileSize;

    this.grid = [];
    this.factoryPositions = [];
    this.waveTimer = 0;

    // Tile Type Definitions
    this.TILE_OCEAN = 0;
    this.TILE_SAND = 1;
    this.TILE_GRASS = 2;
    this.TILE_ROCK = 3;
    this.TILE_BASE = 4;
    this.TILE_ROAD = 5;

    this.generateMap();
  }

  generateMap() {
    // Initialize with ocean
    this.grid = new Array(this.cols * this.rows).fill(this.TILE_OCEAN);

    // Helper to get/set tile
    const setTile = (c, r, type) => {
      const nc = ((c % this.cols) + this.cols) % this.cols;
      const nr = ((r % this.rows) + this.rows) % this.rows;
      this.grid[nr * this.cols + nc] = type;
    };

    // Helper to generate circular island blob
    const createIsland = (centerC, centerR, radius, maxDistSq) => {
      for (let r = centerR - radius; r <= centerR + radius; r++) {
        for (let c = centerC - radius; c <= centerC + radius; c++) {
          const distSq = (c - centerC) ** 2 + (r - centerR) ** 2;
          const noise = (Math.sin(c * 0.4) + Math.cos(r * 0.4)) * 4;
          if (distSq + noise <= maxDistSq) {
            if (distSq > maxDistSq * 0.65) {
              setTile(c, r, this.TILE_SAND);
            } else if (distSq > maxDistSq * 0.45) {
              setTile(c, r, this.TILE_GRASS);
            } else {
              setTile(c, r, this.TILE_GRASS);
            }
          }
        }
      }
    };

    // 1. Generate 6 Target Islands scattered around the map
    const islandCenters = [
      { c: 30, r: 25, rad: 22 },
      { c: 98, r: 25, rad: 22 },
      { c: 25, r: 64, rad: 22 },
      { c: 102, r: 64, rad: 22 },
      { c: 32, r: 100, rad: 20 },
      { c: 95, r: 100, rad: 20 }
    ];

    islandCenters.forEach(island => {
      createIsland(island.c, island.r, island.rad, island.rad * island.rad);
    });

    // 2. Clear Open Ocean Corridor for Carrier Northward Navigation (Cols 54 to 74 across ALL rows)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 54; c <= 74; c++) {
        setTile(c, r, this.TILE_OCEAN);
      }
    }

    // 3. Place 6 Enemy Factory Pad Sites & Roads
    this.factoryPositions = [
      { x: 30 * 64, y: 25 * 64 },
      { x: 98 * 64, y: 25 * 64 },
      { x: 25 * 64, y: 64 * 64 },
      { x: 102 * 64, y: 64 * 64 },
      { x: 32 * 64, y: 100 * 64 },
      { x: 95 * 64, y: 100 * 64 }
    ];

    this.factoryPositions.forEach(pos => {
      const fc = Math.floor(pos.x / 64);
      const fr = Math.floor(pos.y / 64);

      // Create base concrete pad around factory
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          setTile(fc + dc, fr + dr, this.TILE_BASE);
        }
      }

      // Add asphalt runway
      for (let dc = -6; dc <= 6; dc++) {
        setTile(fc + dc, fr, this.TILE_ROAD);
      }
    });
  }

  update(dt) {
    this.waveTimer += dt * 2.5;
  }

  render(ctx, camera) {
    const tileSize = this.tileSize;

    const colsToDraw = Math.ceil(camera.viewportWidth / tileSize) + 2;
    const rowsToDraw = Math.ceil(camera.viewportHeight / tileSize) + 2;

    const startCol = Math.floor(camera.getRenderX() / tileSize);
    const startRow = Math.floor(camera.getRenderY() / tileSize);
    const camX = camera.getRenderX();
    const camY = camera.getRenderY();

    // Check if player health is critical (20% or lower)
    const isLowHealth = window.gameApp && window.gameApp.helicopter && (window.gameApp.helicopter.hp / window.gameApp.helicopter.maxHp <= 0.20);
    let oceanColor = '#0f3866';
    if (isLowHealth) {
      const pulse = (Math.sin(this.waveTimer * 6) + 1) * 0.5;
      const red = Math.round(110 + pulse * 110);
      const green = Math.round(15 + pulse * 10);
      const blue = Math.round(30 + pulse * 15);
      oceanColor = `rgb(${red}, ${green}, ${blue})`;
    }

    for (let r = 0; r < rowsToDraw; r++) {
      for (let c = 0; c < colsToDraw; c++) {
        const gridCol = ((startCol + c) % this.cols + this.cols) % this.cols;
        const gridRow = ((startRow + r) % this.rows + this.rows) % this.rows;

        const type = this.grid[gridRow * this.cols + gridCol];
        const screenX = (startCol + c) * tileSize - camX;
        const screenY = (startRow + r) * tileSize - camY;

        switch (type) {
          case this.TILE_OCEAN:
            ctx.fillStyle = oceanColor;
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

            // Subtle animated ocean waves
            const waveOffset = Math.sin(this.waveTimer + gridCol * 0.5 + gridRow * 0.8) * 4;
            ctx.strokeStyle = isLowHealth ? 'rgba(255, 200, 200, 0.25)' : 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(screenX + 10, screenY + 20 + waveOffset);
            ctx.lineTo(screenX + 30, screenY + 20 + waveOffset);
            ctx.moveTo(screenX + 35, screenY + 45 - waveOffset);
            ctx.lineTo(screenX + 55, screenY + 45 - waveOffset);
            ctx.stroke();
            break;

          case this.TILE_SAND:
            ctx.fillStyle = '#d97706'; // Golden Sand Beach
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(screenX + 4, screenY + 4, this.tileSize - 8, this.tileSize - 8);
            break;

          case this.TILE_GRASS:
            ctx.fillStyle = '#15803d'; // Lush Island Camo Green
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
            // Texture dots
            ctx.fillStyle = '#166534';
            ctx.fillRect(screenX + 16, screenY + 16, 8, 8);
            ctx.fillRect(screenX + 40, screenY + 36, 12, 12);
            break;

          case this.TILE_ROCK:
            ctx.fillStyle = '#475569'; // Dark Mountain Rock
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
            break;

          case this.TILE_BASE:
            ctx.fillStyle = '#334155'; // Military Base Concrete
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
            break;

          case this.TILE_ROAD:
            ctx.fillStyle = '#1e293b'; // Runway Asphalt
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
            ctx.fillStyle = '#fef08a'; // Runway Center Markings
            ctx.fillRect(screenX + 24, screenY + 28, 16, 8);
            break;
        }
      }
    }
  }
}
