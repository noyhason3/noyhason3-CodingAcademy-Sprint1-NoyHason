window.addEventListener(
  'contextmenu',
  function (e) {
    e.preventDefault();
  },
  false
);

const MINE = '💥';
const FLAG = '🚩';

var gHistory = [];

var gNewScore;
var gTimeDisplay;

var gLevel = { SIZE: 4, MINES: 2 };
var gNonMineCellsCount = gLevel.SIZE ** 2 - gLevel.MINES;
var gBoard;
var gMines = [];
var gIsTimerOn = false;
var gIsHintMode = false;
var gHintsCount = 3;
var gSafeClickCount = 3;

var gGame = {
  isOn: true,
  lives: 3,
  shownCount: 0,
  markedCount: 0,
  secsPassed: 0,
};

function init() {
  document.querySelector('.timer'), (innerText = gGame.secsPassed);
  document.querySelector('.mines-count span').innerText = gLevel.MINES;
  document.querySelector('.lives span').innerText = gGame.lives;
  document.querySelector('.best-score span').innerText = extractFromLocalStorage('bestScore');
  document.querySelector('.safe-click-count span').innerText = gSafeClickCount;

  gGame.secsPassed = 0;
  gBoard = buildBoard(gLevel.SIZE);
  renderBoard(gBoard, '.board-container');
}

function chooseLevel(level) {
  switch (level) {
    case 'easy':
      gLevel = { SIZE: 4, MINES: 2 };
      gGame.lives = 1;
      break;
    case 'medium':
      gLevel = { SIZE: 8, MINES: 12 };
      break;
    case 'hard':
      gLevel = { SIZE: 12, MINES: 30 };
      break;
  }
  removeFromLocalStorage('bestScore');
  restart();
}

function buildBoard(size) {
  var board = [];

  for (var i = 0; i < size; i++) {
    board[i] = [];

    for (var j = 0; j < size; j++) {
      var cell = {
        minesAroundCount: 0,
        isShown: false,
        isMine: false,
        isMarked: false,
      };

      board[i][j] = cell;
    }
  }
  console.log(board);
  return board;
}

function putMines(row, col) {
  var counter = gLevel.MINES;

  for (var i = 0; i < gLevel.SIZE; i++) {
    for (var j = 0; j < gLevel.SIZE; j++) {
      if (counter && Math.random() > 0.5) {
        if (i === row && j === col) continue;
        gBoard[i][j].isMine = true;
        gMines.push({ i: i, j: j });
        counter--;
      }
    }
  }
  console.log(gMines);
}

function setMineNegsCount(board) {
  for (var i = 0; i < board.length; i++) {
    for (var j = 0; j < board.length; j++) {
      var cell = board[i][j];
      if (cell.isMine) continue;
      cell.minesAroundCount = countMineNegs({ i: i, j: j });
    }
  }
  return board;
}

function countMineNegs(pos) {
  var counter = 0;
  for (var i = pos.i - 1; i <= pos.i + 1; i++) {
    if (i < 0 || i > gBoard.length - 1) continue;
    for (var j = pos.j - 1; j <= pos.j + 1; j++) {
      if (j < 0 || j > gBoard.length - 1) continue;
      if (i === pos.i && j === pos.j) continue;
      if (gBoard[i][j].isMine) counter++;
    }
  }
  return counter;
}

function renderNegsCells(pos) {
  var negsCellsPos = [];
  negsCellsPos.push({ i: pos.row, j: pos.col });
  for (var i = pos.row - 1; i <= pos.row + 1; i++) {
    if (i < 0 || i > gBoard.length - 1) continue;
    for (var j = pos.col - 1; j <= pos.col + 1; j++) {
      if (j < 0 || j > gBoard.length - 1) continue;
      if (i === pos.row && j === pos.col) continue;
      var cell = gBoard[i][j];
      if (cell.isShown || cell.isMarked) continue;

      cell.isShown = true;
      negsCellsPos.push({ i: i, j: j });
      gGame.shownCount++;
      var elCell = document.querySelector(`.cell-${i}-${j}`);
      elCell.innerHTML = cell.minesAroundCount ? cell.minesAroundCount : '';
      if (elCell.innerHTML === '' && !gIsHintMode)
      renderNegsCells({ row: i, col: j }); 
      elCell.classList.add('shown');
    }
  }
  return negsCellsPos;
}

function cellClicked(elCell, i, j) {
  if (!gGame.isOn) return;
  if (gGame.secsPassed === 0) gGame.secsPassed = startTimer();

  var cell = gBoard[i][j];
  if (cell.isMarked) return;
  if (cell.isShown) return;

  if (!gMines.length) {
    putMines(i, j);
    setMineNegsCount(gBoard);
  }
  if (gIsHintMode) {
    renderCell(elCell, { i: i, j: j });
    var negsCells = renderNegsCells({ row: i, col: j });
    gIsHintMode = false;
    setTimeout(backFromHintMode, 1000, negsCells);
  }
  renderCell(elCell, { i: i, j: j });

  if (cell.isMine) {
    gGame.lives--;
    document.querySelector('.lives span').innerText = gGame.lives;
    gLevel.MINES--;
    if (gGame.lives === 0) return gameOver('Game-Over!');
  }

  cell.isShown = true;
  gGame.shownCount++;

  if (!cell.minesAroundCount && !cell.isMine) {
    renderNegsCells({ row: i, col: j });
  }
  if (
    gGame.markedCount === gLevel.MINES &&
    gGame.shownCount === gNonMineCellsCount
  ) {
    gameOver('Victory!');
  }

  gHistory.push({
    lives: gGame.lives,
    shownCount: gGame.shownCount,
    renderedCell: { i, j },
  });
}

function cellMarked(elCell, i, j) {
  if (!gGame.isOn) return;
  if (gGame.secsPassed === 0) gGame.secsPassed = startTimer();
  var cell = gBoard[i][j];
  if (cell.isShown) return;
  if (elCell.innerHTML !== FLAG) {
    cell.isMarked = true;
    elCell.innerHTML = FLAG;
    gGame.markedCount++;
  } else {
    cell.isMarked = false;
    elCell.innerHTML = '';
    gGame.markedCount--;
  }
  if (
    gGame.markedCount === gLevel.MINES &&
    gGame.shownCount === gNonMineCellsCount
  ) {
    gameOver('Victory!');
  }
  gHistory.push({markedCount: gGame.markedCount, markedCell: {i,j}});
}

function renderCell(elCell, pos) {
  cell = gBoard[pos.i][pos.j];
  if (cell.isMine === true) {
    cell.isShown = true;
    elCell.innerText = MINE;
  } else {
    elCell.innerText = cell.minesAroundCount ? cell.minesAroundCount : '';
  }
  elCell.classList.add('shown');
}

function renderAllMines() {
  for (var i = 0; i < gMines.length; i++) {
    var row = gMines[i].i;
    var col = gMines[i].j;
    gBoard[row][col].isShown = true;
    var elCell = document.querySelector(`.cell-${row}-${col}`);
    elCell.classList.add('shown');
    elCell.innerHTML = MINE;
  }
}

function gameOver(result) {
  stopTimer();
  var modal = document.querySelector('.modal-container');
  var smiley = document.querySelector('.game-starter');
  if (result === 'Victory!') {
    smiley.innerText = '😍';
    checkBestScore();
  } else {
    renderAllMines();
    smiley.innerText = '😢';
  }

  modal.querySelector('.result').innerText = result;
  modal.style.display = 'block';

  gGame.isOn = false;
}

function restart() {
  document.querySelector('.modal-container').style.display = 'none';
  var smiley = document.querySelector('.game-starter');
  document.querySelector('.hints').innerHTML =
    'hints: <span data-id="1">X</span>   <span data-id="2">X</span>   <span data-id="3">X</span>';
  smiley.innerText = '😀';
  gGame.shownCount = 0;
  gGame.markedCount = 0;
  gGame.isOn = true;
  gGame.lives = gLevel.SIZE === 4 ? 1 : 3;
  gMines = [];
  gHintsCount = 3;
  gSafeClickCount = 3;
  if (gIsTimerOn) stopTimer();
  gGame.secsPassed = 0;
  document.querySelector('.timer').innerText = '00:00:00';
  gHistory = [];
  gMovesCount = 0;
  init();
}

function backFromHintMode(negsCellsPos) {
  for (var i = 0; i < negsCellsPos.length; i++) {
    var row = negsCellsPos[i].i;
    var col = negsCellsPos[i].j;
    gBoard[row][col].isShown = false;
    elNegCell = document.querySelector(`.cell-${row}-${col}`);
    elNegCell.classList.remove('shown');
    elNegCell.innerHTML = '';
  }
  // var hints = document.querySelector(`.hints`)
  var hint = document.querySelector(`.hints [data-id="${gHintsCount}"]`);
  hint.style.display = 'none';
  gHintsCount--;
}

function getHint(hints) {
  if (!gHintsCount || gIsHintMode) return;
  var hint = hints.querySelector(`[data-id="${gHintsCount}"]`);
  gIsHintMode = true;
  hint.style.backgroundColor = 'yellow';

  gHistory.push({hintsCount: gHintsCount});
}

function safeClick() {
  if (!gIsTimerOn) return;
  if (!gSafeClickCount) return;
  gSafeClickCount--;
  document.querySelector('.safe-click-count span').innerText = gSafeClickCount;

  var safeCellsPos = [];
  for (var i = 0; i < gBoard.length; i++) {
    for (var j = 0; j < gBoard.length; j++) {
      var currCell = gBoard[i][j];
      if (!currCell.isShown && !currCell.isMine)
        safeCellsPos.push({ i: i, j: j });
    }
  }
  var safeCellIdx = safeCellsPos.splice(
    getRandomInt(0, safeCellsPos.length),
    1
  );

  var elSafeCell = document.querySelector(
    `.cell-${safeCellIdx[0].i}-${safeCellIdx[0].j}`
  );
  // elSafeCell.style.border = '2px solid red';
  elSafeCell.classList.add('safe-cell');

  // setTimeout(function(){elSafeCell.style.border = '2px solid white'}, 1000)
  setTimeout(function () {
    elSafeCell.classList.remove('safe-cell');
  }, 1000);

  gHistory.push({
    lives: gGame.lives,
    shownCount: gGame.shownCount,
    safeClickes: gSafeClickCount,
  });
}

function undo() {
  var lastMove = gHistory.pop();

  if (lastMove.lives){
    gGame.lives = lastMove.lives;
    document.querySelector('.lives span').innerText = gGame.lives;
  }

  if (lastMove.shownCount) {
    gGame.shownCount = lastMove.shownCount;
  }

  if (lastMove.safeClick) {
  gSafeClickCount = lastMove.safeClickes;
  document.querySelector('.safe-click-count span').innerText = gSafeClickCount;
  }
  
  if (lastMove.markedCell) {
    gGame.markedCount = lastMove.markedCount;
    var iPos = lastMove.markedCell.i;
    var jPos = lastMove.markedCell.j;

    var markedCell = gBoard[(iPos, jPos)];
    markedCell.isMarked = false;
    elMarkedCell = document.querySelector(`.cell-${iPos}-${jPos}`);
    elMarkedCell.innerHTML = '';
  }
    
  if (lastMove.renderedCell) {
     gGame.shownCount = lastMove.shownCount;
      var iPos = lastMove.renderedCell.i;
      var jPos = lastMove.renderedCell.j;
      var renderedCell = gBoard[iPos][jPos];
      
      renderedCell.minesAroundCount = countMineNegs({ i: iPos, j: jPos });
      renderedCell.isShown = false;
      elRenderedCell = document.querySelector(`.cell-${iPos}-${jPos}`);
      elRenderedCell.classList.remove('shown');
      elRenderedCell.innerText = '';
  }

  if (lastMove.hintsCount){
      gHintsCount = lastMove.hintsCount;
      document.querySelector('.hints').innerHTML += `<span data-id="${gHintsCount}"> X</span>`;
  }
}
