import { calculatePoints } from "./utils.js";
import { GameEngine } from "./game-engine.js";
import { Vector } from "./vector.js";
import { GoalKeeper } from "./goal-keeper.js";
import { MidFielder } from "./mid-fielder.js";
import { Forward } from "./forward.js";
import { Defender } from "./defender.js";

export class Team {
  #name;
  #color;
  #coinSide;

  score = 0;

  #game;
  #controller;

  #players = [];

  #teamId;

  constructor(name, color, controller, game, teamId, coinSide, count) {
    this.#name = name;
    this.#color = color;
    this.#controller = controller;
    this.#controller.setTeam(this);
    this.#game = game;
    this.#teamId = teamId;
    this.#coinSide = coinSide;

    this.#players.push(new GoalKeeper(this, count.next().value));

    this.#setRestOfPlayers(count);
  }

  get players() {
    return this.#players;
  }

  get inPossession() {
    return this.#players.some((player) => player.isDribbling);
  }

  get lastTwoPlayers() {
    return this.#players.slice(-2);
  }

  get coinSide() {
    return this.#coinSide;
  }

  get teamId() {
    return this.#teamId;
  }

  get ball() {
    return this.#game.ball;
  }

  get game() {
    return this.#game;
  }

  get teamGoalKeeperRect() {
    return this.#teamId === 1
      ? this.#game.team1GoalKeeperRect
      : this.#game.team2GoalKeeperRect;
  }

  get teamGoalRect() {
    return this.#game[`team${this.#teamId}GoalRect`];
  }

  get teamGoalEntry() {
    return this.#game[`team${this.#teamId}GoalEntryLine`];
  }

  get defenders() {
    const defenders = [];
    for (let i = 0; i < this.#players.length; i++) {
      const player = this.#players[i];
      if (player instanceof Defender) {
        defenders.push(player);
      }
    }
    return defenders;
  }

  get mids() {
    const mids = [];
    for (let i = 0; i < this.#players.length; i++) {
      const player = this.#players[i];
      if (player instanceof MidFielder) {
        mids.push(player);
      }
    }
    return mids;
  }

  get forwards() {
    const forwards = [];
    for (let i = 0; i < this.#players.length; i++) {
      const player = this.#players[i];
      if (player instanceof Forward) {
        forwards.push(player);
      }
    }
    return forwards;
  }

  increaseScore() {
    this.score++;
  }

  setFacing(facing) {
    this.#players.forEach((player) => player.updateFacing(facing));
  }

  #setRestOfPlayers(count) {
    const players = this.#controller.getPlayers(count);
    if (players.length > 10) {
      throw new Error(
        "Teams must be 10 + Goal Keeper. Only return 10 players.",
      );
    }
    this.#players.push(...players);

    this.resetPlayers();
  }

  resetPlayers() {
    const fieldHeight = GameEngine.canvas.height;
    const { offset } = this.#game.render.field;
    const gameFieldHeight = fieldHeight - offset * 2;

    const defenderPoints = calculatePoints(
      gameFieldHeight,
      this.defenders.length,
    );
    for (let i = 0; i < defenderPoints.length; i++) {
      const defender = this.defenders[i];
      defender.position.y = defenderPoints[i] + offset;
    }

    const midPoints = calculatePoints(gameFieldHeight, this.mids.length);
    for (let i = 0; i < midPoints.length; i++) {
      const mid = this.mids[i];
      mid.position.y = midPoints[i] + offset;
    }

    const forwardPoints = calculatePoints(
      gameFieldHeight,
      this.forwards.length,
    );
    for (let i = 0; i < forwardPoints.length; i++) {
      const forward = this.forwards[i];
      forward.position.y = forwardPoints[i] + offset;
    }
  }

  get color() {
    return this.#color;
  }

  get name() {
    return this.#name;
  }

  update(deltaTime) {
    this.#controller.update(deltaTime);
    this.#players.forEach((player) => player.update(deltaTime));
  }

  draw() {
    this.#players.forEach((player) => player.draw());
  }

  setGoalKeeper(x) {
    const [goalKeeper] = this.#players;

    goalKeeper.setPosition(new Vector(x, GameEngine.canvas.height / 2));
  }
}
