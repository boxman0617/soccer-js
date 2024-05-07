import { GameEngine } from "./game-engine.js";
import { DemoAI } from "./ai/demo.js";
import { Coin } from "./coin.js";
import { counter } from "./counter.js";
import debugEngine from "./debug-engine.js";

let game;

document.addEventListener("DOMContentLoaded", () => {
  game = new GameEngine();
  debugEngine.init();

  const coin = new Coin();
  const side = coin.toss();

  const count = counter();
  game.addTeam1("AlanAI", new DemoAI(game, true), side, count);
  game.addTeam2("BobAI", new DemoAI(game, false), coin.opposite(side), count);

  game.init(coin.toss());

  window._game = game;
  window._GameEngine = GameEngine;
  window._debug = debugEngine;
});
