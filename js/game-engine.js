import { Ball } from "./ball.js";
import { Team } from "./team.js";
import { calculateAngle, Facing } from "./utils.js";
import { Vector } from "./vector.js";
import { Drawing } from "./drawing.js";

// team1 -> Left
// team2 -> Right

export class GameEngine {
  #team1;
  #team2;

  #kickOffTeam;

  #gameStages = {
    kickOff: "kickOff",
    game: "game",
    goal: "goal",
    gameOver: "gameOver",
  };
  #gameStage = this.#gameStages.kickOff;

  #fps = {
    frameCount: 0,
    value: 0,
    lastTime: 0,
  };

  #ball;

  #lastUpdate;

  static isDebug = true;
  static debugStates = {
    clickFollow: {
      enabled: true,
      player: null,
    },
    clickKick: {
      enabled: false,
    },
  };

  #paused = false;
  #loopTimeout = null;

  render = {
    field: {
      offset: 50,
      goalLineHeight: 150,
      goalLineDepth: 50,
      goalDepth: 30,
    },
    positions: {
      goalKeeper: {
        startOffset: 20,
      },
    },
  };

  static ctx;
  static canvas;

  #boundDraw;

  constructor() {
    if (!GameEngine.ctx) {
      GameEngine.canvas = document.getElementById("soccer-field");
      GameEngine.canvas.addEventListener(
        "click",
        this.#handleClick.bind(this),
        false,
      );
      GameEngine.canvas.addEventListener(
        "mousemove",
        this.#handleMouseMove.bind(this),
      );
      window.addEventListener("keyup", this.#handleKeypress.bind(this));
      GameEngine.ctx = GameEngine.canvas.getContext("2d");
    }
    this.#boundDraw = this.#draw.bind(this);
    this.#lastUpdate = Date.now();
  }

  get teams() {
    return [this.#team1, this.#team2];
  }

  get isGameStage() {
    return this.#gameStage === this.#gameStages.game;
  }

  get players() {
    return [...this.#team1.players, ...this.#team2.players];
  }

  get ball() {
    return this.#ball;
  }

  get deltaTime() {
    if (this.#paused) return 0.1;
    const now = Date.now();
    return now - this.#lastUpdate;
  }

  get field() {
    const fieldWidth = GameEngine.canvas.width;
    const fieldHeight = GameEngine.canvas.height;
    const gameFieldWidth = fieldWidth - this.render.field.offset * 2;
    const gameFieldHeight = fieldHeight - this.render.field.offset * 2;

    const halfWidth = fieldWidth / 2;
    const halfHeight = fieldHeight / 2;

    const goalLineY = halfHeight - this.render.field.goalLineHeight / 2;
    const goalHeight = this.render.field.goalLineHeight / 1.5;
    const goalY = halfHeight - goalHeight / 2;

    return {
      ...this.render.field,
      fieldWidth,
      fieldHeight,
      gameFieldWidth,
      gameFieldHeight,
      halfWidth,
      halfHeight,
      goalLineY,
      goalHeight,
      goalY,
    };
  }

  get fieldParameterRect() {
    const { offset, gameFieldWidth, gameFieldHeight } = this.field;

    return [offset, offset, gameFieldWidth, gameFieldHeight];
  }

  // This draws the left goalkeeper box (not the goal)
  get team1GoalKeeperRect() {
    const { offset, goalLineHeight, goalLineDepth, goalLineY } = this.field;

    return [offset, goalLineY, goalLineDepth, goalLineHeight];
  }

  // This draws the right goalkeeper box (not the goal)
  get team2GoalKeeperRect() {
    const { offset, goalLineY, goalLineHeight, goalLineDepth, fieldWidth } =
      this.field;

    return [fieldWidth - offset * 2, goalLineY, goalLineDepth, goalLineHeight];
  }

  // This draws the left goal box
  get team1GoalRect() {
    const { offset, goalDepth, goalY, goalHeight } = this.field;

    return [offset - goalDepth, goalY, goalDepth, goalHeight];
  }

  // This draws the right goal box
  get team2GoalRect() {
    const { offset, goalDepth, goalY, goalHeight, fieldWidth } = this.field;

    return [fieldWidth - offset, goalY, goalDepth, goalHeight];
  }

  get team1GoalEntryLine() {
    const [cornerX, cornerY, goalWidth, goalHeight] = this.team1GoalRect;
    return [
      new Vector(cornerX + goalWidth, cornerY),
      new Vector(cornerX + goalWidth, cornerY + goalHeight),
    ];
  }

  get team2GoalEntryLine() {
    const [cornerX, cornerY, _, goalHeight] = this.team2GoalRect;
    return [
      new Vector(cornerX, cornerY),
      new Vector(cornerX, cornerY + goalHeight),
    ];
  }

  toggleDebug() {
    GameEngine.isDebug = !GameEngine.isDebug;
  }

  setDebugState(key, value) {
    GameEngine.debugStates[key] = value;
  }

  consoleDebugState() {
    console.log(GameEngine.debugStates);
  }

  #handleMouseMove(event) {
    const rect = GameEngine.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const mousePoint = new Vector(x, y);

    this.#notifyPlayersTheyAreBeingHoveredOn(mousePoint);
  }

  #notifyPlayersTheyAreBeingHoveredOn(mousePoint) {
    if (!GameEngine.isDebug) return;

    this.players.forEach((player) => {
      player.setMouseOverStatus(mousePoint);
    });
  }

  #handleKeypress({ key }) {
    switch (key) {
      case "k": {
        this.#handleDebugKick();
        break;
      }
      default: {
        console.log(`Key pressed: [${key}]`);
      }
    }
  }

  #handleClick(event) {
    const rect = GameEngine.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clickPoint = new Vector(x, y);

    this.#kickBallTowardsMouseClick(clickPoint);
    this.#havePlayerFollowMouseClick(clickPoint);
  }

  #havePlayerFollowMouseClick(clickPoint) {
    if (
      GameEngine.isDebug === false ||
      GameEngine.debugStates.clickFollow.enabled === false
    ) {
      return;
    }

    if (GameEngine.debugStates.clickFollow.player !== null) {
      const player = GameEngine.debugStates.clickFollow.player;
      player.setNextWayPoint(clickPoint);
    } else {
      for (const player of this.players) {
        if (player.isPointOverMe(clickPoint)) {
          GameEngine.debugStates.clickFollow.player = player;
          break;
        }
      }
    }
  }

  #kickBallTowardsMouseClick(clickPoint) {
    if (
      GameEngine.isDebug === false ||
      GameEngine.debugStates.clickKick.enabled === false
    ) {
      return;
    }

    const strength = this.ball.position.distance(clickPoint) / 20;
    const angleToClick = calculateAngle(this.ball.position, clickPoint);
    this.ball.kick(
      new Vector(
        strength * Math.cos(angleToClick),
        strength * Math.sin(angleToClick),
      ),
    );
  }

  addTeam1(teamName, controller, coinSide, count) {
    this.#team1 = new Team(
      teamName,
      "#ff8500",
      controller,
      this,
      1,
      coinSide,
      count,
    );
    this.#team1.setFacing(Facing.right);
  }

  addTeam2(teamName, controller, coinSide, count) {
    this.#team2 = new Team(
      teamName,
      "#0021ff",
      controller,
      this,
      2,
      coinSide,
      count,
    );
    this.#team2.setFacing(Facing.left);
  }

  init(coinSide) {
    this.#ball = new Ball();
    this.#ball.centerOnField();
    this.#initGoalKeepers();
    this.#initRestOfPlayers();

    this.#kickOffTeam =
      this.#team1.coinSide === coinSide ? this.#team1 : this.#team2;

    this.#draw();

    setTimeout(() => {
      this.#setKickOffPositions();
    }, 1000);
  }

  #initRestOfPlayers() {
    const { offset } = this.render.field;
    const fieldWidth = GameEngine.canvas.width;
    const fieldHeight = GameEngine.canvas.height;
    const gameFieldWidth = fieldWidth - offset * 2;
    const gameFieldHeight = fieldHeight - offset * 2;

    const defenderLine = 100;
    this.#team1.defenders.forEach((player) => {
      player.position.x = offset + defenderLine;
    });
    this.#team2.defenders.forEach((player) => {
      player.position.x = gameFieldWidth + offset - defenderLine;
    });

    const midLine = 200;
    this.#team1.mids.forEach((player) => {
      player.position.x = offset + midLine;
    });
    this.#team2.mids.forEach((player) => {
      player.position.x = gameFieldWidth + offset - midLine;
    });

    const forwardLine = 300;
    this.#team1.forwards.forEach((player) => {
      player.position.x = offset + forwardLine;
    });
    this.#team2.forwards.forEach((player) => {
      player.position.x = gameFieldWidth + offset - forwardLine;
    });
  }

  #initGoalKeepers() {
    const { startOffset } = this.render.positions.goalKeeper;
    const { offset } = this.render.field;
    this.#team1.setGoalKeeper(offset + startOffset);

    const fieldWidth = GameEngine.canvas.width;
    const gameFieldWidth = fieldWidth - offset * 2;
    this.#team2.setGoalKeeper(offset - startOffset + gameFieldWidth);
  }

  #drawField() {
    const {
      offset,
      goalLineHeight,
      fieldHeight,
      fieldWidth,
      halfWidth,
      halfHeight,
    } = this.field;

    GameEngine.ctx.fillStyle = "green";
    GameEngine.ctx.fillRect(0, 0, fieldWidth, fieldHeight);

    // Draw perimeter
    GameEngine.ctx.beginPath();
    GameEngine.ctx.strokeStyle = "white";
    GameEngine.ctx.rect(...this.fieldParameterRect);
    GameEngine.ctx.lineWidth = 5;
    GameEngine.ctx.stroke();

    // Draw the center circle
    GameEngine.ctx.beginPath();

    GameEngine.ctx.arc(
      halfWidth,
      halfHeight,
      goalLineHeight / 2,
      0,
      2 * Math.PI,
      false,
    );
    GameEngine.ctx.stroke();

    // Draw the half way line
    GameEngine.ctx.beginPath();
    GameEngine.ctx.moveTo(halfWidth, offset);
    GameEngine.ctx.lineTo(halfWidth, fieldHeight - offset);
    GameEngine.ctx.stroke();

    // Draw the left goal line
    GameEngine.ctx.beginPath();
    GameEngine.ctx.rect(...this.team1GoalKeeperRect);
    GameEngine.ctx.stroke();

    // Draw the left goal box
    GameEngine.ctx.beginPath();
    GameEngine.ctx.rect(...this.team1GoalRect);
    GameEngine.ctx.stroke();

    // Draw the right goal line
    GameEngine.ctx.beginPath();
    GameEngine.ctx.rect(...this.team2GoalKeeperRect);
    GameEngine.ctx.stroke();

    // Draw the right goal box
    GameEngine.ctx.beginPath();
    GameEngine.ctx.rect(...this.team2GoalRect);
    GameEngine.ctx.stroke();
  }

  #update(dt) {
    const isPlayableStage = ![
      this.#gameStages.goal,
      this.#gameStages.gameOver,
    ].includes(this.#gameStage);

    if (isPlayableStage) {
      this.#ball.update(dt);

      this.#handleBoundaryCollisionForBall();

      this.#team1.update(dt);
      this.#team2.update(dt);
    } else {
      this.#ball.update(dt);
    }

    this.#lastUpdate = Date.now();
  }

  #handleBoundaryCollisionForBall() {
    const { topY, bottomY, leftX, rightX } = this.getFieldBoundingBox();

    if (this.#ball.position.x - this.#ball.radius <= leftX) {
      this.#handleLeftWallCollision();
    }

    if (this.#ball.position.x + this.#ball.radius >= rightX) {
      this.#handleRightWallCollision();
    }

    if (this.#ball.position.y - this.#ball.radius <= topY) {
      this.#ball.position.y = topY + this.#ball.radius;
      this.#ball.velocity.y *= -1;
    }

    if (this.#ball.position.y + this.#ball.radius >= bottomY) {
      this.#ball.position.y = bottomY - this.#ball.radius;
      this.#ball.velocity.y *= -1;
    }
  }

  #handleRightWallCollision() {
    const { rightX } = this.getFieldBoundingBox();
    const [cornerX, cornerY, _, goalHeight] = this.team2GoalRect;

    const top = new Vector(cornerX, cornerY);
    const bottom = new Vector(cornerX, cornerY + goalHeight);

    const ballY = this.#ball.position.y;
    const ballR = this.#ball.radius;
    const topBall = ballY - ballR;
    const bottomBall = ballY + ballR;

    if (topBall > top.y && bottomBall < bottom.y) {
      this.#handleGoal(this.#team1);
    } else {
      this.#ball.position.x = rightX - this.#ball.radius;
      this.#ball.velocity.x *= -1;
    }
  }

  #handleLeftWallCollision() {
    const { leftX } = this.getFieldBoundingBox();
    const [cornerX, cornerY, goalDepth, goalHeight] = this.team1GoalRect;

    const top = new Vector(cornerX + goalDepth, cornerY);
    const bottom = new Vector(cornerX + goalDepth, cornerY + goalHeight);

    const ballY = this.#ball.position.y;
    const ballR = this.#ball.radius;
    const topBall = ballY - ballR;
    const bottomBall = ballY + ballR;

    if (topBall > top.y && bottomBall < bottom.y) {
      this.#handleGoal(this.#team2);
    } else {
      this.#ball.position.x = leftX + this.#ball.radius;
      this.#ball.velocity.x *= -1;
    }
  }

  getFieldBoundingBox() {
    // topLeft = (fX, fY)
    // fX + fW
    // fY + fH
    const [fX, fY, fW, fH] = this.fieldParameterRect;
    const [topY, bottomY, leftX, rightX] = [fY, fY + fH, fX, fX + fW];
    return { topY, bottomY, leftX, rightX };
  }

  pause() {
    this.#paused = true;
  }

  resume() {
    this.#paused = false;
  }

  step() {
    const dt = this.deltaTime;

    this.#update(dt);

    this.#clearCanvas();

    this.#drawField();

    this.#ball.draw();
    this.#team1.draw();
    this.#team2.draw();

    this.#drawDebug();

    this.#calculateFps();
  }

  #calculateFps() {
    if (!GameEngine.isDebug) return;

    const now = performance.now();

    if (!this.#fps.lastTime) this.#fps.lastTime = now;

    const frameDT = now - this.#fps.lastTime;
    if (frameDT >= 1000) {
      this.#fps.value = this.#fps.frameCount / (frameDT / 1000);

      this.#fps.frameCount = 0;
      this.#fps.lastTime = now;
    }

    this.#fps.frameCount++;
  }

  #draw() {
    if (this.#paused) return;

    this.step();

    if (this.#loopTimeout) clearTimeout(this.#loopTimeout);
    this.#loopTimeout = setTimeout(this.#boundDraw, 16);
  }

  #clearCanvas() {
    GameEngine.ctx.clearRect(
      0,
      0,
      GameEngine.canvas.width,
      GameEngine.canvas.height,
    );
  }

  #setKickOffPositions() {
    const [first, second] = this.#kickOffTeam.lastTwoPlayers;
    const centerOfField = new Vector(
      GameEngine.canvas.width / 2,
      GameEngine.canvas.height / 2,
    );

    const leftTeam = this.#kickOffTeam === this.#team1;

    first.setNextWayPoint(
      centerOfField.add(new Vector(leftTeam ? -5 : 5, -20)),
    );

    setTimeout(() => {
      second.setNextWayPoint(
        centerOfField.add(new Vector(leftTeam ? -50 : 50, 40)),
      );
      const players = this.#kickOffTeam.players.slice(
        1, // skip the goal keeper
        this.#kickOffTeam.players.length - 2,
      );

      for (const player of players) {
        const playersOffsetX = leftTeam ? 50 : -50;
        const moveUp = new Vector(playersOffsetX, 0);

        player.setNextWayPoint(player.position.add(moveUp));
      }

      setTimeout(() => {
        this.#startGame();
      }, 3000);
    }, 1000);
  }

  #startGame() {
    this.#gameStage = this.#gameStages.game;
  }

  #handleGoal(scoringTeam) {
    console.log("GOAL!!!");
    this.#ball.setInGoal(true);
    this.#gameStage = this.#gameStages.goal;
    scoringTeam.increaseScore();

    setTimeout(() => {
      this.#resetGameAfterGoal(scoringTeam);
    }, 2000);
  }

  #resetGameAfterGoal(scoringTeam) {
    this.#ball.centerOnField();
    this.#ball.setInGoal(false);
    this.#team1.resetPlayers();
    this.#team2.resetPlayers();
    this.#initGoalKeepers();
    this.#initRestOfPlayers();

    this.#setKickoffTeamAfterGoal(scoringTeam);

    this.#resetEverythingAfterGoal();
    this.#setKickOffPositions();
  }

  #setKickoffTeamAfterGoal(scoringTeam) {
    this.#kickOffTeam = scoringTeam === this.#team1 ? this.#team2 : this.#team1;
  }

  #handleDebugKick() {
    if (
      GameEngine.isDebug === false ||
      GameEngine.debugStates.clickFollow.enabled === false ||
      GameEngine.debugStates.clickFollow.player === null
    ) {
      return;
    }

    const { player } = GameEngine.debugStates.clickFollow;
    if (player.isDribbling) {
      const forceMagnitude = 10;
      const kickForce = new Vector(
        forceMagnitude * Math.cos(player.facing),
        forceMagnitude * Math.sin(player.facing),
      );
      this.ball.kick(kickForce);
    }
  }

  #drawDebug() {
    if (GameEngine.isDebug) {
      Drawing.text(
        "#ff9a00",
        `FPS: ${this.#fps.value.toFixed(2)}`,
        new Vector(10, 35),
        "bold 23px Arial",
      );

      const fieldWidth = GameEngine.canvas.width;
      const fieldHeight = GameEngine.canvas.height;
      Drawing.text(
        this.#team1.color,
        `T1: ${this.#team1.score}`,
        new Vector(10, fieldHeight - 10),
        "bold 23px Arial",
      );
      Drawing.text(
        this.#team2.color,
        `T2: ${this.#team2.score}`,
        new Vector(fieldWidth - 80, fieldHeight - 10),
        "bold 23px Arial",
      );
    }
  }

  get debugScore() {
    return [this.#team1.score, this.#team2.score];
  }

  #resetEverythingAfterGoal() {
    this.players.forEach((player) => {
      player.setVelocity(Vector.zero());
      player.setNextWayPoint(null);
    });
    this.ball.setVelocity(Vector.zero());
  }
}
