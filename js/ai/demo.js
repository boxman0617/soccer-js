import { MidFielder } from "../mid-fielder.js";
import { Forward } from "../forward.js";
import { Defender } from "../defender.js";

export class DemoAI {
  #game;
  #main;
  #team;

  #state = {
    ball: {
      direction: Math.random() * 360,
    },
    hasKickedBall: false,
  };

  constructor(game, main) {
    this.#game = game;
    this.#main = main;
  }

  setTeam(team) {
    this.#team = team;
  }

  update(deltaTime) {}

  getPlayers(count) {
    return [
      ...new Array(4)
        .fill(0)
        .map(() => new Defender(this.#team, count.next().value)),
      ...new Array(4)
        .fill(0)
        .map(() => new MidFielder(this.#team, count.next().value)),
      ...new Array(2)
        .fill(0)
        .map(() => new Forward(this.#team, count.next().value)),
    ];
  }
}
