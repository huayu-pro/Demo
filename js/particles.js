class ParticleSystem {
    constructor() {
        this.maxParticles = 1500;
        this.pool = [];
        this.freeList = [];
        this.activeIndices = [];
        for (let i = 0; i < this.maxParticles; i++) {
            this.pool.push({
                active: false,
                x: 0, y: 0, vx: 0, vy: 0, size: 0, color: '', type: '',
                startX: 0, startY: 0, decay: 0, alpha: 1, angle: 0,
                vAngle: 0, wObble: 0, radius: 0, char: '0', trajectory: '',
                speed: 0, path: null, leafBuds: null, shape: 'circle', glowStrength: 0,
                anchorHand: null, anchorJoint: null
            });
            this.freeList.push(i);
        }
    }

    spawn(x, y, color, count = 2, type = 'spark', hand = null, joint = null) {
        if (app.state.particlesEnabled === false) return;

        const speedMultiplier = app.state.particleSpeed !== undefined ? app.state.particleSpeed : 1.0;
        const countOverride = app.state.particleCount !== undefined ? app.state.particleCount : count;
        
        // Lifespan maps to decay rate (assuming 30fps average decay)
        const lifespanVal = app.state.particleLifespan !== undefined ? app.state.particleLifespan : 3.0;
        const decayRate = 1.0 / (lifespanVal * 30.0);

        const trajectory = app.state.particleTrajectory || 'explode';
        const sizeBase = app.state.particleSize !== undefined ? app.state.particleSize : 3.0;
        const sizeMult = sizeBase / 3.0;

        // Resolve Color overrides
        let spawnColor = color;
        const colorOpt = app.state.particleColorType || 'theme';
        if (colorOpt === 'white') spawnColor = '#ffffff';
        else if (colorOpt === 'rainbow') {
            const hues = ['#ff007f', '#00ffff', '#00ff66', '#aa00ff', '#ffff00', '#ff9500'];
            spawnColor = hues[Math.floor(Math.random() * hues.length)];
        } else if (colorOpt === 'custom') {
            spawnColor = app.state.particleCustomColor || '#00ffff';
        }

        let spawned = 0;
        while (spawned < countOverride && this.freeList.length > 0) {
            const index = this.freeList.pop();
            this.activeIndices.push(index);
            const p = this.pool[index];
            p.active = true;
                p.x = x;
                p.y = y;
                p.startX = x;
                p.startY = y;
                p.anchorHand = hand;
                p.anchorJoint = joint;
                
                const angle = app.state.particleCircleSpread 
                    ? (spawned / countOverride) * Math.PI * 2 
                    : Math.random() * Math.PI * 2;
                const speed = (Math.random() * 2.2 + 0.5) * speedMultiplier;
                
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
                p.speed = speed;
                
                let size = (Math.random() * 3 + 1.5) * sizeMult;
                if (type === 'petal') {
                    size = (Math.random() * 4 + 4) * sizeMult;
                } else if (type === 'code') {
                    size = (Math.random() * 3 + 3) * sizeMult;
                } else if (type === 'leaf') {
                    size = (Math.random() * 5 + 4) * sizeMult;
                } else if (type === 'vine') {
                    size = (Math.random() * 2 + 1.5) * sizeMult;
                } else if (type === 'ink') {
                    size = (Math.random() * 4 + 4) * sizeMult;
                } else if (type === 'galaxy' || type === 'vortex') {
                    size = (Math.random() * 1.8 + 1.2) * sizeMult;
                }
                p.size = size;
                p.color = spawnColor;
                p.type = type;
                p.decay = decayRate;
                p.alpha = 1;
                p.angle = Math.random() * Math.PI * 2;
                p.vAngle = (Math.random() - 0.5) * 0.06;
                p.wObble = Math.random() * 100;
                p.radius = (type === 'galaxy' || type === 'vortex') ? (Math.random() * 35 + 8) : (Math.random() * 5 + 2);
                p.char = Math.random() < 0.5 ? '0' : '1';
                p.trajectory = type === 'fireworks' ? 'explode' : trajectory;
                p.shape = app.state.particleShape || 'circle';
                p.glowStrength = app.state.particleGlow || 0;
                
                if (type === 'vine') {
                    p.path = [{ x, y }];
                    p.leafBuds = [];
                } else {
                    p.path = null;
                    p.leafBuds = null;
                }
                
                spawned++;
        }
    }

    update() {
        for (let i = this.activeIndices.length - 1; i >= 0; i--) {
            const index = this.activeIndices[i];
            const p = this.pool[index];
            if (!p.active) continue;
            
            if ((p.type === 'galaxy' || p.type === 'vortex') && p.anchorHand && app.handsData[p.anchorHand]) {
                const finger = app.handsData[p.anchorHand][p.anchorJoint];
                if (finger) {
                    p.startX = finger.x;
                    p.startY = finger.y;
                }
                
                if (p.type === 'vortex') {
                    p.angle += p.speed * 0.05 + 0.04;
                    p.radius = Math.max(2, p.radius - 0.2);
                    p.x = p.startX + Math.cos(p.angle) * p.radius;
                    p.y = p.startY + Math.sin(p.angle) * p.radius;
                } else {
                    p.angle += 0.06;
                    p.radius += p.speed * 0.4;
                    p.x = p.startX + Math.cos(p.angle) * p.radius;
                    p.y = p.startY + Math.sin(p.angle) * p.radius;
                }
            } else if (p.type === 'fireworks') {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05; // Gravity pull
            } else {
                // Apply custom trajectories
                if (p.trajectory === 'none') {
                    // Zero movement
                } else if (p.trajectory === 'spiral') {
                    p.radius += p.speed;
                    p.angle += 0.06;
                    p.x = p.startX + Math.cos(p.angle) * p.radius;
                    p.y = p.startY + Math.sin(p.angle) * p.radius;
                } else if (p.trajectory === 'fountain') {
                    if (p.radius > 0) {
                        p.vy = -Math.abs(p.vy) * 1.35;
                        p.radius = 0;
                    }
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.09;
                } else if (p.trajectory === 'drift') {
                    p.x += Math.abs(p.vx) * 0.8 + 0.6;
                    p.y += p.vy + Math.sin(p.wObble) * 0.4;
                    p.wObble += 0.08;
                } else {
                    // Standard 'explode'
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.type === 'petal') {
                        p.x += Math.sin(p.wObble) * 0.4;
                        p.y += p.vy * 0.4 + 0.6;
                        p.wObble += 0.04;
                        p.angle += p.vAngle * 0.5;
                    } else if (p.type === 'leaf') {
                        p.x += Math.sin(p.wObble) * 1.6;
                        p.y += p.vy * 0.4 + 0.7;
                        p.wObble += 0.05;
                        p.angle += p.vAngle;
                    } else if (p.type === 'vine') {
                        p.x += p.vx + Math.sin(p.wObble) * 1.5;
                        p.y += p.vy + Math.cos(p.wObble) * 1.5;
                        p.wObble += 0.08;
                        p.vx *= 0.95;
                        p.vy *= 0.95;

                        if (p.path) {
                            p.path.push({ x: p.x, y: p.y });
                            if (p.path.length > 20) p.path.shift();
                        }
                        
                        if (Math.random() < 0.22 && p.leafBuds) {
                            p.leafBuds.push({
                                x: p.x,
                                y: p.y,
                                size: p.size * (Math.random() * 0.6 + 0.8),
                                angle: Math.random() * Math.PI * 2,
                                side: Math.random() < 0.5 ? -1 : 1
                            });
                        }
                    } else if (p.type === 'ink') {
                        p.x += p.vx * 0.90;
                        p.y += p.vy * 0.90;
                        p.size += 0.28;
                    }
                }
            }
            
            let currentDecay = p.decay;
            if (app.state.artStyle === 'ink') {
                currentDecay *= 1.20; // 20% faster decay
            }
            p.alpha -= currentDecay;
            if (p.alpha <= 0) {
                p.active = false;
                this.freeList.push(index);
                this.activeIndices.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        for (let i = 0; i < this.activeIndices.length; i++) {
            const index = this.activeIndices[i];
            const p = this.pool[index];
            if (!p.active) continue;
            
            ctx.save();
            ctx.globalAlpha = p.alpha;
            
            // Outer glow if enabled
            const glow = p.glowStrength || 0;
            if (glow > 0) {
                ctx.save();
                ctx.globalAlpha = p.alpha * 0.15;
                ctx.fillStyle = p.color;
                ctx.strokeStyle = p.color;
                this.drawParticleShape(ctx, p, glow * 2.0);
                ctx.restore();
            }
            
            // Main shape draw
            ctx.fillStyle = p.color;
            ctx.strokeStyle = p.color;
            this.drawParticleShape(ctx, p, 0);
            ctx.restore();
        }
        ctx.restore();
    }

    drawParticleShape(ctx, p, sizeOffset = 0) {
        if (p.type === 'galaxy' || p.type === 'vortex') {
            ctx.save();
            const rad = p.size + sizeOffset * 0.5;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 2.2);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, p.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, rad * 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.type === 'starry') {
            const outer = (p.size + sizeOffset * 0.5) * 2.2;
            const inner = (p.size + sizeOffset * 0.2) * 0.6;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI) / 2;
                ctx.lineTo(p.x + Math.cos(angle) * outer, p.y + Math.sin(angle) * outer);
                ctx.lineTo(p.x + Math.cos(angle + Math.PI/4) * inner, p.y + Math.sin(angle + Math.PI/4) * inner);
            }
            ctx.closePath();
            ctx.fill();
        } else if (p.type === 'petal') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size + sizeOffset * 0.5, (p.size + sizeOffset * 0.3) * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.type === 'leaf') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.beginPath();
            ctx.moveTo(-(p.size + sizeOffset), 0);
            ctx.quadraticCurveTo(0, -(p.size + sizeOffset * 0.5) * 0.55, p.size + sizeOffset, 0);
            ctx.quadraticCurveTo(0, (p.size + sizeOffset * 0.5) * 0.55, -(p.size + sizeOffset), 0);
            ctx.closePath();
            ctx.fill();
            
            if (sizeOffset === 0) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-p.size, 0);
                ctx.lineTo(p.size, 0);
                ctx.stroke();
            }
            ctx.restore();
        } else if (p.type === 'vine') {
            if (p.path && p.path.length > 1) {
                ctx.save();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                for (let j = 0; j < p.path.length - 1; j++) {
                    const pt1 = p.path[j];
                    const pt2 = p.path[j + 1];
                    const ratio = j / (p.path.length - 1);
                    ctx.lineWidth = (p.size + sizeOffset * 0.3) * ratio * 1.5;
                    ctx.globalAlpha = p.alpha * ratio * (sizeOffset > 0 ? 0.25 : 1);
                    ctx.beginPath();
                    ctx.moveTo(pt1.x, pt1.y);
                    ctx.lineTo(pt2.x, pt2.y);
                    ctx.stroke();
                }
                ctx.restore();
            }
            if (p.leafBuds) {
                p.leafBuds.forEach(bud => {
                    ctx.save();
                    ctx.globalAlpha = p.alpha * 0.8 * (sizeOffset > 0 ? 0.25 : 1);
                    ctx.translate(bud.x, bud.y);
                    ctx.rotate(bud.angle);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(bud.side * (bud.size + sizeOffset * 0.5), -(bud.size + sizeOffset * 0.2) * 0.4, bud.side * (bud.size + sizeOffset * 0.5) * 1.6, 0);
                    ctx.quadraticCurveTo(bud.side * (bud.size + sizeOffset * 0.5), (bud.size + sizeOffset * 0.2) * 0.4, 0, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                });
            }
        } else if (p.type === 'ink') {
            ctx.save();
            ctx.globalAlpha = p.alpha * 0.8 * (sizeOffset > 0 ? 0.25 : 1);
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size + sizeOffset);
            grad.addColorStop(0, p.color);
            grad.addColorStop(0.35, p.color);
            grad.addColorStop(0.7, 'rgba(0,0,0,0.3)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size + sizeOffset, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.type === 'code') {
            if (sizeOffset === 0) {
                ctx.font = `bold ${Math.floor(p.size * 2 + 6)}px monospace`;
                ctx.fillText(p.char, p.x, p.y);
            } else {
                ctx.save();
                ctx.globalAlpha = p.alpha * 0.2;
                ctx.font = `bold ${Math.floor((p.size + sizeOffset * 0.4) * 2 + 6)}px monospace`;
                ctx.fillText(p.char, p.x, p.y);
                ctx.restore();
            }
        } else {
            const shape = p.shape || 'circle';
            if (shape === 'star') {
                const outer = (p.size + sizeOffset * 0.5) * 2.0;
                const inner = (p.size + sizeOffset * 0.2) * 0.5;
                ctx.beginPath();
                for (let j = 0; j < 4; j++) {
                    const angle = (j * Math.PI) / 2;
                    ctx.lineTo(p.x + Math.cos(angle) * outer, p.y + Math.sin(angle) * outer);
                    ctx.lineTo(p.x + Math.cos(angle + Math.PI/4) * inner, p.y + Math.sin(angle + Math.PI/4) * inner);
                }
                ctx.closePath();
                ctx.fill();
            } else if (shape === 'leaf') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.beginPath();
                ctx.moveTo(-(p.size + sizeOffset), 0);
                ctx.quadraticCurveTo(0, -(p.size + sizeOffset * 0.5) * 0.55, p.size + sizeOffset, 0);
                ctx.quadraticCurveTo(0, (p.size + sizeOffset * 0.5) * 0.55, -(p.size + sizeOffset), 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (shape === 'square') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                const sz = p.size + sizeOffset * 0.5;
                ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
                ctx.restore();
            } else if (shape === 'ring') {
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size + sizeOffset, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size + sizeOffset * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

const particles = new ParticleSystem();

// --- Ripple expansion trigger ---
class RippleSystem {
    constructor() {
        this.ripples = [];
    }

    trigger(x, y, color) {
        this.ripples.push({
            x: x,
            y: y,
            radius: 5,
            maxRadius: 90,
            color: color,
            alpha: 1,
            speed: 4.5,
            rotation: Math.random() * Math.PI * 2,
            isInk: app && app.state.artStyle === 'ink'
        });
    }

    update() {
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed;
            r.alpha = 1 - (r.radius / r.maxRadius);
            if (r.radius >= r.maxRadius) {
                this.ripples.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        this.ripples.forEach(r => {
            ctx.globalAlpha = r.alpha;
            if (r.isInk) {
                const drawInkRipple = () => {
                    ctx.save();
                    ctx.translate(r.x, r.y);
                    ctx.rotate(r.rotation);
                    ctx.beginPath();
                    // irregular ellipse
                    ctx.ellipse(0, 0, r.radius, r.radius * 0.75, 0, 0, Math.PI * 2);
                    ctx.restore();
                };
                drawPathWithGlow(ctx, drawInkRipple, 'rgba(160, 82, 45, 0.15)', 2.5, 0);
            } else {
                const drawRipple = () => {
                    ctx.beginPath();
                    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
                };
                drawPathWithGlow(ctx, drawRipple, r.color, 2.5, 12);
            }
        });
        ctx.restore();
    }
}

const ripples = new RippleSystem();
