import React from "react";
import "./BlockBurstContainer.css";

// PUBLIC_INTERFACE
function BlockBurstContainer() {
  /**
   * This is the main game container for BlockBurst.
   * It renders the 10x10 grid, score display, and piece tray.
   */
  // Generate empty board cells (none filled yet)
  const board = [];
  for (let row = 0; row < 10; row++) {
    const rowCells = [];
    for (let col = 0; col < 10; col++) {
      rowCells.push(
        <div className="blockburst-cell" key={`cell-${row}-${col}`}></div>
      );
    }
    board.push(
      <div className="blockburst-row" key={`row-${row}`}>
        {rowCells}
      </div>
    );
  }

  // Static piece tray for layout (to be replaced with dynamic pieces)
  const pieceTray = (
    <div className="blockburst-piece-tray">
      <div className="blockburst-piece blockburst-piece-1"></div>
      <div className="blockburst-piece blockburst-piece-2"></div>
      <div className="blockburst-piece blockburst-piece-3"></div>
    </div>
  );

  return (
    <div className="blockburst-main-container">
      <div className="blockburst-score">
        <span className="blockburst-score-label">Score</span>
        <span className="blockburst-score-value">0</span>
      </div>
      <div className="blockburst-board">{board}</div>
      {pieceTray}
    </div>
  );
}

export default BlockBurstContainer;
