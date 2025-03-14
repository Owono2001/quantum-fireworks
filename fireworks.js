const FIREWORK_TYPES = ['PEONY', 'CHRYSANTHEMUM', 'PALM', 'RANDOM'];
const MAX_INTENSITY = 50000;
let fireworks = [];
let gravity;
let noise = new SimplexNoise();

class FireworkSystem {
    constructor() {
        this.config = {
            launchFrequency: 0.5,
            explosionSize: 300,
            particleCount: 2000,
            turbulence: 0.8,
            wind: 0.2,
            colorTransition: true,
            sound: true,
            bloomEffect: true,
            gravity: 0.08,
            physicsAccuracy: 3,
            autoLaunch: true,
            particleType: 'QUANTUM'
        };

        this.initGUI();
        this.initSound();
        this.lastLaunch = 0;
    }

    initGUI() {
        const gui = new dat.GUI();
        gui.add(this.config, 'autoLaunch').name('Auto Launch');
        gui.add(this.config, 'launchFrequency', 0.1, 2).name('Launch Rate');
        gui.add(this.config, 'explosionSize', 100, 1000).name('Explosion Size');
        gui.add(this.config, 'particleCount', 500, 5000).step(100).name('Particles');
        gui.add(this.config, 'physicsAccuracy', 1, 5).step(1).name('Physics Quality');
        gui.add(this.config, 'particleType', ['QUANTUM', 'CLASSIC', 'FLUID']).name('Particle Type');
        gui.add(this, 'manualLaunch').name('Launch Now!');
    }

    initSound() {
        this.synth = new p5.MonoSynth();
        this.reverb = new p5.Reverb();
        this.reverb.process(this.synth, 3, 2);
    }

    update() {
        this.applyForces();
        this.cleanup();
        if (this.config.autoLaunch && millis() - this.lastLaunch > 1000/this.config.launchFrequency) {
            this.launchRandom();
            this.lastLaunch = millis();
        }
    }

    applyForces() {
        fireworks.forEach(f => f.particles.forEach(p => {
            p.applyForce(createVector(gravity.x, gravity.y));
            p.applyForce(createVector(noise.noise2D(p.pos.x*0.01, p.pos.y*0.01) * this.config.wind, 0));
        }));
    }

    cleanup() {
        fireworks = fireworks.filter(f => !f.done);
    }

    launchRandom() {
        const type = FIREWORK_TYPES[floor(random(FIREWORK_TYPES.length))];
        const pos = createVector(random(width*0.2, width*0.8), height);
        this.launch(pos, type);
    }

    manualLaunch() {
        this.launch(createVector(mouseX, height), 'RANDOM');
    }

    launch(pos, type) {
        fireworks.push(new Firework(pos, type, this.config));
        if (this.config.sound) this.playSound(type);
    }

    playSound(type) {
        const freqMap = { PEONY: 440, CHRYSANTHEMUM: 660, PALM: 220, RANDOM: random(200, 800) };
        this.synth.play(freqMap[type], 0.2, 0, 0.1);
    }
}

class Firework {
    constructor(pos, type, config) {
        this.pos = pos.copy();
        this.vel = createVector(0, random(-12, -18));
        this.particles = [];
        this.type = type;
        this.config = config;
        this.lifecycle = 'ASCENT';
        this.explosionColor = color(random(255), random(255), random(255), 255);
        this.initShell();
    }

    initShell() {
        this.shell = new Particle(
            this.pos.copy(),
            this.vel.copy(),
            color(255, 150),
            false
        );
    }

    update() {
        if (this.lifecycle === 'ASCENT') {
            this.shell.applyForce(createVector(0, this.config.gravity));
            this.shell.update();
            
            if (this.shell.vel.y >= 0) {
                this.explode();
                this.lifecycle = 'EXPLOSION';
            }
        }
        
        this.particles.forEach(p => {
            for (let i = 0; i < this.config.physicsAccuracy; i++) {
                p.update();
            }
        });
    }

    explode() {
        const explosionPatterns = {
            PEONY: this.createPeony,
            CHRYSANTHEMUM: this.createChrysanthemum,
            PALM: this.createPalm,
            RANDOM: this.createRandom
        };

        explosionPatterns[this.type].call(this);
    }

    createPeony() {
        const angleStep = TWO_PI / this.config.particleCount;
        for (let a = 0; a < TWO_PI; a += angleStep) {
            const force = p5.Vector.fromAngle(a).mult(random(this.config.explosionSize * 0.8, this.config.explosionSize));
            this.createParticle(force);
        }
    }

    createChrysanthemum() {
        for (let i = 0; i < this.config.particleCount; i++) {
            const force = p5.Vector.random3D().mult(random(this.config.explosionSize * 0.5));
            force.z *= 0.2;
            this.createParticle(force);
        }
    }

    createPalm() {
        const angle = random(-PI/4, PI/4);
        for (let i = 0; i < this.config.particleCount; i++) {
            const force = p5.Vector.fromAngle(angle + random(-0.1, 0.1))
                          .mult(random(this.config.explosionSize * 0.5, this.config.explosionSize))
                          .rotate(random(-0.2, 0.2));
            this.createParticle(force);
        }
    }

    createRandom() {
        for (let i = 0; i < this.config.particleCount; i++) {
            const force = p5.Vector.random3D().mult(random(this.config.explosionSize));
            this.createParticle(force);
        }
    }

    createParticle(force) {
        const p = new Particle(
            this.shell.pos.copy(),
            force.mult(0.5),
            lerpColor(this.explosionColor, color(random(255), random(255), random(255)), random(0.2)),
            true
        );
        
        if (this.config.particleType === 'FLUID') {
            p.enableFluidBehavior();
        }
        
        this.particles.push(p);
    }

    get done() {
        return this.lifecycle === 'EXPLOSION' && 
               this.particles.every(p => p.alpha <= 0);
    }

    display() {
        if (this.lifecycle === 'ASCENT') {
            this.shell.display();
        }
        
        this.particles.forEach(p => p.display());
    }
}

class Particle {
    constructor(pos, vel, col, isExplosion) {
        this.pos = pos;
        this.vel = vel;
        this.acc = createVector();
        this.col = col;
        this.alpha = 255;
        this.size = isExplosion ? random(2, 5) : 4;
        this.lifespan = random(0.8, 1.2);
        this.fluid = false;
        this.trail = [];
    }

    applyForce(f) {
        this.acc.add(f);
    }

    update() {
        if (this.fluid) {
            this.applyFluidBehavior();
        }
        
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
        
        this.alpha -= deltaTime * 0.5;
        this.trail.push(this.pos.copy());
        if (this.trail.length > 10) this.trail.shift();
    }

    enableFluidBehavior() {
        this.fluid = true;
        this.density = random(0.8, 1.2);
        this.pressure = 0;
    }

    applyFluidBehavior() {
        const viscosity = 0.97;
        const pressureForce = this.pressure * 0.01;
        this.vel.mult(viscosity);
        this.vel.add(p5.Vector.random2D().mult(pressureForce));
    }

    display() {
        const currentColor = color(
            red(this.col),
            green(this.col),
            blue(this.col),
            this.alpha * (this.fluid ? 0.8 : 1)
        );

        if (this.fluid) {
            this.displayFluid(currentColor);
        } else {
            this.displayClassic(currentColor);
        }

        this.displayTrail(currentColor);
    }

    displayClassic(col) {
        noStroke();
        fill(col);
        ellipse(this.pos.x, this.pos.y, this.size);
    }

    displayFluid(col) {
        drawingContext.shadowColor = col;
        drawingContext.shadowBlur = 20;
        fill(col);
        ellipse(this.pos.x, this.pos.y, this.size * 2);
    }

    displayTrail(col) {
        this.trail.forEach((pos, i) => {
            const alpha = map(i, 0, this.trail.length, 50, 255);
            fill(red(col), green(col), blue(col), alpha * 0.2);
            noStroke();
            ellipse(pos.x, pos.y, this.size * map(i, 0, this.trail.length, 0.5, 1));
        });
    }
}

let system;
let canvas;

function setup() {
    canvas = createCanvas(windowWidth, windowHeight, WEBGL);
    canvas.elt.style.zIndex = -1;
    colorMode(RGB);
    gravity = createVector(0, 0.08);
    system = new FireworkSystem();
    frameRate(60);
}

function draw() {
    background(0, 25);
    translate(-width/2, -height/2);
    
    system.update();
    fireworks.forEach(f => {
        f.update();
        f.display();
    });

    if (system.config.bloomEffect) {
        drawingContext.shadowColor = 'rgba(255,255,255,0.2)';
        drawingContext.shadowBlur = 50;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
    if (!system.config.autoLaunch) {
        system.manualLaunch();
    }
}