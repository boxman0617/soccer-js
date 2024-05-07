export class Coin {
  #sides = ["heads", "tails"];

  opposite(coinSide) {
    return this.#sides.find((side) => side !== coinSide);
  }

  toss() {
    return this.#sides[Math.round(Math.random())];
  }
}
