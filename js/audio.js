class AudioSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.padEnabled = true;
        
        // Pentatonic Scale (C Major) for plucking
        this.scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
        this.lastPlayTime = 0;
        this.waveform = 'guzheng'; // guzheng, flute, bell, violin, birds, rain, sine, triangle...
        
        // Delay Node echo effects for Guzheng and Harp strings
        this.delayNode = null;
        this.delayFeedback = null;

        // Background Chord Pad (Drone synth) variables
        this.padOscs = [];
        this.padGain = null;
        this.padFilter = null;
        this.currentChordIndex = 0;
        this.chordProgression = [
            [130.81, 164.81, 196.00], // C3, E3, G3 (C Major)
            [110.00, 130.81, 164.81], // A2, C3, E3 (A Minor)
            [87.31, 110.00, 130.81],  // F2, A2, C3 (F Major)
            [98.00, 123.47, 146.83]   // G2, B2, D3 (G Major)
        ];
        this.padInterval = null;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            logger.log('Audio Context initialized.', 'success');
            
            // Setup feedback delay line echo node
            this.delayNode = this.ctx.createDelay(1.0);
            this.delayNode.delayTime.setValueAtTime(0.24, this.ctx.currentTime); // 240ms delay echo
            this.delayFeedback = this.ctx.createGain();
            this.delayFeedback.gain.setValueAtTime(0.38, this.ctx.currentTime); // 38% feedback echo volume
            
            // WebRTC Audio Merge setup
            this.mainGain = this.ctx.createGain();
            this.mainGain.connect(this.ctx.destination);
            
            this.masterDest = this.ctx.createMediaStreamDestination();
            this.mainGain.connect(this.masterDest);
            
            this.delayNode.connect(this.delayFeedback);
            this.delayFeedback.connect(this.delayNode);
            this.delayNode.connect(this.mainGain);

            // Initialize the chord pad drone background synth
            this.initPad();
            
            // Initialize continuous nature loops
            this.initNature();
        } catch (e) {
            logger.log('Failed to initialize Web Audio API.', 'error');
        }
    }

    initPad() {
        if (!this.ctx) return;
        this.padGain = this.ctx.createGain();
        this.padGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.padFilter = this.ctx.createBiquadFilter();
        this.padFilter.type = 'lowpass';
        const now = this.ctx.currentTime;
        const initialChord = this.chordProgression[this.currentChordIndex];
        
        // Start 3 oscillators for the ambient triad
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle'; // Smooth, warm tone for ambient backing
            osc.frequency.setValueAtTime(initialChord[i], now);
            
            const oscGain = this.ctx.createGain();
            oscGain.gain.setValueAtTime(0.06, now); // Warm backing volume
            
            osc.connect(oscGain);
            oscGain.connect(this.padGain);
            osc.start(now);
            
            this.padOscs.push(osc);
        }
        
        // Smooth chord progression interval (every 6 seconds)
        this.padInterval = setInterval(() => {
            this.nextChord();
        }, 6000);
    }

    nextChord() {
        if (!this.ctx || !this.padEnabled || !this.enabled) return;
        
        this.currentChordIndex = (this.currentChordIndex + 1) % this.chordProgression.length;
        const chord = this.chordProgression[this.currentChordIndex];
        const now = this.ctx.currentTime;
        
        // Smoothly glide frequencies to transition between chords
        this.padOscs.forEach((osc, idx) => {
            if(osc && osc.frequency) osc.frequency.exponentialRampToValueAtTime(chord[idx], now + 3.0);
        });
    }

    initNature() {
        if (!this.ctx) return;
        
        // Create continuous white noise buffer
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        this.natureSource = this.ctx.createBufferSource();
        this.natureSource.buffer = buffer;
        this.natureSource.loop = true;

        this.natureFilter = this.ctx.createBiquadFilter();
        this.natureFilter.type = 'lowpass';
        this.natureFilter.frequency.value = 800;
        
        this.natureLfo = this.ctx.createOscillator();
        this.natureLfo.type = 'sine';
        this.natureLfo.frequency.value = 0.15;
        this.natureLfoGain = this.ctx.createGain();
        this.natureLfoGain.gain.value = 300;
        this.natureLfo.connect(this.natureLfoGain).connect(this.natureFilter.frequency);
        this.natureLfo.start();

        this.natureGain = this.ctx.createGain();
        this.natureGain.gain.value = 0;

        this.natureSource.connect(this.natureFilter);
        this.natureFilter.connect(this.natureGain);
        this.natureGain.connect(this.mainGain);
        this.natureSource.start();
    }

    updatePadFilter(handDistance, active, tension = 0) {
        if (!this.ctx || !this.padGain || !this.padFilter) return;
        
        const now = this.ctx.currentTime;
        if (!active || !this.padEnabled || !this.enabled || ['rain', 'ocean', 'stream'].includes(this.waveform)) {
            // Fade out pad when hands disappear or nature mode is active
            this.padGain.gain.setTargetAtTime(0, now, 0.4);
        } else {
            // Fade in pad when hands appear
            this.padGain.gain.setTargetAtTime(0.25, now, 0.4);
            
            // Map hand distance (100px - 800px) to base lowpass filter cutoff frequency (200Hz - 1500Hz)
            const clampedDist = Math.max(100, Math.min(800, handDistance));
            const baseFreq = 200 + ((clampedDist - 100) / 700) * 1300;
            
            // Increase frequency based on tension (up to 3500Hz)
            const tensionFreqBoost = tension * 8; // e.g. 200px tension = +1600Hz
            const targetFreq = Math.min(3500, baseFreq + tensionFreqBoost);
            
            this.padFilter.frequency.setTargetAtTime(targetFreq, now, 0.15);
        }

        // --- Continuous Nature loop logic ---
        if (this.natureGain && this.natureFilter) {
            if (active && ['rain', 'ocean', 'stream'].includes(this.waveform)) {
                this.natureGain.gain.setTargetAtTime(0.12, now, 0.5); // Fade in nature
                
                if (this.waveform === 'rain') {
                    this.natureFilter.type = 'lowpass';
                    this.natureFilter.frequency.setTargetAtTime(800 + (handDistance * 2) + (tension * 10), now, 0.2);
                    this.natureLfoGain.gain.setTargetAtTime(200, now, 0.1);
                    this.natureLfo.frequency.setTargetAtTime(0.3, now, 0.1);
                } else if (this.waveform === 'ocean') {
                    this.natureFilter.type = 'bandpass';
                    this.natureFilter.frequency.setTargetAtTime(300 + (handDistance * 1.5), now, 0.2);
                    this.natureLfoGain.gain.setTargetAtTime(400, now, 0.1);
                    this.natureLfo.frequency.setTargetAtTime(0.1, now, 0.1); // slower waves
                } else if (this.waveform === 'stream') {
                    this.natureFilter.type = 'bandpass';
                    this.natureFilter.frequency.setTargetAtTime(1200 + (handDistance * 1.5), now, 0.2);
                    this.natureLfoGain.gain.setTargetAtTime(300, now, 0.1);
                    this.natureLfo.frequency.setTargetAtTime(0.5, now, 0.1); // faster babbling
                }
            } else {
                this.natureGain.gain.setTargetAtTime(0, now, 0.5); // Fade out nature
            }
        }
    }

    playPluck(velocity, yRatio = 0.5) {
        if (!this.enabled || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime < 0.08) return;
        this.lastPlayTime = now;

        let activeScale = this.scale;
        
        // Pentatonic scale mode (C-D-E-G-A) for Ink art style
        if (app && app.state && app.state.artStyle === 'ink') {
            activeScale = [
                261.63, // C4 (宫)
                293.66, // D4 (商)
                329.63, // E4 (角)
                392.00, // G4 (徵)
                440.00, // A4 (羽)
                523.25, // C5 (高宫)
                587.33, // D5
                659.25, // E5
                783.99, // G5
                880.00  // A5
            ];
        }

        // Map yRatio (0=top, 1=bottom) to pitch (top=high pitch, bottom=low pitch)
        let pitchIndex = Math.floor((1.0 - Math.max(0, Math.min(1, yRatio))) * activeScale.length);
        pitchIndex = Math.max(0, Math.min(activeScale.length - 1, pitchIndex));
        const freq = activeScale[pitchIndex];

        // 28 Instruments routing
        const type = this.waveform;
        // Eastern
        if (type === 'guzheng') this.synthGuzheng(freq, velocity, now);
        else if (type === 'erhu') this.synthErhu(freq, velocity, now);
        else if (type === 'pipa') this.synthPipa(freq, velocity, now);
        else if (type === 'shakuhachi') this.synthFlute(freq * 0.5, velocity, now);
        else if (type === 'yangqin') this.synthYangqin(freq, velocity, now);
        else if (type === 'suona') this.synthSuona(freq, velocity, now);
        else if (type === 'bianzhong') this.synthBell(freq * 0.5, velocity, now);
        
        // Western
        else if (type === 'violin') this.synthViolin(freq, velocity, now);
        else if (type === 'cello') this.synthViolin(freq * 0.5, velocity, now);
        else if (type === 'piano') this.synthPiano(freq, velocity, now);
        else if (type === 'harp') this.synthGuzheng(freq * 1.5, velocity, now);
        else if (type === 'flute') this.synthFlute(freq * 1.5, velocity, now);
        else if (type === 'oboe') this.synthOboe(freq, velocity, now);
        else if (type === 'glockenspiel') this.synthBell(freq * 2, velocity, now);
        else if (type === 'organ') this.synthOrgan(freq, velocity, now);
        
        // Nature
        else if (type === 'birds') this.synthBirds(now);
        else if (type === 'rain' || type === 'ocean' || type === 'stream') return; // Handled by continuous buffer loop
        else if (type === 'thunder') this.synthThunder(now);
        else if (type === 'fire') this.synthFire(now);
        else if (type === 'crickets') this.synthCrickets(now);
        
        // Modern Synth
        else if (type === 'cyber_pluck') this.synthCyberPluck(freq, velocity, now);
        else if (type === 'fm_bass') this.synthFMBass(freq * 0.5, velocity, now);
        else this.synthDefault(freq, velocity, now);
    }

    synthDefault(freq, velocity, now) {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = this.waveform;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.005, now + 0.04);

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(1.5, now);
        filter.frequency.setValueAtTime(2500, now);
        filter.frequency.exponentialRampToValueAtTime(350, now + 0.35);

        const volume = Math.min(0.25, (velocity / 120) * 0.15 + 0.05);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.mainGain);

        osc.start(now);
        osc.stop(now + 0.85);
    }

    synthGuzheng(freq, velocity, now) {
        // Guzheng uses a triangle wave with sharp pluck envelope + delay feedback
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        // Slight string bend
        osc.frequency.linearRampToValueAtTime(freq * 1.015, now + 0.06);
        osc.frequency.linearRampToValueAtTime(freq, now + 0.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.25);

        const gainNode = this.ctx.createGain();
        const volume = Math.min(0.22, (velocity / 120) * 0.12 + 0.04);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.005); // sharp attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.mainGain);

        // Echo delay connection
        if (this.delayNode) {
            gainNode.connect(this.delayNode);
        }

        osc.start(now);
        osc.stop(now + 0.9);
    }

    synthBell(freq, velocity, now) {
        // Glockenspiel chime: fundamental sine + overtone modulator
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2.76, now); // Inharmonic chime metallic ratio

        const gain1 = this.ctx.createGain();
        const vol1 = Math.min(0.18, (velocity / 120) * 0.1 + 0.03);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(vol1, now + 0.005);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.25); // long ringing resonance

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(vol1 * 0.5, now + 0.005);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25); // overtone decays fast

        osc1.connect(gain1);
        gain1.connect(this.mainGain);
        osc2.connect(gain2);
        gain2.connect(this.mainGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 0.3);
    }

    synthFlute(freq, velocity, now) {
        // Breathy Flute/Shakuhachi: sine wave with vibrato LFO and soft breath attack
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Vibrato
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(5.6, now); // 5.6 Hz vibrato
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(7.0, now); // LFO amplitude depth
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        const gainNode = this.ctx.createGain();
        const volume = Math.min(0.24, (velocity / 120) * 0.15 + 0.05);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.08); // slow breathy attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

        osc.connect(gainNode);
        gainNode.connect(this.mainGain);

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 1.0);
        osc.stop(now + 1.0);
    }

    synthViolin(freq, velocity, now) {
        // Sawtooth wave with slow attack and vibrato
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        // Vibrato
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(6.0, now);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(5.0, now);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now); // soften high harmonics buzz

        const gainNode = this.ctx.createGain();
        const volume = Math.min(0.18, (velocity / 120) * 0.1 + 0.03);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.09); // slow attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.mainGain);

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 1.3);
        osc.stop(now + 1.3);
    }

    synthBirds(now) {
        // Valley Birds: chirping frequency sweeps
        const chirpCount = 3;
        for (let i = 0; i < chirpCount; i++) {
            const delay = i * 0.09;
            const t = now + delay;
            
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800 + Math.random() * 200, t);
            osc.frequency.exponentialRampToValueAtTime(3200 + Math.random() * 400, t + 0.06); // sweep up

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            osc.connect(gain);
            gain.connect(this.mainGain);
            
            osc.start(t);
            osc.stop(t + 0.08);
        }
    }

    synthRain(freq, now) {
        // Rain & Wind: clicks + low bandpass noise sweep
        // Raindrop Click
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 1.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03); // super fast pluck click

        osc.connect(gain);
        gain.connect(this.mainGain);
        osc.start(now);
        osc.stop(now + 0.04);

        // Wind sweep
        const oscWind = this.ctx.createOscillator();
        oscWind.type = 'sine';
        oscWind.frequency.setValueAtTime(100 + Math.random() * 40, now);
        oscWind.frequency.linearRampToValueAtTime(150 + Math.random() * 50, now + 0.45);

        const gainWind = this.ctx.createGain();
        gainWind.gain.setValueAtTime(0, now);
        gainWind.gain.linearRampToValueAtTime(0.08, now + 0.1);
        gainWind.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        oscWind.connect(gainWind);
        gainWind.connect(this.mainGain);
        oscWind.start(now);
        oscWind.stop(now + 0.5);
    }

    // --- New V3 Synth Methods ---
    synthErhu(freq, velocity, now) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 0.98, now);
        osc.frequency.linearRampToValueAtTime(freq, now + 0.1);
        
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(5.5, now);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(4.0, now);
        lfo.connect(lfoGain).connect(osc.frequency);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        osc.connect(filter).connect(gain).connect(this.mainGain);
        lfo.start(now); osc.start(now);
        lfo.stop(now + 1.5); osc.stop(now + 1.5);
    }

    synthPipa(freq, velocity, now) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 2, now);
        filter.Q.setValueAtTime(2, now);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(filter).connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 0.4);
    }

    synthYangqin(freq, velocity, now) {
        const osc1 = this.ctx.createOscillator(); osc1.type = 'triangle'; osc1.frequency.setValueAtTime(freq, now);
        const osc2 = this.ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.setValueAtTime(freq * 2, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc1.connect(gain); osc2.connect(gain); gain.connect(this.mainGain);
        osc1.start(now); osc2.start(now); osc1.stop(now+0.9); osc2.stop(now+0.9);
    }

    synthSuona(freq, velocity, now) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.setValueAtTime(800, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(filter).connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 0.7);
    }

    synthPiano(freq, velocity, now) {
        const osc = this.ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 1.3);
    }
    
    synthOboe(freq, velocity, now) {
        const osc = this.ctx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(freq, now);
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(1000, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.18, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.connect(filter).connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 1.1);
    }

    synthOrgan(freq, velocity, now) {
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.15, now + 0.1); gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        [1, 2, 4].forEach(mult => {
            const osc = this.ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq * mult, now);
            osc.connect(gain); osc.start(now); osc.stop(now + 1.6);
        });
        gain.connect(this.mainGain);
    }

    synthOcean(now) {
        const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(50, now);
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(200, now); filter.frequency.linearRampToValueAtTime(800, now + 1);
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.1, now + 1); gain.gain.exponentialRampToValueAtTime(0.001, now + 3);
        osc.connect(filter).connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 3.1);
    }

    synthThunder(now) {
        const osc = this.ctx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(40, now);
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(150, now);
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        osc.connect(filter).connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 2.1);
    }

    synthStream(now) {
        const osc = this.ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(400 + Math.random()*200, now);
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.05, now + 0.1); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 0.6);
    }

    synthFire(now) {
        const osc = this.ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(300 + Math.random()*800, now);
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 0.06);
    }

    synthCrickets(now) {
        const osc = this.ctx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(4500, now);
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.02, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 0.11);
    }

    synthCyberPluck(freq, velocity, now) {
        const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(freq, now);
        const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(5000, now); filter.frequency.exponentialRampToValueAtTime(200, now + 0.2); filter.Q.setValueAtTime(5, now);
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(filter).connect(gain).connect(this.mainGain);
        osc.start(now); osc.stop(now + 0.5);
    }

    synthFMBass(freq, velocity, now) {
        const osc = this.ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now);
        const mod = this.ctx.createOscillator(); mod.type = 'sine'; mod.frequency.setValueAtTime(freq * 2, now);
        const modGain = this.ctx.createGain(); modGain.gain.setValueAtTime(freq * 1.5, now);
        mod.connect(modGain).connect(osc.frequency);
        const gain = this.ctx.createGain(); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.3, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain).connect(this.mainGain);
        mod.start(now); osc.start(now); mod.stop(now+0.7); osc.stop(now+0.7);
    }
    
    playCutSound() {
        if (!this.enabled || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15); // Drop pitch rapidly
        
        gainNode.gain.setValueAtTime(0.18, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        
        osc.connect(gainNode);
        gainNode.connect(this.mainGain);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }

    playSubBassBoom() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.2);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.65, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, now);
        
        osc.connect(filter).connect(gainNode).connect(this.mainGain);
        
        osc.start(now);
        osc.stop(now + 1.6);
    }
}

const synth = new AudioSynth();
