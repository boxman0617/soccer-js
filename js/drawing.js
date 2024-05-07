import { GameEngine } from "./game-engine.js";
import { Vector } from "./vector.js";

export class Drawing {
  static line(color, startVector, endVector) {
    GameEngine.ctx.beginPath();
    GameEngine.ctx.strokeStyle = color;
    GameEngine.ctx.moveTo(...startVector.toArray());
    GameEngine.ctx.lineTo(...endVector.toArray());
    GameEngine.ctx.stroke();
    GameEngine.ctx.closePath();
  }

  static circle(color, center, r) {
    GameEngine.ctx.beginPath();
    GameEngine.ctx.arc(...center.toArray(), r, 0, Math.PI * 2);
    GameEngine.ctx.fillStyle = color;
    GameEngine.ctx.fill();
    GameEngine.ctx.closePath();
  }

  static text(color, text, location, font = "20px Arial") {
    GameEngine.ctx.fillStyle = color;
    GameEngine.ctx.font = font;
    GameEngine.ctx.fillText(text, ...location.toArray());
  }
}
