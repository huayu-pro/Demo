// --- Shape Challenge Mode Game Levels ---
class ChallengeSystem {
    constructor() {
        this.active = false;
        this.level = 1; // Level 1: Star, Level 2: Well, Level 3: Flower
        this.progress = 0; // Holds matching progress (0 to 100)
        this.matchPercent = 0; // Displayed match score (0% to 100%)
        this.highestMatch = 0;
        this.startTime = 0;
        this.sockets = [];
        this.ghostConnections = [];
    }

    loadLevel(width, height) {
        this.sockets = [];
        this.ghostConnections = [];
        this.progress = 0;
        this.highestMatch = 0;
        this.startTime = Date.now();

        if (this.level === 1) {
            // Level 1: Star Shape
            // Left Hand Sockets
            this.sockets.push({ id: 'L4', hand: 'Left', joint: 4, x: width * 0.32, y: height * 0.40 });
            this.sockets.push({ id: 'L8', hand: 'Left', joint: 8, x: width * 0.28, y: height * 0.35 });
            this.sockets.push({ id: 'L12', hand: 'Left', joint: 12, x: width * 0.25, y: height * 0.42 });
            this.sockets.push({ id: 'L16', hand: 'Left', joint: 16, x: width * 0.24, y: height * 0.50 });
            this.sockets.push({ id: 'L20', hand: 'Left', joint: 20, x: width * 0.26, y: height * 0.58 });
            
            // Right Hand Sockets
            this.sockets.push({ id: 'R4', hand: 'Right', joint: 4, x: width * 0.68, y: height * 0.40 });
            this.sockets.push({ id: 'R8', hand: 'Right', joint: 8, x: width * 0.72, y: height * 0.35 });
            this.sockets.push({ id: 'R12', hand: 'Right', joint: 12, x: width * 0.75, y: height * 0.42 });
            this.sockets.push({ id: 'R16', hand: 'Right', joint: 16, x: width * 0.76, y: height * 0.50 });
            this.sockets.push({ id: 'R20', hand: 'Right', joint: 20, x: width * 0.74, y: height * 0.58 });

            // Ghost connection links (star pentagram shape)
            this.ghostConnections = [
                { from: 0, to: 7 }, // L_Thumb - R_Middle
                { from: 2, to: 5 }, // L_Middle - R_Thumb
                { from: 0, to: 8 }, // L_Thumb - R_Ring
                { from: 3, to: 5 }, // L_Ring - R_Thumb
                { from: 1, to: 9 }, // L_Index - R_Pinky
                { from: 4, to: 6 }, // L_Pinky - R_Index
                { from: 1, to: 8 }, // L_Index - R_Ring
                { from: 3, to: 6 }, // L_Ring - R_Index
                { from: 4, to: 7 }, // L_Pinky - R_Middle
                { from: 2, to: 9 }  // L_Middle - R_Pinky
            ];
        } 
        else if (this.level === 2) {
            // Level 2: Gold Well (# Grid shape)
            // Left Sockets
            this.sockets.push({ id: 'L4', hand: 'Left', joint: 4, x: width * 0.34, y: height * 0.58 });
            this.sockets.push({ id: 'L8', hand: 'Left', joint: 8, x: width * 0.35, y: height * 0.32 });
            this.sockets.push({ id: 'L12', hand: 'Left', joint: 12, x: width * 0.25, y: height * 0.35 });
            this.sockets.push({ id: 'L16', hand: 'Left', joint: 16, x: width * 0.38, y: height * 0.62 });
            this.sockets.push({ id: 'L20', hand: 'Left', joint: 20, x: width * 0.26, y: height * 0.60 });
            
            // Right Sockets
            this.sockets.push({ id: 'R4', hand: 'Right', joint: 4, x: width * 0.66, y: height * 0.58 });
            this.sockets.push({ id: 'R8', hand: 'Right', joint: 8, x: width * 0.65, y: height * 0.32 });
            this.sockets.push({ id: 'R12', hand: 'Right', joint: 12, x: width * 0.75, y: height * 0.35 });
            this.sockets.push({ id: 'R16', hand: 'Right', joint: 16, x: width * 0.62, y: height * 0.62 });
            this.sockets.push({ id: 'R20', hand: 'Right', joint: 20, x: width * 0.74, y: height * 0.60 });

            // Well connections (# outline)
            this.ghostConnections = [
                { from: 1, to: 6 }, // L_Index - R_Index (top)
                { from: 3, to: 8 }, // L_Ring - R_Ring (bottom)
                { from: 0, to: 4 }, // L_Thumb - L_Pinky (left)
                { from: 5, to: 9 }, // R_Thumb - R_Pinky (right)
                { from: 0, to: 9 }, // Diagonals
                { from: 5, to: 4 }
            ];
        }
        else if (this.level === 3) {
            // Level 3: Flower Bridge
            // Left
            this.sockets.push({ id: 'L4', hand: 'Left', joint: 4, x: width * 0.34, y: height * 0.48 });
            this.sockets.push({ id: 'L8', hand: 'Left', joint: 8, x: width * 0.28, y: height * 0.36 });
            this.sockets.push({ id: 'L12', hand: 'Left', joint: 12, x: width * 0.22, y: height * 0.44 });
            this.sockets.push({ id: 'L16', hand: 'Left', joint: 16, x: width * 0.21, y: height * 0.52 });
            this.sockets.push({ id: 'L20', hand: 'Left', joint: 20, x: width * 0.25, y: height * 0.60 });
            
            // Right
            this.sockets.push({ id: 'R4', hand: 'Right', joint: 4, x: width * 0.66, y: height * 0.48 });
            this.sockets.push({ id: 'R8', hand: 'Right', joint: 8, x: width * 0.72, y: height * 0.36 });
            this.sockets.push({ id: 'R12', hand: 'Right', joint: 12, x: width * 0.78, y: height * 0.44 });
            this.sockets.push({ id: 'R16', hand: 'Right', joint: 16, x: width * 0.79, y: height * 0.52 });
            this.sockets.push({ id: 'R20', hand: 'Right', joint: 20, x: width * 0.75, y: height * 0.60 });

            // Petal Bridge links
            this.ghostConnections = [
                // Left outline petal
                { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
                // Right outline petal
                { from: 5, to: 6 }, { from: 6, to: 7 }, { from: 7, to: 8 }, { from: 8, to: 9 },
                // Bridge lines
                { from: 1, to: 6 }, // Index - Index
                { from: 2, to: 7 }, // Middle - Middle
                { from: 3, to: 8 }  // Ring - Ring
            ];
        }

        logger.log(`Shape Challenge Level ${this.level} loaded successfully. Match the shapes!`, 'info');
    }

    update(handsData) {
        if (!this.active) return;

        let totalScore = 0;
        let activeSockets = 0;

        // Calculate proximity score for each socket
        this.sockets.forEach(socket => {
            const hand = handsData[socket.hand];
            if (hand) {
                const jointPos = hand[socket.joint];
                const dist = Math.hypot(jointPos.x - socket.x, jointPos.y - socket.y);
                
                // Maximum 80px distance to score. Proximity maps to 0.0 - 1.0.
                const score = Math.max(0, 1 - dist / 80);
                totalScore += score;
                socket.matched = dist < 45; // Individual circle highlights cyan when close
            } else {
                socket.matched = false;
            }
            activeSockets++;
        });

        // Compute overall match percent
        const average = activeSockets > 0 ? (totalScore / activeSockets) : 0;
        this.matchPercent = Math.floor(average * 100);
        if (this.matchPercent > this.highestMatch) {
            this.highestMatch = this.matchPercent;
        }

        // If matching score is above threshold (75%), fill up completion progress bar
        const progressBar = document.getElementById('challenge-progress-bar');
        const progressPercentText = document.getElementById('challenge-match-percent');

        if (this.matchPercent >= 75) {
            this.progress += 0.8; // Fills up in about 1.5 seconds at 60 FPS
            if (this.progress > 100) this.progress = 100;
            
            if (progressBar) {
                progressBar.style.width = `${this.progress}%`;
                progressBar.style.backgroundColor = 'var(--neon-green)';
                document.body.style.setProperty('--challenge-progress', `${this.progress}%`);
            }
        } else {
            this.progress -= 1.2; // Drains slightly faster than filling
            if (this.progress < 0) this.progress = 0;
            
            if (progressBar) {
                progressBar.style.width = `${this.progress}%`;
                progressBar.style.backgroundColor = 'var(--neon-cyan)';
                document.body.style.setProperty('--challenge-progress', `${this.progress}%`);
            }
        }

        if (progressPercentText) {
            progressPercentText.innerText = `${this.matchPercent}%`;
            if (this.matchPercent >= 75) {
                progressPercentText.style.color = 'var(--neon-green)';
            } else {
                progressPercentText.style.color = 'var(--text-secondary)';
            }
        }

        // Trigger level clear on 100% progress
        if (this.progress >= 100) {
            this.triggerLevelClear();
        }
    }

    triggerLevelClear() {
        this.active = false;
        
        // Calculate Time and Record Best PB
        const timeTaken = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const pbKey = `cats_cradle_v4_lv${this.level}_pb`;
        const pbRaw = localStorage.getItem(pbKey);
        let pb = pbRaw ? JSON.parse(pbRaw) : { time: 9999, match: 0 };
        
        let isNewPB = false;
        if (parseFloat(timeTaken) < pb.time || (parseFloat(timeTaken) === pb.time && this.highestMatch > pb.match)) {
            pb = { time: parseFloat(timeTaken), match: this.highestMatch };
            localStorage.setItem(pbKey, JSON.stringify(pb));
            isNewPB = true;
        }
        
        // Sound chord celebratory plucks
        synth.playPluck(50);
        setTimeout(() => synth.playPluck(75), 150);
        setTimeout(() => synth.playPluck(100), 300);
        setTimeout(() => synth.playPluck(120), 450);
        
        // Deep sub-bass cinematic boom
        synth.playSubBassBoom();

        // Canvas shake and invert post-processing effects
        const canvas = document.getElementById('output-canvas');
        if (canvas) {
            // 1. Shake: translate canvas in random directions (+-5px)
            let shakeTime = 0;
            const shakeDuration = 350;
            const shakeInterval = setInterval(() => {
                shakeTime += 25;
                if (shakeTime >= shakeDuration) {
                    clearInterval(shakeInterval);
                    canvas.style.transform = '';
                } else {
                    const dx = (Math.random() - 0.5) * 10;
                    const dy = (Math.random() - 0.5) * 10;
                    canvas.style.transform = `translate(${dx}px, ${dy}px)`;
                }
            }, 25);

            // 2. Invert: instantly invert colors and transition back
            canvas.style.transition = 'filter 0.08s ease-out';
            canvas.style.filter = 'invert(1)';
            setTimeout(() => {
                canvas.style.filter = 'invert(0)';
                setTimeout(() => {
                    canvas.style.filter = '';
                    canvas.style.transition = '';
                }, 300);
            }, 120);
        }

        // Spawns colorful celebration fireworks in the center
        const banner = document.getElementById('success-banner');
        if (banner) {
            // Update PB text on banner
            banner.innerHTML = `
                <h1 class="glitch-text" data-text="PERFECT MATCH">PERFECT MATCH</h1>
                <p>LEVEL ${this.level} CLEARED</p>
                <div style="margin-top:20px; font-size:18px;">
                    <div>TIME: ${timeTaken}s ${isNewPB ? '<span style="color:var(--neon-green)">[NEW BEST!]</span>' : ''}</div>
                    <div>MATCH: ${this.highestMatch}%</div>
                </div>
                ${!isNewPB ? `<div style="font-size:14px; opacity:0.7; margin-top:10px;">BEST TIME: ${pb.time}s</div>` : ''}
            `;
            
            banner.classList.remove('hidden');
            
            const centerX = canvas ? canvas.width / 2 : 400;
            const centerY = canvas ? canvas.height / 2 : 300;
            
            const cols = ['#ff007f', '#00ffff', '#ffaa00', '#00ff66', '#aa00ff'];
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const c = cols[Math.floor(Math.random() * cols.length)];
                    particles.spawn(centerX + (Math.random() - 0.5) * 100, centerY + (Math.random() - 0.5) * 100, c, 30, 'fireworks');
                }, i * 150);
            }
        }

        logger.log(`Level ${this.level} Complete! Shapes matched perfectly.`, 'success');

        // Auto advance to next level after 4.5 seconds
        setTimeout(() => {
            if (banner) banner.classList.add('hidden');
            this.level = this.level === 3 ? 1 : this.level + 1;
            const canvasEl = document.getElementById('output-canvas');
            this.loadLevel(canvasEl.width, canvasEl.height);
            this.active = true;
        }, 4500);
    }

    draw(ctx) {
        if (!this.active) return;

        // Draw ghost blueprint connections
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2.5;
        
        this.ghostConnections.forEach(link => {
            const p1 = this.sockets[link.from];
            const p2 = this.sockets[link.to];
            if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });
        ctx.restore();

        // Draw socket rings
        this.sockets.forEach(socket => {
            const strokeColor = socket.matched ? '#00ff66' : 'rgba(255, 170, 0, 0.4)';
            const fillColor = socket.matched ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255, 170, 0, 0.04)';
            const glow = socket.matched ? 10 : 0;
            
            drawCircleWithGlow(ctx, socket.x, socket.y, 22, fillColor, strokeColor, 3, glow);
            
            // Core tiny dot
            const dotColor = socket.matched ? '#00ff66' : 'rgba(255, 170, 0, 0.7)';
            drawCircleWithGlow(ctx, socket.x, socket.y, 4, dotColor, null, 0, socket.matched ? 8 : 0);
        });
    }
}

const challenge = new ChallengeSystem();

