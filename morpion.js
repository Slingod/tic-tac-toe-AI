class Morpion {
  humanPlayer = "J1";
  iaPlayer = "J2";
  turn = 0;
  gameOver = false;
  difficulty = "easy";

  gridMap = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
  history = [];
  future = [];

  constructor(firstPlayer = "J1") {
    this.humanPlayer = firstPlayer;
    this.iaPlayer = firstPlayer === "J1" ? "J2" : "J1";

    // Charge la difficulté avant d'initialiser le jeu
    const savedDifficulty = localStorage.getItem('morpion-difficulty');
    if (savedDifficulty) {
      this.difficulty = savedDifficulty;
    }

    this.initGame();
    this.loadGame();
  }

  initGame = () => {
    this.gridMap.forEach((line, y) => {
      line.forEach((cell, x) => {
        this.getCell(x, y).className = "cell"; // Nettoyage de la classe avant jeu
        this.getCell(x, y).onclick = () => this.doPlayHuman(x, y);
      });
    });

    document.getElementById("undo-btn").onclick = this.handleUndo;
    document.getElementById("redo-btn").onclick = this.handleRedo;
    document.getElementById("difficulty").onchange = (e) => {
      this.difficulty = e.target.value;
      localStorage.setItem('morpion-difficulty', this.difficulty); // garde en mémoire
    };
    document.getElementById('difficulty').value = this.difficulty;

    if (this.iaPlayer === "J1") {
      this.doPlayIa();
    }
  };

  getCell = (x, y) => {
    const column = x + 1;
    const lines = ["A", "B", "C"];
    return document.getElementById(`${lines[y]}${column}`);
  };

  getBoardWinner = (board) => {
    const isWinningRow = ([a, b, c]) => a !== null && a === b && b === c;
    let winner = null;

    board.forEach((line) => {
      if (isWinningRow(line)) winner = line[0];
    });

    [0, 1, 2].forEach((col) => {
      if (isWinningRow([board[0][col], board[1][col], board[2][col]])) {
        winner = board[0][col];
      }
    });

    const diagonal1 = [board[0][0], board[1][1], board[2][2]];
    const diagonal2 = [board[0][2], board[1][1], board[2][0]];
    if (isWinningRow(diagonal1) || isWinningRow(diagonal2)) winner = board[1][1];

    if (winner) return winner;
    return board.flat().every((c) => c) ? "tie" : null;
  };

  checkWinner = () => {
    const winner = this.getBoardWinner(this.gridMap);
    if (!winner) return;

    this.gameOver = true;
    switch (winner) {
      case "tie":
        this.displayEndMessage("Égalité !");
        break;
      case this.iaPlayer:
        this.displayEndMessage("L'IA a gagné !");
        break;
      case this.humanPlayer:
        this.displayEndMessage("Tu as gagné !");
        break;
    }
  };

  displayEndMessage = (message) => {
    const endMessageElement = document.getElementById("end-message");
    endMessageElement.textContent = message;
    endMessageElement.style.display = "block";
  };

  drawHit = (x, y, player) => {
    if (this.gridMap[y][x] !== null) return false;
    this.gridMap[y][x] = player;
    this.turn++;
    this.getCell(x, y).classList.add(`filled-${player}`);
    this.history.push(JSON.parse(JSON.stringify(this.gridMap)));
    this.future = [];
    this.saveGame();
    this.checkWinner();
    return true;
  };

  doPlayHuman = (x, y) => {
    if (this.gameOver) return;
    if (this.drawHit(x, y, this.humanPlayer)) {
      this.doPlayIa();
    }
  };

  doPlayIa = () => {
    if (this.gameOver) return;
    let move;
    switch (this.difficulty) {
      case "easy":
        move = this.easyAI(this.gridMap);
        break;
      case "medium":
        move = this.mediumAI(this.gridMap);
        break;
      case "hard":
        move = this.minmax(this.gridMap, true).move;
        break;
    }
    if (move) this.drawHit(move.x, move.y, this.iaPlayer);
  };

  easyAI = (board) => {
    const empty = [];
    board.forEach((line, y) =>
      line.forEach((cell, x) => cell === null && empty.push({ x, y }))
    );
    return empty[Math.floor(Math.random() * empty.length)];
  };

  mediumAI = (board) => {
    for (const player of [this.iaPlayer, this.humanPlayer]) {
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (!board[y][x]) {
            board[y][x] = player;
            if (this.getBoardWinner(board) === player) {
              board[y][x] = null;
              return { x, y };
            }
            board[y][x] = null;
          }
        }
      }
    }
    return this.easyAI(board);
  };

  minmax = (board, isMaximizing) => {
    const winner = this.getBoardWinner(board);
    if (winner === this.iaPlayer) return { score: 1 };
    if (winner === this.humanPlayer) return { score: -1 };
    if (winner === "tie") return { score: 0 };
    let bestMove = null;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (board[y][x] === null) {
            board[y][x] = this.iaPlayer;
            const result = this.minmax(board, false).score;
            board[y][x] = null;
            if (result > bestScore) {
              bestScore = result;
              bestMove = { x, y };
            }
          }
        }
      }
      return { score: bestScore, move: bestMove };
    } else {
      let bestScore = Infinity;
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          if (board[y][x] === null) {
            board[y][x] = this.humanPlayer;
            const result = this.minmax(board, true).score;
            board[y][x] = null;
            if (result < bestScore) {
              bestScore = result;
              bestMove = { x, y };
            }
          }
        }
      }
      return { score: bestScore, move: bestMove };
    }
  };
                                                // Le HandleUndo fait avec l'aide de GPT
  handleUndo = () => {
  if (this.history.length > 2) {
    // On prend le dernier état (après l'IA) :
    const lastIaState = this.history.pop();
    this.future.unshift(lastIaState); // on met le coup IA dans le futur
    // On prend le dernier état (après le joueur) :
    const lastPlayerState = this.history.pop();
    this.future.unshift(lastPlayerState); // on met le coup joueur dans le futur
    // On revient au nouvel état "actuel"
    this.gridMap = JSON.parse(
      JSON.stringify(this.history[this.history.length - 1])
    );
    this.refreshGrid();
    this.saveGame();
  }
};

handleRedo = () => {
  if (this.future.length >= 2) {
    
    const nextPlayerState = this.future.shift();
    this.history.push(JSON.parse(JSON.stringify(nextPlayerState)));
    
    const nextIaState = this.future.shift();
    this.history.push(JSON.parse(JSON.stringify(nextIaState)));

    this.gridMap = JSON.parse(
      JSON.stringify(this.history[this.history.length - 1])
    );
    this.refreshGrid();
    this.saveGame();
  }
};

  refreshGrid = () => {
    this.gridMap.flat().forEach((c, index) => {
      const y = Math.floor(index / 3);
      const x = index % 3;
      this.getCell(x, y).className = "cell";
      if (c) this.getCell(x, y).classList.add(`filled-${c}`);
    });
  };
  saveGame = () => {
    localStorage.setItem(
      "morpion-save",
      JSON.stringify({ grid: this.gridMap, difficulty: this.difficulty })
    );
  };
  loadGame = () => {
    const saved = JSON.parse(localStorage.getItem("morpion-save"));
    if (saved) {
      this.gridMap = saved.grid;
      this.difficulty = saved.difficulty;
      this.refreshGrid();
      this.history.push(JSON.parse(JSON.stringify(this.gridMap)));
    }
  };
}
