import React, { useState, useRef } from "react";
import "./BlockBurstContainer.css";

/**
 * Piece shapes: Each piece is an array of coordinates (relative to a top-left "origin" square).
 * Sample Tetris-like pieces with various colors.
 * You can expand this to add more variety!
 */
const PIECES = [
  {
    shape: [[0,0]], // single block
    colorIndex: 1
  },
  {
    shape: [[0,0],[1,0],[2,0]], // vertical 3-line
    colorIndex: 2
  },
  {
    shape: [[0,0],[0,1],[1,1]], // L-shape
    colorIndex: 3
  },
  {
    shape: [[0,0],[1,0],[1,1],[2,1]], // skew/S-shape
    colorIndex: 1
  },
  {
    shape: [[0,0],[0,1],[1,0],[1,1]], // square
    colorIndex: 2
  },
  {
    shape: [[0,0],[1,0],[2,0],[3,0]], // vertical 4-line
    colorIndex: 3
  },
  {
    shape: [[0,0],[0,1],[0,2]], // horizontal 3-line
    colorIndex: 1
  },
  {
    shape: [[0,0],[1,0],[0,1]], // corner
    colorIndex: 2
  }
];

/**
 * Returns a new random tray of 3 pieces.
 */
function generateNewTray() {
  const randoms = [];
  // pick 3 random pieces (with possible repeats)
  for (let i=0; i<3; i++) {
    randoms.push(PIECES[Math.floor(Math.random() * PIECES.length)]);
  }
  return randoms;
}

/**
 * Returns true if a piece can be placed at the given board position.
 * @param {number[][]} board - 2d array
 * @param {number} row0 - top row of placement
 * @param {number} col0 - left col of placement
 * @param {Array<[number,number]>} shape - array of [rowOffset, colOffset]
 * @returns {boolean}
 */
function canPlace(board, row0, col0, shape) {
  for (let [dr, dc] of shape) {
    const r = row0 + dr, c = col0 + dc;
    if (
      r < 0 ||
      r >= board.length ||
      c < 0 ||
      c >= board[0].length ||
      board[r][c] !== 0
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Places a piece onto the board and returns new board array
 * If placement is invalid, returns null
 */
function putPiece(board, row0, col0, shape) {
  if (!canPlace(board, row0, col0, shape)) return null;
  const newBoard = board.map((r) => r.slice());
  for (let [dr, dc] of shape) {
    newBoard[row0 + dr][col0 + dc] = 1;
  }
  return newBoard;
}

/**
 * Clears all filled rows/cols and returns new board and number cleared.
 * @returns {[number[][], number]} new board, linesCleared
 */
function clearLines(board) {
  let linesCleared = 0;
  const size = board.length;
  let rowsToClear = Array(size).fill(false);
  let colsToClear = Array(size).fill(false);

  // Find filled rows/cols
  for (let r = 0; r < size; r++) {
    if (board[r].every((cell) => cell === 1)) {
      rowsToClear[r] = true;
      linesCleared++;
    }
  }
  for (let c = 0; c < size; c++) {
    if (board.every((row) => row[c] === 1)) {
      colsToClear[c] = true;
      linesCleared++;
    }
  }

  // Clear rows/cols
  const newBoard = board.map((row) => row.slice());
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (rowsToClear[r] || colsToClear[c]) newBoard[r][c] = 0;
    }
  }
  return [newBoard, linesCleared];
}

/**
 * Returns true if at least one of the tray pieces is playable on the board.
 */
function anyMovesPossible(board, tray) {
  for (let piece of tray) {
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[0].length; c++) {
        if (canPlace(board, r, c, piece.shape)) {
          return true;
        }
      }
    }
  }
  return false;
}

// PUBLIC_INTERFACE
function BlockBurstContainer() {
  /**
   * This main game container manages state, board rendering, scoring,
   * piece tray, drag-and-drop, line clearing, and end-game logic.
   */
  const BOARD_SIZE = 10;
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
  const [score, setScore] = useState(0);
  const [pieceTray, setPieceTray] = useState(generateNewTray());
  const [draggingIdx, setDraggingIdx] = useState(null); // which piece is being dragged: 0,1,2
  const [dragGhost, setDragGhost] = useState(null); // { row, col }
  const [gameOver, setGameOver] = useState(false);

  // For highlighting possible placement
  const [hoverCell, setHoverCell] = useState(null); // {row, col}

  // Refs for drag and drop
  const boardRef = useRef();

  /**
   * Handles starting the drag operation for a tray piece.
   */
  const handlePieceDragStart = (idx, e) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggingIdx(idx);
    // Required for firefox drag
    if (e.dataTransfer.setDragImage) {
      let crt = e.target.cloneNode(true);
      crt.style.position = "absolute";
      crt.style.top = "-9999px";
      document.body.appendChild(crt);
      e.dataTransfer.setDragImage(crt, 24, 24);
      setTimeout(() => document.body.removeChild(crt), 0);
    }
  };

  /**
   * Only allow dropping on board cells if piece fits.
   */
  const handleBoardCellDragOver = (row, col, e) => {
    if (gameOver || draggingIdx === null) return;
    e.preventDefault();
    setHoverCell({row, col});
  };

  /**
   * Handles dropping the piece onto the board.
   */
  const handleBoardCellDrop = (row, col, e) => {
    e.preventDefault();
    if (gameOver || draggingIdx === null) return;
    const piece = pieceTray[draggingIdx];
    // Validate placement
    if (canPlace(board, row, col, piece.shape)) {
      // Place piece
      let newBoard = putPiece(board, row, col, piece.shape);
      // Clear filled rows/cols
      let cleared;
      [newBoard, cleared] = clearLines(newBoard);
      // Update score (+10 points per cleared line)
      const oldScore = score;
      setScore((s) => s + (cleared * 10) + piece.shape.length); // Add piece size for placement, plus bonus
      setBoard(newBoard);

      // Remove piece from tray (set to null), and check if need to generate new tray
      const newTray = pieceTray.slice();
      newTray[draggingIdx] = null;
      setPieceTray(newTray);

      setDraggingIdx(null);
      setHoverCell(null);

      // If all tray pieces have been used, generate the next tray
      if (newTray.every((p) => p === null)) {
        const freshTray = generateNewTray();
        setTimeout(() => setPieceTray(freshTray), 250);  // Slight delay for UX
        // Check if any moves possible on new tray (short delay to update board state)
        setTimeout(() => {
          if (!anyMovesPossible(newBoard, freshTray)) {
            setGameOver(true);
          }
        }, 300);
      } else {
        // Check if any moves possible on remaining pieces
        setTimeout(() => {
          if (!anyMovesPossible(newBoard, newTray.filter(Boolean))) {
            setGameOver(true);
          }
        }, 50);
      }
    }
  };

  /**
   * Handles end of drag (user dropped elsewhere).
   */
  const handleDragEnd = () => {
    setDraggingIdx(null);
    setHoverCell(null);
  };

  /**
   * Handles drag entering a board cell.
   */
  const handleDragEnter = (row, col, e) => {
    if (gameOver || draggingIdx === null) return;
    setHoverCell({row, col});
  };

  /**
   * Handles drag leaving a board cell.
   */
  const handleDragLeave = (row, col, e) => {
    if (gameOver || draggingIdx === null) return;
    setHoverCell(null);
  };

  /**
   * Renders the main game board with all cells and overlays for piece preview (while hovering drag).
   */
  function renderBoard() {
    // Overlay: dims for preview if hovering & dragging
    let previewOverlay = Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(false));

    if (draggingIdx !== null && hoverCell && pieceTray[draggingIdx]) {
      const { row, col } = hoverCell;
      const piece = pieceTray[draggingIdx];
      for (let [dr, dc] of piece.shape) {
        const rr = row + dr, cc = col + dc;
        if (
          rr >= 0 &&
          rr < BOARD_SIZE &&
          cc >= 0 &&
          cc < BOARD_SIZE
        ) {
          previewOverlay[rr][cc] = true;
        }
      }
    }

    return (
      <div className="blockburst-board" ref={boardRef}>
        {board.map((rowArr, rowIdx) => (
          <div className="blockburst-row" key={`row-${rowIdx}`}>
            {rowArr.map((cell, colIdx) => {
              let filled = cell === 1;
              let preview = previewOverlay[rowIdx][colIdx];
              let isBlocked =
                draggingIdx !== null &&
                hoverCell &&
                preview &&
                !canPlace(board, hoverCell.row, hoverCell.col, pieceTray[draggingIdx]?.shape || []);
              let previewStyle = {};
              if (preview && !filled) {
                previewStyle.background =
                  isBlocked
                    ? "#bbb"
                    : pieceTray[draggingIdx]?.colorIndex === 1
                    ? "var(--blockburst-primary)"
                    : pieceTray[draggingIdx]?.colorIndex === 2
                    ? "var(--blockburst-secondary)"
                    : "var(--blockburst-accent)";
                previewStyle.opacity = isBlocked ? 0.4 : 0.6;
              }
              return (
                <div
                  className="blockburst-cell"
                  key={`cell-${rowIdx}-${colIdx}`}
                  style={
                    filled
                      ? {
                          background:
                            "var(--blockburst-primary)",
                          opacity: 0.9
                        }
                      : preview
                      ? previewStyle
                      : undefined
                  }
                  onDragOver={(e) =>
                    handleBoardCellDragOver(rowIdx, colIdx, e)
                  }
                  onDrop={(e) =>
                    handleBoardCellDrop(rowIdx, colIdx, e)
                  }
                  onDragEnter={(e) =>
                    handleDragEnter(rowIdx, colIdx, e)
                  }
                  onDragLeave={(e) =>
                    handleDragLeave(rowIdx, colIdx, e)
                  }
                ></div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  /**
   * Renders the tray of draggable pieces, showing only remaining tray pieces.
   */
  function renderPieceTray() {
    return (
      <div className="blockburst-piece-tray">
        {pieceTray.map((piece, idx) =>
          piece ? (
            <div
              className={
                "blockburst-piece blockburst-piece-" +
                piece.colorIndex
              }
              key={"tray-" + idx}
              draggable={!gameOver}
              onDragStart={(e) => handlePieceDragStart(idx, e)}
              onDragEnd={handleDragEnd}
              style={{
                opacity:
                  draggingIdx === idx
                    ? 0.5
                    : !anyMovesPossible(board, [piece]) || gameOver
                    ? 0.3
                    : 1,
                cursor:
                  draggingIdx === null && !gameOver
                    ? "grab"
                    : "not-allowed"
              }}
              title="Drag onto the board!"
            >
              {renderPieceCells(piece)}
            </div>
          ) : (
            <div
              key={"tray-" + idx}
              style={{
                width: "48px",
                height: "48px",
                background: "#e3e5e9",
                borderRadius: 6,
                opacity: 0.3
              }}
            ></div>
          )
        )}
      </div>
    );
  }

  /**
   * Renders a graphical representation of the piece.
   */
  function renderPieceCells(piece) {
    // find dimensions
    const rows = piece.shape.map(([r]) => r);
    const cols = piece.shape.map(([, c]) => c);
    const minR = Math.min(...rows), maxR = Math.max(...rows);
    const minC = Math.min(...cols), maxC = Math.max(...cols);
    const gridRows = maxR - minR + 1;
    const gridCols = maxC - minC + 1;
    return (
      <div
        style={{
          display: "grid",
          gridTemplateRows: `repeat(${gridRows}, 12px)`,
          gridTemplateColumns: `repeat(${gridCols}, 12px)`,
          gap: 2
        }}
      >
        {Array.from({ length: gridRows * gridCols }).map((_, idx) => {
          const rr = Math.floor(idx / gridCols) + minR;
          const cc = (idx % gridCols) + minC;
          const hasBlock = piece.shape.some(
            ([r, c]) => r === rr && c === cc
          );
          return (
            <div
              key={"cell-" + idx}
              style={{
                background: hasBlock
                  ? piece.colorIndex === 1
                    ? "var(--blockburst-primary)"
                    : piece.colorIndex === 2
                    ? "var(--blockburst-secondary)"
                    : "var(--blockburst-accent)"
                  : "transparent",
                borderRadius: 2,
                width: 12,
                height: 12,
                opacity: hasBlock ? 1 : 0
              }}
            ></div>
          );
        })}
      </div>
    );
  }

  /**
   * Game over reset.
   */
  function resetGame() {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0)));
    setScore(0);
    setPieceTray(generateNewTray());
    setDraggingIdx(null);
    setHoverCell(null);
    setGameOver(false);
  }

  return (
    <div className="blockburst-main-container">
      <div className="blockburst-score">
        <span className="blockburst-score-label">Score</span>
        <span className="blockburst-score-value">{score}</span>
      </div>
      {renderBoard()}
      {renderPieceTray()}
      {gameOver && (
        <div
          style={{
            marginTop: 24,
            background: "white",
            color: "#3633DB",
            padding: "32px",
            borderRadius: 18,
            fontWeight: 700,
            fontSize: "1.5rem",
            boxShadow: "var(--blockburst-shadow)",
            textAlign: "center"
          }}
        >
          Game Over!
          <br />
          <button
            className="btn btn-large"
            style={{
              color: "white",
              background: "var(--blockburst-primary)",
              marginTop: 18
            }}
            onClick={resetGame}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}

export default BlockBurstContainer;
