import { Vector } from "./vector.js";

export class BaseObject {
  position = Vector.zero();
  velocity = Vector.zero();

  setPosition(position) {
    this.position = position;
  }

  setVelocity(velocity) {
    this.velocity = velocity;
  }
}
