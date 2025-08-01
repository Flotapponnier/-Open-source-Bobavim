export function createModalOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(45deg, rgba(0, 0, 0, 0.9), rgba(44, 24, 16, 0.8));
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
        backdrop-filter: blur(2px);
    `;
  
  // Disable vim navigation when modal overlay is created
  if (window.hideCursor && window.showCursor) {
    // Use global functions for consistency
    window.hideCursor();
    // Also disable the navigation completely for true modals
    setTimeout(() => {
      import('../vimNavigation.js').then(module => {
        module.disableVimNavigation();
      }).catch(() => {});
    }, 0);
  } else {
    import('../vimNavigation.js').then(module => {
      module.disableVimNavigation();
    }).catch(() => {
      // Ignore if vim navigation is not available
    });
  }
  
  return overlay;
}

export function createMapSelectionModal(maps) {
  const modal = document.createElement("div");
  modal.className = "map-selection-modal";
  modal.style.cssText = `
        background: linear-gradient(135deg, #f4f1de 0%, #e9c46a 25%, #f4a261 50%, #e76f51 75%, #264653 100%);
        border: 4px solid #2c1810;
        border-radius: 0px;
        padding: 0;
        max-width: 1000px;
        width: 90%;
        max-height: 90vh;
        min-height: fit-content;
        box-shadow: 
            0 0 0 2px #e9c46a,
            0 0 0 4px #2c1810,
            8px 8px 0 0 #2c1810,
            0 20px 60px rgba(44, 24, 16, 0.4);
        animation: slideIn 0.3s ease;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        flex-shrink: 0;
        image-rendering: pixelated;
        font-family: 'Press Start 2P', 'Orbitron', monospace;
    `;

  modal.innerHTML = `
        <div class="modal-header" id="modal-header" style="
            padding: 20px 25px;
            text-align: center;
            color: #f4f1de;
            background: linear-gradient(90deg, #2c1810 0%, #4a3528 50%, #2c1810 100%);
            border-bottom: 3px solid #e9c46a;
            position: relative;
            text-shadow: 2px 2px 0 #2c1810;
        ">
            <h2 class="map-title" style="
                margin: 0; 
                font-size: 16px; 
                font-family: 'Press Start 2P', monospace;
                letter-spacing: 2px;
                text-transform: uppercase;
                color: #e9c46a;
            "></h2>
            <button class="close-modal" style="
                position: absolute;
                top: 12px;
                right: 15px;
                background: #e76f51;
                border: 2px solid #2c1810;
                color: #f4f1de;
                font-size: 12px;
                cursor: pointer;
                padding: 8px 10px;
                font-family: 'Press Start 2P', monospace;
                box-shadow: 2px 2px 0 #2c1810;
                transition: all 0.1s ease;
            " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
               onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">X</button>
        </div>
        
        <div class="filter-bar" style="
            display: flex;
            justify-content: center;
            gap: 8px;
            margin: 15px;
            padding: 15px;
            background: linear-gradient(135deg, #2c1810 0%, #4a3528 100%);
            border: 2px solid #e9c46a;
            flex-wrap: wrap;
        ">
            <button class="filter-btn active" data-filter="all" style="
                background: #464649;
                color: #f4f1de;
                border: 2px solid #2c1810;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 10px;
                font-family: 'Press Start 2P', monospace;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 2px 2px 0 #2c1810;
                transition: all 0.1s ease;
                text-shadow: 1px 1px 0 #2c1810;
            " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
               onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">All</button>
            <button class="filter-btn" data-filter="tutorial" style="
                background: #8B5A3C;
                color: #f4f1de;
                border: 2px solid #2c1810;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 10px;
                font-family: 'Press Start 2P', monospace;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 2px 2px 0 #2c1810;
                transition: all 0.1s ease;
                text-shadow: 1px 1px 0 #2c1810;
            " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
               onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">Tutorial</button>
            <button class="filter-btn" data-filter="easy" style="
                background: #87A330;
                color: #f4f1de;
                border: 2px solid #2c1810;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 10px;
                font-family: 'Press Start 2P', monospace;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 2px 2px 0 #2c1810;
                transition: all 0.1s ease;
                text-shadow: 1px 1px 0 #2c1810;
            " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
               onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">Easy</button>
            <button class="filter-btn" data-filter="medium" style="
                background: #D67C2C;
                color: #f4f1de;
                border: 2px solid #2c1810;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 10px;
                font-family: 'Press Start 2P', monospace;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 2px 2px 0 #2c1810;
                transition: all 0.1s ease;
                text-shadow: 1px 1px 0 #2c1810;
            " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
               onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">Medium</button>
            <button class="filter-btn" data-filter="hard" style="
                background: #C44536;
                color: #f4f1de;
                border: 2px solid #2c1810;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 10px;
                font-family: 'Press Start 2P', monospace;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 2px 2px 0 #2c1810;
                transition: all 0.1s ease;
                text-shadow: 1px 1px 0 #2c1810;
            " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
               onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">Hard</button>
            <button class="filter-btn" data-filter="favorite" style="
                background: #E9C46A;
                color: #2c1810;
                border: 2px solid #2c1810;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 10px;
                font-family: 'Press Start 2P', monospace;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 2px 2px 0 #2c1810;
                transition: all 0.1s ease;
                text-shadow: 1px 1px 0 #f4f1de;
            " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
               onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">★ Fav</button>
        </div>
        
        <div class="map-display-container" style="
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 0 20px 20px 20px;
            min-height: 0;
        ">
            <div class="map-grid-container" style="
                flex: 1;
                background: linear-gradient(135deg, #2c1810 0%, #1a1a1a 50%, #2c1810 100%);
                border: 3px solid #e9c46a;
                padding: 15px;
                overflow: hidden;
                position: relative;
                min-height: 250px;
                max-height: 400px;
                box-shadow: 
                    inset 0 0 20px rgba(0,0,0,0.5),
                    0 0 0 2px #2c1810;
                display: flex;
                flex-direction: column;
                margin-bottom: 10px;
            ">
                <button class="favorite-star" style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #2c1810;
                    border: 2px solid #e9c46a;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 6px;
                    z-index: 10;
                    width: 35px;
                    height: 35px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #e9c46a;
                    transition: all 0.1s ease;
                    font-family: 'Press Start 2P', monospace;
                    box-shadow: 2px 2px 0 #2c1810;
                " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
                   onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">★</button>
                
                <div class="game-board-preview" style="
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1px;
                    overflow: hidden;
                    padding: 15px;
                "></div>
            </div>
            
            <div class="map-navigation" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                gap: 20px;
            ">
                <button class="prev-map-btn" style="
                    background: #464649;
                    color: #f4f1de;
                    border: 2px solid #2c1810;
                    padding: 10px 15px;
                    cursor: pointer;
                    font-size: 10px;
                    font-family: 'Press Start 2P', monospace;
                    transition: all 0.1s ease;
                    min-width: 110px;
                    box-shadow: 2px 2px 0 #2c1810;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    text-shadow: 1px 1px 0 #2c1810;
                " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
                   onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">◄ (h) Prev</button>
                
                <button class="play-map-btn" style="
                    background: linear-gradient(135deg, #E9C46A 0%, #F4A261 50%, #E76F51 100%);
                    border: 3px solid #2c1810;
                    color: #2c1810;
                    cursor: pointer;
                    font-size: 12px;
                    font-family: 'Press Start 2P', monospace;
                    padding: 12px 20px;
                    min-width: 160px;
                    box-shadow: 3px 3px 0 #2c1810;
                    text-shadow: 1px 1px 0 #f4f1de;
                    transition: all 0.1s ease;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                " onmouseover="this.style.transform='translate(-2px, -2px)'; this.style.boxShadow='5px 5px 0 #2c1810';" 
                   onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='3px 3px 0 #2c1810';">► Play (Enter)</button>
                
                <button class="next-map-btn" style="
                    background: #464649;
                    color: #f4f1de;
                    border: 2px solid #2c1810;
                    padding: 10px 15px;
                    cursor: pointer;
                    font-size: 10px;
                    font-family: 'Press Start 2P', monospace;
                    transition: all 0.1s ease;
                    min-width: 110px;
                    box-shadow: 2px 2px 0 #2c1810;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    text-shadow: 1px 1px 0 #2c1810;
                " onmouseover="this.style.transform='translate(-1px, -1px)'; this.style.boxShadow='3px 3px 0 #2c1810';" 
                   onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='2px 2px 0 #2c1810';">Next (l) ►</button>
            </div>
        </div>
    `;

  setupPlayButtonHover(modal);
  return modal;
}

function setupPlayButtonHover(modal) {
  const playBtn = modal.querySelector(".play-map-btn");

  playBtn.addEventListener("mouseenter", () => {
    playBtn.style.background =
      "linear-gradient(135deg, #F4A261 0%, #E9C46A 50%, #E76F51 100%)";
    playBtn.style.transform = "translate(-2px, -2px)";
    playBtn.style.boxShadow = "5px 5px 0 #2c1810";
  });
  playBtn.addEventListener("mouseleave", () => {
    playBtn.style.background =
      "linear-gradient(135deg, #E9C46A 0%, #F4A261 50%, #E76F51 100%)";
    playBtn.style.transform = "translate(0, 0)";
    playBtn.style.boxShadow = "3px 3px 0 #2c1810";
  });
}

export function closeModal(modalOverlay) {
  modalOverlay.style.animation = "fadeOut 0.3s ease";
  
  // Re-enable vim navigation when modal is closed
  if (window.showCursor) {
    window.showCursor();
  }
  import('../vimNavigation.js').then(module => {
    module.enableVimNavigation();
  }).catch(() => {
    // Ignore if vim navigation is not available
  });
  
  setTimeout(() => {
    if (modalOverlay.parentNode) {
      modalOverlay.parentNode.removeChild(modalOverlay);
    }
  }, 300);
}

