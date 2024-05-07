import { Vector } from "./vector.js";

export function calculatePoints(size, divisions) {
  const divisionWidth = size / divisions;
  const points = [];
  const offset = divisionWidth / 2;

  for (let i = 0; i < divisions; i++) {
    points.push(i * divisionWidth + offset);
  }

  return points;
}

export function calculateDistance(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateAngle(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.atan2(dy, dx);
}

export function findCircleLineIntersections(h, k, r, m, b) {
  // Calculate coefficients of the quadratic equation
  const A = 1 + m * m;
  const B = 2 * m * (b - k) - 2 * h;
  const C = h * h + (b - k) * (b - k) - r * r;

  // Calculate the discriminant
  const D = B * B - 4 * A * C;

  if (D < 0) return [Vector.zero(), Vector.zero()];

  const sqrtD = Math.sqrt(D);
  const x1 = (-B + sqrtD) / (2 * A);
  const y1 = m * x1 + b;
  const x2 = (-B - sqrtD) / (2 * A);
  const y2 = m * x2 + b;

  return [new Vector(x1, y1), new Vector(x2, y2)];
}

export function toRadians(direction) {
  return (direction * Math.PI) / 180;
}

export class Facing {
  static right = 0;
  static down = toRadians(90);
  static left = toRadians(180);
  static up = toRadians(270);
}
