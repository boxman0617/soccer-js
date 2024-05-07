import { SoccerPlayer } from "./soccer-player.js";
import debugEngine from "./debug-engine.js";
import { Vector } from "./vector.js";
import { calculateAngle } from "./utils.js";

export class Forward extends SoccerPlayer {
  get distancesFromOtherForwardsInMyTeam() {
    return this.team.forwards
      .filter((player) => player !== this)
      .map((player) => this.position.distance(player.position));
  }

  get distancesFromOtherTeamPlayers() {
    return this.otherTeam.players.map((player) =>
      player.position.distance(this.position),
    );
  }

  get shouldPass() {
    return false;
  }

  get distanceTillShoot() {
    return debugEngine.use("distanceTillShoot", {
      defaultValue: 75,
      range: [10, 100],
    });
  }

  get shouldShootAtGoal() {
    const [p1, p2] = this.otherTeam.teamGoalEntry;
    const center = p1.middlePoint(p2);
    const distanceToGoal = this.position.distance(center);

    return distanceToGoal < this.distanceTillShoot;
  }

  get shouldMoveTowardsBall() {
    return (
      this.distanceFromBall <
      debugEngine.use("moveTowardsBallDistance", {
        defaultValue: 100,
        range: [10, 100],
      })
    );
  }

  update(deltaTime) {
    super.update(deltaTime);

    if (this.game?.isGameStage) {
      if (this.shouldShootAtGoal) {
        this.shootAtGoal();
      } else if (this.shouldMoveTowardsBall) {
        this.moveTowardsBall();
      } else if (this.shouldPass) {
      }
    }
  }

  moveTowardsBall() {
    if (this.isDribbling) {
      if (this.nextWayPoint) {
        const [p1, p2] = this.otherTeam.teamGoalEntry;
        const center = p1.middlePoint(p2);

        const direction = calculateAngle(this.position, center);
        const directionForce = new Vector(
          Math.cos(direction),
          Math.sin(direction),
        ).normalize;

        this.setNextWayPoint(this.nextWayPoint.add(directionForce.scale(1)));
      }
    } else {
      this.setNextWayPoint(this.ball.position);
    }
  }

  shootAtGoal() {
    console.log("Shoot!");
    const [p1, p2] = this.otherTeam.teamGoalEntry;
    const center = p1.middlePoint(p2);

    const direction = calculateAngle(this.position, center);
    const directionForce = new Vector(
      Math.cos(direction),
      Math.sin(direction),
    ).normalize.scale(4);

    this.ball.kick(directionForce);
  }
}
