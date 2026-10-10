class InputHandler {
  constructor() {
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      bomb: false,
      mute: false,
      start: false,
      pause: false
    };

    this.justPressed = {
      bomb: false,
      mute: false,
      start: false,
      pause: false
    };

    this.prevGamepadButtons = {};

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.fire = true;
        if (!this.keys.start) {
          this.justPressed.start = true;
        }
        this.keys.start = true;
        e.preventDefault();
        break;
      case 'KeyB':
      case 'ShiftLeft':
      case 'ShiftRight':
        if (!this.keys.bomb) {
          this.justPressed.bomb = true;
        }
        this.keys.bomb = true;
        e.preventDefault();
        break;
      case 'KeyM':
        if (!this.keys.mute) {
          this.justPressed.mute = true;
        }
        this.keys.mute = true;
        break;
      case 'KeyP':
      case 'Escape':
        if (!this.keys.pause) {
          this.justPressed.pause = true;
        }
        this.keys.pause = true;
        e.preventDefault();
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.fire = false;
        this.keys.start = false;
        break;
      case 'KeyB':
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.bomb = false;
        break;
      case 'KeyM':
        this.keys.mute = false;
        break;
      case 'KeyP':
      case 'Escape':
        this.keys.pause = false;
        break;
    }
  }

  // Poll Gamepads (HTML5 Gamepad API)
  pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        gp = gamepads[i];
        break;
      }
    }

    if (!gp) return;

    // Analog Stick & D-Pad Steering
    const deadzone = 0.25;
    const axisX = gp.axes[0] || 0;
    const axisY = gp.axes[1] || 0;

    // Buttons (Standard Mapping)
    const btnA = gp.buttons[0] && gp.buttons[0].pressed;       // Action / Fire / Start
    const btnB = gp.buttons[1] && gp.buttons[1].pressed;       // Bomb
    const btnX = gp.buttons[2] && gp.buttons[2].pressed;       // Bomb alt
    const btnY = gp.buttons[3] && gp.buttons[3].pressed;
    const btnLB = gp.buttons[4] && gp.buttons[4].pressed;
    const btnRB = gp.buttons[5] && gp.buttons[5].pressed;
    const btnLT = gp.buttons[6] && gp.buttons[6].pressed;      // Bomb
    const btnRT = gp.buttons[7] && gp.buttons[7].pressed;      // Fire / Thrust
    const btnSelect = gp.buttons[8] && gp.buttons[8].pressed;  // Mute / Pause
    const btnStart = gp.buttons[9] && gp.buttons[9].pressed;   // Pause / Start / Retry

    const dpadUp = gp.buttons[12] && gp.buttons[12].pressed;
    const dpadDown = gp.buttons[13] && gp.buttons[13].pressed;
    const dpadLeft = gp.buttons[14] && gp.buttons[14].pressed;
    const dpadRight = gp.buttons[15] && gp.buttons[15].pressed;

    // Movement Mapping
    if (axisX < -deadzone || dpadLeft) this.keys.left = true;
    if (axisX > deadzone || dpadRight) this.keys.right = true;
    if (axisY < -deadzone || dpadUp || btnRT) this.keys.up = true;
    if (axisY > deadzone || dpadDown) this.keys.down = true;

    // Weapon Fire
    if (btnA || btnRT) this.keys.fire = true;

    // Bomb (Just Pressed handling)
    const isBombPressed = btnB || btnX || btnLT || btnRB;
    if (isBombPressed && !this.prevGamepadButtons.bomb) {
      this.justPressed.bomb = true;
    }
    if (isBombPressed) this.keys.bomb = true;
    this.prevGamepadButtons.bomb = isBombPressed;

    // Start / Retry (Just Pressed handling)
    const isStartPressed = btnStart || btnA;
    if (isStartPressed && !this.prevGamepadButtons.start) {
      this.justPressed.start = true;
    }
    if (isStartPressed) this.keys.start = true;
    this.prevGamepadButtons.start = isStartPressed;

    // Pause (Just Pressed handling via Start / Select)
    const isPausePressed = btnStart || btnSelect;
    if (isPausePressed && !this.prevGamepadButtons.pause) {
      this.justPressed.pause = true;
    }
    if (isPausePressed) this.keys.pause = true;
    this.prevGamepadButtons.pause = isPausePressed;

    // Mute (Just Pressed handling)
    if (btnSelect && !this.prevGamepadButtons.mute) {
      this.justPressed.mute = true;
    }
    if (btnSelect) this.keys.mute = true;
    this.prevGamepadButtons.mute = btnSelect;
  }

  // Helper to consume one-shot presses
  consumeJustPressed(action) {
    if (this.justPressed[action]) {
      this.justPressed[action] = false;
      return true;
    }
    return false;
  }
}
