{/* 1. Keep track of our overlay blocking states */}
const isRoundResultActive = !!roundResult;
const isGameOverActive = gameOverWinners && gameOverWinners.length > 0;
const isOverlayActive = isRoundResultActive || isGameOverActive;
const canDraw = isArtist && !isOverlayActive;

return (
  // ... inside your game-workspace-columns layout:
  <div className={`middle-section ${roomState.gameStarted && !showPhaseSequence ? "canvas-mode" : ""}`}>
    
    {/* CRITICAL FIX: If a game over screen is showing, DO NOT show GameSetting yet.
      Keep the view clear for the game over screens to render cleanly.
    */}
    {isGameOverActive ? (
      <GameOverWinners
        winners={gameOverWinners}
        onClose={() => setGameOverWinners(null)}
      />
    ) : isRoundResultActive ? (
      <RoundResult
        reason={roundResult.reason}
        word={roundResult.word}
        players={roundResult.players}
        onClose={handleRoundResultClose}
      />
    ) : showPhaseSequence && roomState && currentPlayer ? (
      <GamePhaseSequence
        currentPlayer={currentPlayer}
        currentRound={currentRound}
        totalRounds={totalRounds}
        wordOptions={wordOptions}
        onWordSelected={handleWordSelected}
        onSequenceComplete={handlePhaseSequenceComplete}
        isArtist={isArtist}
      />
    ) : !roomState.gameStarted ? (
      /* Now this will ONLY show up after the host closes the game over screen */
      <GameSetting
        roomId={roomId}
        roomState={roomState}
        isHost={isHost}
        onDurationChange={handleDurationChange}
        onStartGame={handleStartGame}
      />
    ) : (
      <div className={`canvas-wrapper ${!canDraw ? "canvas-disabled" : ""}`}>
        <Canvas
          socket={socket}
          roomId={roomId}
          isArtist={canDraw}
          color={color}
          width={width}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
        />
        {canDraw && (
          <Toolbar
            isArtist={canDraw}
            color={color}
            setColor={setColor}
            width={width}
            setWidth={setWidth}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onUndo={triggerUndo}
            onClear={triggerClear}
          />
        )}
      </div>
    )}

  </div>
);