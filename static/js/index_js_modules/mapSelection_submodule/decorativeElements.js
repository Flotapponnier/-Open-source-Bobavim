export function createDecorativeSprites() {
  const sprites = document.createElement("div");
  sprites.className = "decorative-sprites-outside";
  sprites.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 999;
    `;

  sprites.innerHTML = `
        <div class="floating-boba-decoration" style="
            position: absolute;
            width: 28px;
            height: 28px;
            top: 18%;
            left: 8%;
            animation: bobaBounce 3s ease-in-out infinite;
        ">
            <img src='/static/sprites/character/boba.png' alt='Boba' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-pinky-decoration" style="
            position: absolute;
            width: 26px;
            height: 26px;
            top: 25%;
            right: 10%;
            animation: bobaBounce 2.5s ease-in-out infinite 0.3s;
        ">
            <img src='/static/sprites/character/pinky_boba.png' alt='Pinky Boba' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-black-decoration" style="
            position: absolute;
            width: 24px;
            height: 24px;
            bottom: 28%;
            left: 9%;
            animation: bobaBounce 2.8s ease-in-out infinite 0.7s;
        ">
            <img src='/static/sprites/character/black_boba.png' alt='Black Boba' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-golden-decoration" style="
            position: absolute;
            width: 25px;
            height: 25px;
            bottom: 22%;
            right: 12%;
            animation: bobaBounce 3.2s ease-in-out infinite 1.1s;
        ">
            <img src='/static/sprites/character/golden_boba.png' alt='Golden Boba' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-boba-decoration" style="
            position: absolute;
            width: 22px;
            height: 22px;
            top: 55%;
            right: 8%;
            animation: bobaBounce 2.2s ease-in-out infinite 1.5s;
        ">
            <img src='/static/sprites/character/boba.png' alt='Boba' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-pinky-decoration" style="
            position: absolute;
            width: 23px;
            height: 23px;
            bottom: 45%;
            left: 10%;
            animation: bobaBounce 2.7s ease-in-out infinite 0.9s;
        ">
            <img src='/static/sprites/character/pinky_boba.png' alt='Pinky Boba' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-black-decoration" style="
            position: absolute;
            width: 24px;
            height: 24px;
            top: 70%;
            left: 7%;
            animation: bobaBounce 2.4s ease-in-out infinite 1.8s;
        ">
            <img src='/static/sprites/character/black_boba.png' alt='Black Boba' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-golden-decoration" style="
            position: absolute;
            width: 26px;
            height: 26px;
            top: 40%;
            right: 9%;
            animation: bobaBounce 3.1s ease-in-out infinite 0.6s;
        ">
            <img src='/static/sprites/character/golden_boba.png' alt='Golden Boba' style='width: 100%; height: 100%;' />
        </div>
        
        <div class="floating-pearl-decoration" style="
            position: absolute;
            width: 18px;
            height: 18px;
            top: 12%;
            left: 30%;
            animation: pearlSparkle 2s ease-in-out infinite;
        ">
            <img src='/static/sprites/character/pearl.png' alt='Pearl' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-pearl-decoration" style="
            position: absolute;
            width: 16px;
            height: 16px;
            top: 15%;
            right: 32%;
            animation: pearlSparkle 1.8s ease-in-out infinite 0.5s;
        ">
            <img src='/static/sprites/character/pearl.png' alt='Pearl' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-pearl-decoration" style="
            position: absolute;
            width: 17px;
            height: 17px;
            bottom: 15%;
            left: 35%;
            animation: pearlSparkle 1.9s ease-in-out infinite 0.8s;
        ">
            <img src='/static/sprites/character/pearl.png' alt='Pearl' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-pearl-decoration" style="
            position: absolute;
            width: 19px;
            height: 19px;
            bottom: 12%;
            right: 33%;
            animation: pearlSparkle 2.1s ease-in-out infinite 1.2s;
        ">
            <img src='/static/sprites/character/pearl.png' alt='Pearl' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-pearl-decoration" style="
            position: absolute;
            width: 15px;
            height: 15px;
            top: 35%;
            left: 5%;
            animation: pearlSparkle 1.7s ease-in-out infinite 0.6s;
        ">
            <img src='/static/sprites/character/pearl.png' alt='Pearl' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-pearl-decoration" style="
            position: absolute;
            width: 18px;
            height: 18px;
            top: 60%;
            right: 6%;
            animation: pearlSparkle 2.3s ease-in-out infinite 1.0s;
        ">
            <img src='/static/sprites/character/pearl.png' alt='Pearl' style='width: 100%; height: 100%;' />
        </div>
        <div class="floating-diamond-decoration" style="
            position: absolute;
            width: 27px;
            height: 27px;
            top: 32%;
            left: 15%;
            animation: bobaBounce 3.5s ease-in-out infinite 2.1s;
        ">
            <img src='/static/sprites/character/boba_diamond.png' alt='Diamond Boba' style='width: 100%; height: 100%;' />
        </div>
    `;

  return sprites;
}

export function initializeAnimations() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes slideIn {
        from { 
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
        }
        to { 
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }
    
    @keyframes bobaBounce {
        0%, 100% { 
            transform: translateY(0px) rotate(0deg);
        }
        25% { 
            transform: translateY(-3px) rotate(2deg);
        }
        50% { 
            transform: translateY(-6px) rotate(0deg);
        }
        75% { 
            transform: translateY(-3px) rotate(-2deg);
        }
    }
    
    @keyframes pearlSparkle {
        0%, 100% { 
            transform: scale(1) rotate(0deg);
            opacity: 1;
        }
        25% { 
            transform: scale(1.1) rotate(90deg);
            opacity: 0.8;
        }
        50% { 
            transform: scale(1.2) rotate(180deg);
            opacity: 1;
        }
        75% { 
            transform: scale(1.1) rotate(270deg);
            opacity: 0.8;
        }
    }
    `;
  document.head.appendChild(style);
}