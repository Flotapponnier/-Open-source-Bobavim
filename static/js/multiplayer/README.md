# Multiplayer Game Architecture

This directory contains the refactored multiplayer game implementation, organized into modular components following the established architecture patterns of the codebase.

## File Structure

```
multiplayer/
├── multiplayer_game.js              # Main entry point - coordinates all modules
├── multiplayer_game_old.js          # Backup of original implementation
├── multiplayer_game_modules/        # Modular components
│   ├── gameStateManager.js          # Game state management and server sync
│   ├── keyboardHandler.js           # Vim key input processing (with submodules)
│   ├── keyboardHandler_modules/     
│   │   ├── numberPrefixHandler.js   # Number prefix accumulation (1-9999)
│   │   ├── specialCommandHandler.js # G-commands and character search (f,F,t,T)
│   │   └── movementHandler.js       # Basic movement key processing
│   ├── movementProcessor.js         # Client prediction and server communication (with submodules)
│   ├── movementProcessor_modules/
│   │   ├── moveQueue.js             # Move queue management and processing
│   │   ├── clientPredictor.js       # Client-side prediction logic
│   │   ├── serverCommunicator.js    # Server communication and HTTP requests
│   │   └── stateReconciler.js       # State reconciliation and pending moves
│   ├── displayManager.js            # DOM manipulation and rendering (with submodules)
│   ├── displayManager_modules/
│   │   ├── gameMapRenderer.js       # Game map rendering and updates
│   │   ├── spriteManager.js         # Sprite creation and management
│   │   ├── uiUpdater.js            # UI updates (scores, debug info, highlights)
│   │   ├── displayUtils.js         # Display utilities and throttling
│   │   └── screenManager.js        # Screen state management (loading, error, content)
│   ├── websocketManager.js          # WebSocket connection and message handling (with submodules)
│   ├── websocketManager_modules/
│   │   ├── connectionManager.js     # WebSocket connection setup and management
│   │   ├── messageHandler.js        # Message processing and routing
│   │   └── reconnectionManager.js   # Reconnection logic
│   ├── gameCompletionHandler.js     # Game completion and cleanup
│   └── moduleInitializer.js         # Module initialization and setup
└── README.md                        # This file
```

## Module Responsibilities

### GameStateManager
- Manages game state cloning and synchronization
- Handles initial game loading from server
- Updates client game state for movement prediction
- Preserves character data during state updates

### KeyboardHandler
- Processes vim movement keys (h,j,k,l, w,b,e, etc.)
- Handles number prefixes and complex commands (gg, ge, f/F/t/T)
- Queues movements for processing
- Maintains keyboard state (waiting for char, g-command, etc.)

### MovementProcessor
- Implements client-side prediction using vim movement predictor
- Manages move queue and prevents input blocking
- Handles server communication for moves
- Reconciles client predictions with server authoritative state
- Manages pending moves and rollback on conflicts

### DisplayManager
- Optimized rendering with position change detection
- Manages sprite creation and positioning
- Handles color coding (current player = green, enemy = red)
- Provides throttled updates for performance
- Manages debug information display

### WebSocketManager
- Establishes and maintains WebSocket connection
- Handles reconnection logic
- Processes real-time game updates
- Manages opponent position updates
- Handles disconnection and expiration events

### GameCompletionHandler
- Handles game completion scenarios
- Shows completion messages and overlays
- Manages redirections after game end
- Handles player disconnection cases

### ModuleInitializer
- Initializes all game modules (line numbers, space highlight, etc.)
- Disables solo game handlers
- Sets up client game state for multiplayer
- Follows same initialization pattern as solo game

## Architecture Benefits

1. **Modularity**: Each module has a single responsibility
2. **Maintainability**: Easier to debug and modify specific functionality
3. **Reusability**: Modules can be tested and used independently
4. **Consistency**: Follows the same patterns as other game modules
5. **Performance**: Optimized rendering and state management
6. **Separation of Concerns**: Clear boundaries between different functionalities

## Performance Optimizations

- Throttled display updates (60fps limit)
- Position change detection to avoid unnecessary re-renders
- Optimized WebSocket message handling
- Client-side prediction to reduce input lag
- Efficient sprite management with selective updates

## Future Improvements

- Consider extracting common utilities into shared modules
- Add unit tests for individual modules
- Implement more sophisticated error handling
- Add metrics collection for performance monitoring