import { SoccerPlayer } from "./soccer-player.js";
import { GameEngine } from "./game-engine.js";
import { Vector } from "./vector.js";
import { Drawing } from "./drawing.js";
import { calculateAngle } from "./utils.js";
import debugEngine from "./debug-engine.js";

const GoalKeeperModes = {
  WATCHING_FAR: "WATCHING_FAR",
  WATCHING: "WATCHING",
  ALERT: "ALERT",
  DEFENSIVE: "DEFENSIVE",
};

export class GoalKeeper extends SoccerPlayer {
  #state = {
    mode: GoalKeeperModes.WATCHING_FAR,
    watchingFar: false,
    alerting: false,
    defending: false,
  };

  #ranges = {
    [GoalKeeperModes.WATCHING_FAR]: 300,
    [GoalKeeperModes.WATCHING]: 300,
    [GoalKeeperModes.ALERT]: 150,
    [GoalKeeperModes.DEFENSIVE]: 80,
  };

  update(deltaTime) {
    super.update(deltaTime);
    this.pointTowardsBall(); // Override facing

    this.#updateRangeBasedMode();

    // Watching far -> Center of goal
    // Watching -> In box, but follow
    // Alert -> stand between ball and center of goal
    // Defensive -> defend in case of attempts at goal, and grab if close
    switch (this.#state.mode) {
      case GoalKeeperModes.WATCHING_FAR: {
        this.watchFromFar();
        break;
      }
      case GoalKeeperModes.WATCHING: {
        this.watchingBall();

        break;
      }
      case GoalKeeperModes.ALERT: {
        this.alertAndReady();

        break;
      }
      case GoalKeeperModes.DEFENSIVE: {
        this.#moveTowardsBall();

        break;
      }
    }
  }

  #moveTowardsBall() {
    if (this.isDribbling) {
      const [p1, p2] = this.otherTeam.teamGoalEntry;
      const center = p1.middlePoint(p2);

      const direction = calculateAngle(this.position, center);

      const forceMagnitude = 4;
      const kickForce = new Vector(
        forceMagnitude * Math.cos(direction),
        forceMagnitude * Math.sin(direction),
      );

      this.ball.kick(kickForce);
    } else {
      this.setNextWayPoint(this.ball.position);
    }
  }

  watchFromFar() {
    if (this.#state.watchingFar) return;

    this.#state.watchingFar = true;
    this.#state.alerting = false;
    this.#state.defending = false;

    const [gkX, gkY, gkW, gkH] = this.team.teamGoalKeeperRect;
    const [topY, bottomY, leftX, rightX] = [gkY, gkY + gkH, gkX, gkX + gkW];
    const centerY = topY + Math.abs(topY - bottomY) / 2;
    const centerX = leftX + Math.abs(leftX - rightX) / 2;

    const nextPoint = new Vector(centerX, centerY);

    this.setNextWayPoint(nextPoint);
  }

  watchingBall() {
    this.#state.watchingFar = false;
    this.#state.alerting = false;
    this.#state.defending = false;

    const offset = 10;
    const [gkX, gkY, gkW, gkH] = this.team.teamGoalKeeperRect;
    const [topY, bottomY, leftX, rightX] = [
      gkY + offset,
      gkY + gkH - offset,
      gkX - offset,
      gkX + gkW + offset,
    ];

    const nextPoint = new Vector(this.position.x, this.ball.position.y);

    if (nextPoint.y > bottomY) {
      nextPoint.y = bottomY;
    } else if (nextPoint.y < topY) {
      nextPoint.y = topY;
    }

    this.setNextWayPoint(nextPoint);
  }

  alertAndReady() {
    this.#state.watchingFar = false;
    this.#state.alerting = false;
    this.#state.defending = false;

    const [gkX, gkY, gkW, gkH] = this.team.teamGoalRect;

    const [post1, post2] = [
      this.team.teamId === 1
        ? new Vector(gkX + gkW, gkY)
        : new Vector(gkX, gkY),
      this.team.teamId === 1
        ? new Vector(gkX + gkW, gkY + gkH)
        : new Vector(gkX, gkY + gkH),
    ];

    const center = post1.middlePoint(post2);
    const position = center.linearInterpolation(this.ball.position, 0.1);

    this.setNextWayPoint(position);
  }

  draw() {
    super.draw();

    this.#drawDebug();
  }

  #drawDebug() {
    if (GameEngine.isDebug) {
      if (this.isMouseOverMe) {
        this.#drawRanges();
      }
      this.#drawMode();
    }
  }

  #drawRanges() {
    this.#drawRange(this.#ranges[GoalKeeperModes.WATCHING], "#0cfbff");
    this.#drawRange(this.#ranges[GoalKeeperModes.ALERT], "#e7ff0c");
    this.#drawRange(this.#ranges[GoalKeeperModes.DEFENSIVE], "#ff610c");
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

  #updateRangeBasedMode() {
    const distanceFromBall = this.distanceFromBall;

    if (distanceFromBall > this.#ranges[GoalKeeperModes.WATCHING_FAR]) {
      this.#state.mode = GoalKeeperModes.WATCHING_FAR;
    } else if (distanceFromBall > this.#ranges[GoalKeeperModes.ALERT]) {
      this.#state.mode = GoalKeeperModes.WATCHING;
    } else if (distanceFromBall > this.#ranges[GoalKeeperModes.DEFENSIVE]) {
      this.#state.mode = GoalKeeperModes.ALERT;
    } else {
      this.#state.mode = GoalKeeperModes.DEFENSIVE;
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
}
