class Camera {
  constructor(viewportWidth, viewportHeight, worldWidth, worldHeight) {
    this.x = 0;
    this.y = 0;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    // Screen Shake
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  resize(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  follow(targetX, targetY) {
    // Keep target centered
    this.x = targetX - this.viewportWidth / 2;
    this.y = targetY - this.viewportHeight / 2;

    // Toroidal map wrap for camera coordinates
    this.x = ((this.x % this.worldWidth) + this.worldWidth) % this.worldWidth;
    this.y = ((this.y % this.worldHeight) + this.worldHeight) % this.worldHeight;

    // Handle screen shake decay
    if (this.shakeIntensity > 0) {
      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeIntensity *= 0.9;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  addShake(intensity) {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 25);
  }

  getRenderX() {
    return this.x + this.shakeOffsetX;
  }

  getRenderY() {
    return this.y + this.shakeOffsetY;
  }

  // Toroidal Screen Position Calculation Helper
  getScreenPos(worldX, worldY) {
    const rx = this.getRenderX();
    const ry = this.getRenderY();
    const w = this.worldWidth;
    const h = this.worldHeight;

    let dx = worldX - rx;
    let dy = worldY - ry;

    if (dx > w / 2) dx -= w;
    if (dx < -w / 2) dx += w;
    if (dy > h / 2) dy -= h;
    if (dy < -h / 2) dy += h;

    return { x: dx, y: dy };
  }

  isVisible(worldX, worldY, padding = 128) {
    const pos = this.getScreenPos(worldX, worldY);
    return (
      pos.x >= -padding &&
      pos.x <= this.viewportWidth + padding &&
      pos.y >= -padding &&
      pos.y <= this.viewportHeight + padding
    );
  }
}
