class VerletString {
    constructor(id, anchorA, anchorB, targetLength = 350, numPoints = 15) {
        this.id = id;
        this.anchorA = anchorA; // { hand: 'Left'|'Right', joint: number }
        this.anchorB = anchorB; // { hand: 'Left'|'Right', joint: number }
        this.targetLength = targetLength;
        this.numPoints = numPoints;
        this.points = [];
        this.isFading = false;
        this.opacity = 1;
        this.initialized = false;
        
        this.cutIndex = -1; // -1 means solid. If >= 0, string was cut at this segment.
        this.lostStartTime = 0;
    }

    initPoints(posA, posB) {
        this.points = [];
        this.restLength = Math.hypot(posB.x - posA.x, posB.y - posA.y);
        for (let i = 0; i < this.numPoints; i++) {
            const ratio = i / (this.numPoints - 1);
            const x = posA.x + (posB.x - posA.x) * ratio;
            const y = posA.y + (posB.y - posA.y) * ratio;
            this.points.push({
                x: x,
                y: y,
                oldX: x,
                oldY: y,
                isAnchor: i === 0 || i === this.numPoints - 1
            });
        }
        this.initialized = true;
    }

    update(posA, posB, config, palmCenters) {
        const num = this.numPoints;

        // If anchors are active and not fading out
        if (posA && posB && !this.isFading) {
            if (!this.initialized) {
                this.initPoints(posA, posB);
            }
            this.points[0].x = posA.x;
            this.points[0].y = posA.y;
            this.points[num - 1].x = posB.x;
            this.points[num - 1].y = posB.y;
            this.lostStartTime = 0;
            
            // Handle absolute straight mode overriding physics completely
            if (config.absoluteStraight) {
                for (let i = 0; i < num; i++) {
                    const ratio = i / (num - 1);
                    this.points[i].x = posA.x + (posB.x - posA.x) * ratio;
                    this.points[i].y = posA.y + (posB.y - posA.y) * ratio;
                    this.points[i].oldX = this.points[i].x;
                    this.points[i].oldY = this.points[i].y;
                }
                return;
            }
        } else {
            // Cut or lost hand: check if we are in the grace period of tracking loss
            if (config.neverBreak || !config.dropOnLost) {
                this.isFading = false;
                this.lostStartTime = 0;
                this.opacity = 1;
                this.points.forEach((p, idx) => {
                    if (idx === 0 || idx === num - 1) {
                        p.isAnchor = true;
                    }
                });
            } else if (!this.isFading && posA === null && posB === null) {
                if (this.lostStartTime === 0) this.lostStartTime = Date.now();
                if (Date.now() - this.lostStartTime >= 580) {
                    this.isFading = true;
                    this.points.forEach(p => p.isAnchor = false);
                }
                // Retain last known anchor positions, do not snap-fall yet
            } else {
                this.isFading = true;
                this.points.forEach(p => p.isAnchor = false);
            }
        }

        if (!this.initialized) return;

        // Physics solver (Verlet Integration)
        const gravity = config.physics ? config.gravityStrength : 0;
        const damping = config.physics ? config.damping : 0.95;
        const gEngine = config.gravityEngine || 'down';
        
        let cx = 0, cy = 0;
        if (gEngine === 'blackhole' || gEngine === 'centrifugal' || gEngine === 'vortex') {
            const cvs = document.getElementById('output-canvas');
            if (cvs) { cx = cvs.width / 2; cy = cvs.height / 2; }
        }

        for (let i = 0; i < num; i++) {
            const p = this.points[i];
            if (!p.isAnchor) {
                const vx = (p.x - p.oldX) * damping;
                const vy = (p.y - p.oldY) * damping;
                p.oldX = p.x;
                p.oldY = p.y;
                
                p.x += vx;
                p.y += vy;
                
                if (config.physics) {
                    if (gEngine === 'down') p.y += gravity * 2;
                    else if (gEngine === 'up') p.y -= gravity * 2;
                    else if (gEngine === 'blackhole') {
                        const dx = cx - p.x; const dy = cy - p.y;
                        const dist = Math.hypot(dx, dy) || 1;
                        p.x += (dx / dist) * gravity * 4;
                        p.y += (dy / dist) * gravity * 4;
                    }
                    else if (gEngine === 'centrifugal') {
                        const dx = p.x - cx; const dy = p.y - cy;
                        const dist = Math.hypot(dx, dy) || 1;
                        p.x += (dx / dist) * gravity * 4;
                        p.y += (dy / dist) * gravity * 4;
                    }
                    else if (gEngine === 'vortex') {
                        const dx = cx - p.x; const dy = cy - p.y;
                        p.x += dy * gravity * 0.01;
                        p.y -= dx * gravity * 0.01;
                        p.y += gravity; // slight pull down
                    }
                }

                // Handle Flower Pattern Attraction (pull strings to shape petals)
                if (config.pattern === 'flower' && this.cutIndex === -1) {
                    const palm = this.anchorA.hand === 'Left' ? palmCenters.Left : palmCenters.Right;
                    if (palm) {
                        const pullStrength = 0.04;
                        p.x += (palm.x - p.x) * pullStrength;
                        p.y += (palm.y - p.y) * pullStrength;
                    }
                }
            } else {
                p.oldX = p.x;
                p.oldY = p.y;
            }
        }

        // Distance constraints solver
        const currentDist = (posA && posB) ? Math.hypot(posB.x - posA.x, posB.y - posA.y) : 100;
        
        let segmentLength;
        if (config.physics) {
            const stringRest = Math.min(this.targetLength, this.restLength || currentDist);
            segmentLength = stringRest / (num - 1);
        } else {
            segmentLength = currentDist / (num - 1);
        }

        let totalStretch = 0;
        // Run relaxation solver (iterations speed based on preset tension)
        const iterations = config.physics ? 8 : 1;
        for (let iter = 0; iter < iterations; iter++) {
            totalStretch = 0;
            for (let i = 0; i < num - 1; i++) {
                if (i === this.cutIndex) continue; // Skip constraints solver at the snap split!
                
                const p1 = this.points[i];
                const p2 = this.points[i + 1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.hypot(dx, dy) || 0.001;
                const diff = segmentLength - dist;
                
                if (iter === iterations - 1) {
                    totalStretch += Math.max(0, -diff);
                }
                
                // Toughness scales relaxation speed:
                const toughnessVal = config.toughness !== undefined ? config.toughness : 5;
                const percent = (diff / dist) * 0.1 * toughnessVal;
                
                const offsetX = dx * percent;
                const offsetY = dy * percent;

                if (!p1.isAnchor) {
                    p1.x -= offsetX;
                    p1.y -= offsetY;
                }
                if (!p2.isAnchor) {
                    p2.x += offsetX;
                    p2.y += offsetY;
                }
            }
        }

        if (this.isFading) {
            this.opacity -= 0.02; // Smooth fade away
        }

        // Calculate string tension (using O(1) overhead constraint diff sum)
        this.tension = 0;
        if (this.cutIndex === -1 && !this.isFading && this.initialized) {
            this.tension = totalStretch;
        }
    }

    draw(ctx, color, width, glowStrength, style = 'solid') {
        if (!this.initialized || this.opacity <= 0) return;

        // Calculate 3D Depth scaling factor based on Z-axis of anchors
        let avgZ = 0;
        if (this.anchorA && this.anchorB && this.anchorA.z !== undefined && this.anchorB.z !== undefined) {
            avgZ = (this.anchorA.z + this.anchorB.z) / 2;
        }
        
        // MediaPipe z is usually small (e.g. -0.1 to 0.1). Negative is closer to camera.
        // We invert it so negative z (closer) yields a scale > 1.0 (thicker, brighter)
        let zScale = 1.0;
        if (avgZ !== 0) {
            zScale = Math.max(0.4, Math.min(2.5, 1.0 - (avgZ * 4.5)));
        }

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Depth affects opacity (closer = more opaque, further = faded)
        const depthOpacity = Math.max(0.15, Math.min(1.0, this.opacity * zScale));
        ctx.globalAlpha = depthOpacity;
        
        // Depth affects line width and glow
        width = width * zScale;
        glowStrength = glowStrength * zScale;
        
        // Extract original color for fallback (removing var if any)
        let finalColor = color;
        
        // Geometric straight mode bypass
        if (app && app.state && app.state.absoluteStraight) {
            ctx.strokeStyle = finalColor;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            
            // Check if cut, if so, draw up to cut point, else draw to end
            if (this.cutIndex === -1) {
                ctx.lineTo(this.points[this.numPoints - 1].x, this.points[this.numPoints - 1].y);
            } else {
                ctx.lineTo(this.points[this.cutIndex].x, this.points[this.cutIndex].y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(this.points[this.cutIndex + 1].x, this.points[this.cutIndex + 1].y);
                ctx.lineTo(this.points[this.numPoints - 1].x, this.points[this.numPoints - 1].y);
            }
            ctx.stroke();
            ctx.restore();
            return;
        }

        if (style === 'brush') {
            // Draw using dynamic brush style logic (Ink mode)
            const brushStyle = (app && app.state && app.state.brushStyle) ? app.state.brushStyle : 'xing';
            
            // Mo fen wu se (墨分五色) based on decay (opacity)
            let diffBlur = 0, diffWidth = 1.0, diffAlpha = 1.0;
            if (this.opacity > 0.8) { // 焦 (Jiao)
                diffBlur = 0; diffAlpha = 1.0; diffWidth = 0.9;
            } else if (this.opacity > 0.6) { // 浓 (Nong)
                diffBlur = 2; diffAlpha = 0.85; diffWidth = 1.0;
            } else if (this.opacity > 0.4) { // 重 (Zhong)
                diffBlur = 5; diffAlpha = 0.7; diffWidth = 1.2;
            } else if (this.opacity > 0.2) { // 淡 (Dan)
                diffBlur = 10; diffAlpha = 0.4; diffWidth = 1.6;
            } else { // 清 (Qing)
                diffBlur = 18; diffAlpha = 0.2; diffWidth = 2.2;
            }

            ctx.shadowColor = finalColor;
            ctx.shadowBlur = diffBlur;
            ctx.strokeStyle = finalColor;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = this.opacity * (app.state.inkDensity || 0.85) * diffAlpha;
            
            const baseWidth = width * diffWidth;

            const renderBrushStroke = (startIdx, endIdx) => {
                if (endIdx - startIdx < 2) return;
                
                for (let i = startIdx; i < endIdx - 1; i++) {
                    const p1 = this.points[i];
                    const p2 = this.points[i + 1];
                    
                    const vx = p1.x - p1.oldX;
                    const vy = p1.y - p1.oldY;
                    const vel = Math.hypot(vx, vy);
                    
                    // Map velocity to line width based on Brush Style
                    let scale = 1.0;
                    if (brushStyle === 'kai') {
                        // 楷书: 平稳粗实，速度影响极小
                        scale = 1.0 - Math.min(vel / 50, 0.3);
                    } else if (brushStyle === 'xing') {
                        // 行书: 连贯灵动，适度的飞白
                        scale = 1.0 - Math.min(vel / 20, 0.7);
                    } else if (brushStyle === 'cao') {
                        // 草书: 狂草飞白，速度影响极大
                        scale = 1.0 - Math.min(vel / 10, 0.95);
                        // Random splatter for high velocity in Cao mode
                        if (vel > 18 && Math.random() > 0.6) {
                            ctx.fillStyle = finalColor;
                            const r = Math.random() * 2 + 1;
                            ctx.beginPath();
                            ctx.arc(p1.x + (Math.random()-0.5)*15, p1.y + (Math.random()-0.5)*15, r, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                    
                    // Taper the ends of the brush stroke
                    const total = endIdx - startIdx;
                    const localIdx = i - startIdx;
                    if (localIdx < 3) scale *= (localIdx + 1) / 4;
                    if (localIdx > total - 4) scale *= (total - localIdx) / 4;
                    
                    ctx.lineWidth = baseWidth * 2.2 * Math.max(scale, 0.15);
                    
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    // Quadratic curve for smoothness
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            };

            if (this.cutIndex === -1) {
                renderBrushStroke(0, this.numPoints);
            } else {
                renderBrushStroke(0, this.cutIndex + 1);
                renderBrushStroke(this.cutIndex + 1, this.numPoints);
            }
            
            ctx.restore();
            return;
        }

        if (style === 'dashed') {
            ctx.setLineDash([12, 6]);
        } else if (style === 'dotted') {
            ctx.setLineDash([3, 8]);
        } else {
            ctx.setLineDash([]);
        }

        // Calculate tension factor
        const tFactor = Math.min(1, (this.tension || 0) / 150);
        
        // Blend color towards warm highlighted orange/gold
        let finalColorRender = finalColor;
        if (tFactor > 0 && typeof finalColor === 'string' && finalColor.startsWith('#')) {
            finalColorRender = lerpColor(finalColor, tFactor);
        }
        
        const finalWidth = width + tFactor * 2.5;
        const finalGlow = glowStrength + tFactor * 20;

        const drawPath = () => {
            if (this.cutIndex === -1) {
                // Draw regular solid string
                ctx.beginPath();
                ctx.moveTo(this.points[0].x, this.points[0].y);
                for (let i = 1; i < this.numPoints; i++) {
                    ctx.lineTo(this.points[i].x, this.points[i].y);
                }
            } else {
                // String is cut: Draw two separate pieces
                // Piece A
                ctx.beginPath();
                ctx.moveTo(this.points[0].x, this.points[0].y);
                for (let i = 1; i <= this.cutIndex; i++) {
                    ctx.lineTo(this.points[i].x, this.points[i].y);
                }
                
                // Piece B
                ctx.moveTo(this.points[this.cutIndex + 1].x, this.points[this.cutIndex + 1].y);
                for (let i = this.cutIndex + 2; i < this.numPoints; i++) {
                    ctx.lineTo(this.points[i].x, this.points[i].y);
                }
            }
        };

        drawPathWithGlow(ctx, drawPath, finalColorRender, finalWidth, finalGlow);

        ctx.restore();
    }
}

// --- Particle Effects System ---
