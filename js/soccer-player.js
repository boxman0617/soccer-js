import {
  calculateAngle,
  Facing,
  findCircleLineIntersections,
  toRadians,
} from "./utils.js";
import { GameEngine } from "./game-engine.js";
import { Vector } from "./vector.js";
import { BaseObject } from "./base-object.js";
import { Drawing } from "./drawing.js";
import debugEngine from "./debug-engine.js";

export class SoccerPlayer extends BaseObject {
  #team;

  nextWayPoint = null;

  #speedRange = [1, 10];

  #dribble = {
    distance: 30,
    isDribbling: false,
  };

  _state = {
    initialPosition: null,
  };

  #maxStamina = 100;

  stamina = this.#maxStamina;
  facing = Facing.right;
  mass = Vector.one().scale(20);
  isMouseOverMe = false;

  #render = {
    radius: 10,
  };

  #debug = {
    desiredVelocity: Vector.zero(),
    steering: Vector.zero(),
    steeringCircle: {
      i: Vector.zero(),
      j: Vector.zero(),
    },
    index: -1,
    steerLines: [],
  };

  #maxRotation = toRadians(360);

  constructor(team, index) {
    super();
    this.#team = team;
    this.#debug.index = index;
  }

  setPosition(position) {
    if (this._state.initialPosition === null) {
      this._state.initialPosition = position;
    }

    super.setPosition(position);
  }

  get playerRadius() {
    return this.#render.radius;
  }

  get #dribbleAngle() {
    return debugEngine.use("dribbleAngle", {
      defaultValue: 90,
      range: [15, 180],
    });
  }

  get #ballIsCloseRange() {
    return debugEngine.use("ballIsCloseRange", {
      defaultValue: 23,
      range: [1, 100],
    });
  }

  get isDribbling() {
    return this.#dribble.isDribbling;
  }

  get ball() {
    return this.#team.ball;
  }

  get team() {
    return this.#team;
  }

  get game() {
    return this.#team.game;
  }

  get otherTeam() {
    const [first, second] = this.#team.game.teams;
    return this.#team === first ? second : first;
  }

  get distanceFromBall() {
    return this.position.distance(this.ball.position);
  }

  get debugIndex() {
    return this.#debug.index;
  }

  isPointOverMe(point) {
    return this.position.distance(point) <= this.#render.radius;
  }

  setMouseOverStatus(point) {
    this.isMouseOverMe = this.isPointOverMe(point);
  }

  setNextWayPoint(point) {
    this.nextWayPoint = point;
  }

  updateFacing(direction) {
    this.facing = direction % this.#maxRotation;
  }

  pointTowardsBall() {
    const facing = calculateAngle(this.position, this.ball.position);
    this.updateFacing(facing);
  }

  update(deltaTime) {
    if (!this.nextWayPoint) {
      this.pointTowardsBall();
    } else {
      this.#pointTowardsMovingDirection();
    }

    this.#checkIfBallIsWithinDribbleRange();
    this.#handleNextWayPoint(deltaTime);

    const nextPosition = this.position.add(this.velocity);

    let willCollide = false;
    for (const player of this.game.players) {
      if (player !== this) {
        const distance = nextPosition.distance(player.position);
        if (distance < this.playerRadius + player.playerRadius) {
          willCollide = true;
          break;
        }
      }
    }

    if (!willCollide) this.position = nextPosition;
  }

  draw() {
    Drawing.circle(this.#team.color, this.position, this.#render.radius);

    this.#drawDebug();
  }

  #handleNextWayPoint(deltaTime) {
    if (this.nextWayPoint === null) return;

    if (this.position.isEqual(this.nextWayPoint)) {
      this.#handleReachingNextWayPoint();
    } else {
      this.#steerTowardsNextWayPoint(deltaTime);
      this.#steerAroundOthers(deltaTime);
      this.#handleBallDribbling();
    }
  }

  #handleBallDribbling() {
    if (this.isDribbling) {
      if (this.distanceFromBall < this.#ballIsCloseRange) {
        const direction = calculateAngle(this.position, this.nextWayPoint);

        const forceMagnitude = debugEngine.use("dribbleKickForce", {
          defaultValue: 1,
          range: [1, 10],
        });

        const kickForce = Vector.fromDirection(forceMagnitude, direction);

        this.ball.kick(kickForce);
      }
    }
  }

  #calculateSteeringForce(desiredVelocity) {
    const steering = desiredVelocity.subtract(this.velocity).divide(this.mass);
    this.setVelocity(this.velocity.add(steering));
  }

  #findOtherPlayersNearMe(distanceThreshold) {
    return this.game.players.filter(
      (player) =>
        player !== this &&
        player.position.distance(this.position) < distanceThreshold,
    );
  }

  #steerTowardsNextWayPoint(deltaTime) {
    const dtSeconds = deltaTime / 1000;

    const speed = 60;
    const direction = calculateAngle(this.position, this.nextWayPoint);

    // Calculate the velocity we want to apply
    let desiredVelocity = new Vector(
      Math.cos(direction),
      Math.sin(direction),
    ).scale(speed * dtSeconds);

    const slowDownThreshold = 50;
    const distanceToTarget = this.position.distance(this.nextWayPoint);
    // If we are nearing the target
    if (distanceToTarget < slowDownThreshold) {
      // slow down our velocity
      const slowDownSpeed = 30;
      desiredVelocity = desiredVelocity.add(
        desiredVelocity
          .reflect(desiredVelocity.normalize)
          .scale(slowDownSpeed * dtSeconds),
      );
    }

    this.#calculateSteeringForce(desiredVelocity);
  }

  #steerAroundOthers(deltaTime) {
    const dtSeconds = deltaTime / 1000;
    const distanceThreshold = 60;
    const players = this.#findOtherPlayersNearMe(distanceThreshold);

    if (players.length > 0) {
      const { collisionRadius, startLine, endLine } =
        this.#generateCollisionLines();

      const lines = [
        [startLine[0], endLine[0]], // left
        [startLine[1], endLine[1]], // right
      ];

      if (GameEngine.isDebug) {
        this.#debug.steeringCircle.j = startLine[0];
        this.#debug.steeringCircle.i = startLine[1];
        this.#debug.steerLines = lines;
      }

      let i = 0;
      let collided = false;
      for (const [startLine, endLine] of lines) {
        for (const player of players) {
          // Create a vector from the start of the line to the end
          const v1 = endLine.subtract(startLine);
          // Create a vector from the start of the line to the player's position
          const v2 = player.position.subtract(startLine);

          let t = v2.dot(v1) / v1.dot(v1);

          if (t < 0) t = 0;
          if (t > 1) t = 1;

          // Create a vector from the start of the line to the closest point on the line to the player's position
          const intersection = new Vector(
            startLine.x + v1.x * t,
            startLine.y + v1.y * t,
          );

          // Create a vector from the player's position to the closest point on the line
          const closestLineVector = intersection.subtract(player.position);

          // If the vector is shorter than the radius, log that there will be a collision
          if (closestLineVector.magnitude <= collisionRadius) {
            const rotationForce = 60;
            const desiredVelocity = this.velocity
              .rotate(i === 0 ? rotationForce : rotationForce)
              .normalize.scale(rotationForce * dtSeconds);
            this.#calculateSteeringForce(desiredVelocity);
            collided = true;
            break;
          }

          if (collided) break;
        }

        i++;
      }
    } else {
      if (GameEngine.isDebug) {
        this.#debug.steeringCircle.j = Vector.zero();
        this.#debug.steeringCircle.i = Vector.zero();
        this.#debug.steerLines = [];
      }
    }
  }

  #generateCollisionLines() {
    // Deconstruct start and end positions
    const x1 = this.position.x;
    const y1 = this.position.y;
    const x2 = this.nextWayPoint.x;
    const y2 = this.nextWayPoint.y;
    // Find slope of start to end point
    const m1 = (y2 - y1) / (x2 - x1);
    // Find inverted slope (perpendicular slope)
    const m2 = -(1 / m1);
    // Find start b value based on perpendicular slope
    const b1 = y1 - m2 * x1;
    // Find end b value based on perpendicular slope
    const b2 = y2 - m2 * x2;

    const collisionRadius = this.#render.radius - 2;
    const startLine = findCircleLineIntersections(
      x1,
      y1,
      collisionRadius,
      m2,
      b1,
    );
    const endLine = findCircleLineIntersections(
      x2,
      y2,
      collisionRadius,
      m2,
      b2,
    );
    return { collisionRadius, startLine, endLine };
  }

  #handleReachingNextWayPoint() {
    this.setVelocity(Vector.zero());
    this.#debug.desiredVelocity = Vector.zero();
    this.#debug.steering = Vector.zero();
    this.nextWayPoint = null;
  }

  #drawDebug() {
    if (GameEngine.isDebug) {
      this.#drawSteeringLines();
      this.#drawVelocity();
      this.#drawDebugFacingDirection();
      this.#drawNextWayPoint();
      this.#drawDribbleSlice();
      this.#drawIndex();
    }
  }

  #drawNextWayPoint() {
    if (this.nextWayPoint) {
      Drawing.circle("#e7ff0c", this.nextWayPoint, 4);
    }
  }

  #drawDebugFacingDirection() {
    const lineLength = 10;
    const endX = this.position.x + lineLength * Math.cos(this.facing);
    const endY = this.position.y + lineLength * Math.sin(this.facing);
    GameEngine.ctx.beginPath();
    GameEngine.ctx.strokeStyle = "cyan";
    GameEngine.ctx.moveTo(this.position.x, this.position.y);
    GameEngine.ctx.lineTo(endX, endY);
    GameEngine.ctx.stroke();
  }

  #drawDribbleSlice() {
    const breadth = this.#dribbleAngle;
    const radius = this.#dribble.distance;

    const rArc = toRadians(breadth);
    const startAngle = this.facing - rArc / 2;
    const endAngle = this.facing + rArc / 2;

    GameEngine.ctx.beginPath();
    GameEngine.ctx.strokeStyle = "cyan";

    GameEngine.ctx.moveTo(...this.position.toArray());
    GameEngine.ctx.lineTo(
      this.position.x + radius * Math.cos(startAngle),
      this.position.y + radius * Math.sin(startAngle),
    );

    GameEngine.ctx.arc(
      this.position.x,
      this.position.y,
      radius,
      startAngle,
      endAngle,
      false,
    );

    GameEngine.ctx.lineTo(...this.position.toArray());

    GameEngine.ctx.stroke();
  }

  #checkIfBallIsWithinDribbleRange() {
    const distanceToBall = this.distanceFromBall;
    if (distanceToBall > this.#dribble.distance) {
      this.#dribble.isDribbling = false;
      return;
    }

    const breadth = this.#dribbleAngle;

    const rArc = toRadians(breadth);
    const startAngle = this.facing - rArc / 2;
    const endAngle = this.facing + rArc / 2;

    const angleToBall = calculateAngle(this.position, this.ball.position);

    this.#dribble.isDribbling =
      angleToBall >= startAngle && angleToBall <= endAngle;

    // if (this.#dribble.isDribbling) {
    //   const dribbleDistance = 22;
    //   this.ball.setPosition(
    //     new Vector(
    //       this.position.x + dribbleDistance * Math.cos(this.facing),
    //       this.position.y + dribbleDistance * Math.sin(this.facing),
    //     ),
    //   );
    // }
  }

  #drawVelocity() {
    const scaledVelocity = this.velocity.scale(100);
    Drawing.line("#ff0000", this.position, this.position.add(scaledVelocity));
    Drawing.line(
      "#8c8181",
      this.position,
      this.position.add(this.#debug.desiredVelocity.scale(100)),
    );
    Drawing.line(
      "#9700ff",
      this.position,
      this.position.add(this.#debug.steering.scale(400)),
    );
  }

  #pointTowardsMovingDirection() {
    const facing = Math.atan2(this.velocity.y, this.velocity.x);
    this.updateFacing(facing);
  }

  #drawIndex() {
    Drawing.text(
      "#8300ff",
      `#${this.#debug.index}`,
      this.position.add(new Vector(10, -10)),
    );
  }

  *#colors() {
    const colors = ["#0eefc6", "#ef0e0e"];
    let i = 0;
    while (true) {
      yield colors[i];
      i = (i + 1) % colors.length;
    }
  }

  #drawSteeringLines() {
    const color = this.#colors();
    Drawing.circle(color.next().value, this.#debug.steeringCircle.i, 3);
    Drawing.circle(color.next().value, this.#debug.steeringCircle.j, 3);

    for (const [start, end] of this.#debug.steerLines) {
      Drawing.line(color.next().value, start, end);
    }
  }
}
