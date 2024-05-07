import { GameEngine } from "./game-engine.js";
import { Vector } from "./vector.js";
import { BaseObject } from "./base-object.js";

export class Ball extends BaseObject {
  #render = {
    radius: 8,
  };

  #inGoal = false;

  #characteristics = {
    friction: 0.02,
    goalFriction: 0.4,
  };

  setInGoal(inGoal) {
    this.#inGoal = inGoal;
  }

  get radius() {
    return this.#render.radius;
  }

  centerOnField() {
    const centerOfField = new Vector(
      GameEngine.canvas.width / 2,
      GameEngine.canvas.height / 2,
    );

    this.setPosition(centerOfField);
  }

  draw() {
    GameEngine.ctx.beginPath();
    GameEngine.ctx.arc(
      this.position.x,
      this.position.y,
      this.#render.radius,
      0,
      Math.PI * 2,
    );

    GameEngine.ctx.lineWidth = 3;
    GameEngine.ctx.strokeStyle = "black";
    GameEngine.ctx.stroke();

    GameEngine.ctx.fillStyle = "white";
    GameEngine.ctx.fill();

    GameEngine.ctx.closePath();
  }

  kick(force) {
    this.setVelocity(force);
  }

  update(deltaTime) {
    this.position = this.position.add(this.velocity);

    this.#applyFriction();
  }

  #applyFriction() {
    if (!this.velocity.isZero) {
      const scaledVelocity = this.velocity.scale(
        this.#inGoal
          ? this.#characteristics.goalFriction
          : this.#characteristics.friction,
      );
      this.velocity = this.velocity.add(
        scaledVelocity.reflect(scaledVelocity.normalize),
      );
    }
  }
}
