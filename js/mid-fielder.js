import { SoccerPlayer } from "./soccer-player.js";
import { GameEngine } from "./game-engine.js";
import debugEngine from "./debug-engine.js";
import { Drawing } from "./drawing.js";
import { Vector } from "./vector.js";

const MidFielderModes = {
  WATCHING_FAR: "WATCHING_FAR",
  WATCHING: "WATCHING",
  DEFENSIVE: "DEFENSIVE",
  ON_THE_OFFENCE: "ON_THE_OFFENCE",
};

export class MidFielder extends SoccerPlayer {
  #state = {
    mode: MidFielderModes.WATCHING_FAR,
  };

  #ranges = {
    [MidFielderModes.WATCHING_FAR]: 300,
    [MidFielderModes.WATCHING]: 300,
    [MidFielderModes.DEFENSIVE]: 150,
    [MidFielderModes.ON_THE_OFFENCE]: () =>
      debugEngine.use("midOffenceRange", {
        defaultValue: 80,
        range: [10, 140],
      }),
  };

  update(deltaTime) {
    super.update(deltaTime);

    this.#updateMode();
  }

  #drawDebug() {
    if (GameEngine.isDebug) {
      if (this.isMouseOverMe) {
        this.#drawRanges();
      }
      this.#drawMode();
    }
  }

  #drawMode() {
    Drawing.text(
      "#ffffff",
      this.#state.mode,
      this.position.add(new Vector(10, -30)),
      "bold 14px Arial",
    );
  }

  #drawRanges() {
    this.#drawRange(this.#ranges[MidFielderModes.WATCHING], "#0cfbff");
    this.#drawRange(this.#ranges[MidFielderModes.DEFENSIVE], "#e7ff0c");
    this.#drawRange(this.#ranges[MidFielderModes.ON_THE_OFFENCE](), "#ff610c");
  }

  #drawRange(range, color) {
    GameEngine.ctx.beginPath();

    GameEngine.ctx.strokeStyle = color;

    GameEngine.ctx.arc(
      this.position.x,
      this.position.y,
      range,
      0,
      2 * Math.PI,
      false,
    );
    GameEngine.ctx.stroke();
  }

  #checkForWatchingFar() {
    if (this.distanceFromBall > this.#ranges[MidFielderModes.WATCHING_FAR]) {
      this.#state.mode = MidFielderModes.WATCHING_FAR;
      return false;
    }
    return true;
  }

  #checkForWatching() {
    if (this.distanceFromBall > this.#ranges[MidFielderModes.DEFENSIVE]) {
      this.#state.mode = MidFielderModes.WATCHING;
      return false;
    }
    return true;
  }

  #checkForOnTheOffence() {}

  #updateMode() {
    if (this.game?.isGameStage) {
      this.#checkForWatchingFar() &&
        this.#checkForWatching() &&
        this.#checkForOnTheOffence();

      switch (this.#state.mode) {
        case MidFielderModes.WATCHING_FAR: {
          this.#handleWatchingFar();
          break;
        }
        case MidFielderModes.WATCHING: {
          this.#handleWatching();
          break;
        }
      }
    }
  }

  #handleWatchingFar() {}

  #handleWatching() {}

  draw() {
    super.draw();

    this.#drawDebug();
  }
}
