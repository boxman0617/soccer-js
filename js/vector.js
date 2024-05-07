import { toRadians } from "./utils.js";

export class Vector {
  x;
  y;

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(vector) {
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  subtract(vector) {
    return new Vector(this.x - vector.x, this.y - vector.y);
  }

  dot(vector) {
    return this.x * vector.x + this.y * vector.y;
  }

  multiply(vector) {
    return new Vector(this.x * vector.x, this.y * vector.y);
  }

  divide(vector) {
    return new Vector(this.x / vector.x, this.y / vector.y);
  }

  scale(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }

  isEqual(otherVector) {
    const thisX = Math.round(this.x);
    const thisY = Math.round(this.y);
    const otherX = Math.round(otherVector.x);
    const otherY = Math.round(otherVector.y);

    return thisX === otherX && thisY === otherY;
  }

  clone() {
    return new Vector(this.x, this.y);
  }

  linearInterpolation(point, t) {
    return new Vector(
      this.x + (point.x - this.x) * t,
      this.y + (point.y - this.y) * t,
    );
  }

  get normalize() {
    const magnitude = Math.sqrt(this.x * this.x + this.y * this.y);
    return new Vector(this.x / magnitude, this.y / magnitude);
  }

  get isZero() {
    return Math.abs(this.x) < 0.01 && Math.abs(this.y) < 0.01;
  }

  get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  reflect(normal) {
    const dotProd = this.dot(normal);

    return new Vector(
      this.x - 2 * dotProd * normal.x,
      this.y - 2 * dotProd * normal.y,
    );
  }

  rotate(angle) {
    const radians = toRadians(angle);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    return new Vector(newX, newY);
  }

  middlePoint(point) {
    return new Vector((this.x + point.x) / 2, (this.y + point.y) / 2);
  }

  distance(point) {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  toArray() {
    return [this.x, this.y];
  }

  static zero() {
    return new Vector(0, 0);
  }

  static one() {
    return new Vector(1, 1);
  }

  static fromDirection(direction, speed) {
    return new Vector(speed * Math.cos(direction), speed * Math.sin(direction));
  }

  toString() {
    return `(${this.x}, ${this.y})`;
  }

  printDebug() {
    console.log(this.toString());
  }
}
