/**
 * Utility Functions for Cats Cradle App
 */

function lerpColor(color1, color2, factor) {
    if (factor <= 0) return color1;
    if (factor >= 1) return color2;
    if (typeof color1 !== 'string' || !color1.startsWith('rgb(')) return color1;
    if (typeof color2 !== 'string' || !color2.startsWith('rgb(')) return color2;
    
    let c1 = color1.match(/\d+/g).map(Number);
    let c2 = color2.match(/\d+/g).map(Number);
    
    if (!c1 || c1.length < 3 || !c2 || c2.length < 3) return color1;
    
    let r1 = c1[0], g1 = c1[1], b1 = c1[2];
    let r2 = c2[0], g2 = c2[1], b2 = c2[2];
    
    let r = Math.round(r1 + (r2 - r1) * factor);
    let g = Math.round(g1 + (g2 - g1) * factor);
    let b = Math.round(b1 + (b2 - b1) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
}

function lerpColorHex(color1, color2, factor) {
    if (factor <= 0) return color1;
    if (factor >= 1) return color2;
    if (typeof color1 !== 'string' || !color1.startsWith('#')) return color1;
    if (typeof color2 !== 'string' || !color2.startsWith('#')) return color2;
    
    let r1 = parseInt(color1.slice(1, 3), 16);
    let g1 = parseInt(color1.slice(3, 5), 16);
    let b1 = parseInt(color1.slice(5, 7), 16);
    
    let r2 = parseInt(color2.slice(1, 3), 16);
    let g2 = parseInt(color2.slice(3, 5), 16);
    let b2 = parseInt(color2.slice(5, 7), 16);
    
    let r = Math.round(r1 + (r2 - r1) * factor);
    let g = Math.round(g1 + (g2 - g1) * factor);
    let b = Math.round(b1 + (b2 - b1) * factor);
    
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isJointEnabled(joint, enabledFingers) {
    if (!enabledFingers) return true;
    if (joint === 4) return enabledFingers.thumb;
    if (joint === 8) return enabledFingers.index;
    if (joint === 12) return enabledFingers.middle;
    if (joint === 16) return enabledFingers.ring;
    if (joint === 20) return enabledFingers.pinky;
    return true;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}
