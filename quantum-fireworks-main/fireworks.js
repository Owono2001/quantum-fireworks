// --- Constants ---
const FIREWORK_TYPES = ['PEONY', 'CHRYSANTHEMUM', 'PALM', 'WILLOW', 'STROBE', 'CRACKLING', 'MULTI_BREAK', 'RANDOM'];
const PARTICLE_TYPES = ['CLASSIC', 'FLUID', 'QUANTUM'];
const MAX_PARTICLES_PER_FIREWORK = 5000;
const MAX_TOTAL_PARTICLES = 30000;
const TRAIL_LENGTH = 15;

// --- Global Variables ---
let fireworks = [];
let particles = [];
let gravity;
let noise;
let system; // Will be initialized in setup
let canvas;

// Color Palettes
const PALETTES = [
  ['#FF4E50', '#FC913A', '#F9D423', '#EDE574', '#E1F5C4'], // Sunset
  ['#1E90FF', '#00BFFF', '#87CEFA', '#ADD8E6', '#E0FFFF'], // Ocean
  ['#228B22', '#556B2F', '#8FBC8F', '#90EE90', '#3CB371'], // Forest
  ['#FF0000', '#FF4500', '#FFA500', '#FFD700', '#FFFF00'], // Fire
  ['#FF00FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF69B4'], // Neon
  ['#FFFFFF', '#D3D3D3', '#A9A9A9', '#FFD700', '#F0E68C']  // Monochrome + Gold
];

// --- p5.js Core Functions ---

// preload() function removed as it was only for sound loading

function setup() {
  console.log("Starting setup..."); // Debug log
  canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.elt.style.zIndex = -1;
  colorMode(RGB, 255);
  noise = new SimplexNoise();
  gravity = createVector(0, 0.08);

  // Initialize global particle array
  particles = [];

  // Initialize the system
  try {
    console.log("Attempting to create FireworkSystem..."); // Debug log
    system = new FireworkSystem();
    console.log("FireworkSystem instance created successfully."); // Debug log
    console.log("Setup complete. Simulator ready.");
  } catch (error) {
    console.error("Failed to initialize FireworkSystem:", error);
    // Provide feedback to the user on the page if setup fails badly
    // Use standard p5 drawing for error message as WEBGL setup might be incomplete
    // Reset drawing mode for error message
    let ctx = canvas.elt.getContext('2d'); // Get 2D context if possible for simple text
    if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Error during setup. Check console (F12).', width / 2, height / 2);
    } else { // Fallback if context fails
        background(0);
        fill(255);
        textSize(20);
        textAlign(CENTER, CENTER);
        text('Error during setup. Check console (F12).', 0, 0); // Use 0,0 in WEBGL if needed
    }
    noLoop(); // Stop draw loop if setup failed
    return; // Prevent further execution in setup if system failed
  }

  console.log("Exiting setup function normally."); // Debug log
  frameRate(60);
}


function draw() {
  // Safety check: If system failed to initialize, don't try to draw.
  if (!system) {
      // Error message is likely already drawn in setup's catch block
      return;
  }

  // --- Normal Drawing Logic ---
  // Use system.config safely
  const bgOpacity = (system && system.config) ? system.config.backgroundOpacity : 25;
  background(0, bgOpacity);
  translate(-width / 2, -height / 2); // Center WEBGL coordinates

  system.update(); // Update system (launching, etc.)

  // Update and display particles
  for (let i = particles.length - 1; i >= 0; i--) {
    // Add checks to prevent errors if system or gravity are somehow null/undefined
    // or if particle itself is bad
    let p = particles[i];
    if (!p || !p.pos || !p.vel || !p.acc) {
        console.warn("Removing invalid particle:", p);
        particles.splice(i, 1);
        continue;
    }

    if (gravity) p.applyForce(gravity);
    // Ensure system and getWind exist before calling
    if (system && typeof system.getWind === 'function') {
        p.applyForce(system.getWind(p.pos));
    }
     // Ensure system and config exist before accessing airDrag
    if (system && system.config && typeof p.applyDrag === 'function') {
        p.applyDrag(system.config.airDrag);
    }

    p.update();
    p.display();

    if (p.isDone()) {
      particles.splice(i, 1);
    }
  }

  // Update and display fireworks (Shells before explosion)
  for (let i = fireworks.length - 1; i >= 0; i--) {
      let fw = fireworks[i];
      if (!fw) {
          fireworks.splice(i,1);
          continue;
      }
    fw.update();
    // fw.display(); // Firework itself doesn't draw, its shell particle does
    if (fw.done) { // done is true once it calls explode()
      fireworks.splice(i, 1);
    }
  }

  // Apply global bloom effect (basic version for WEBGL)
  if (system.config && system.config.bloomEffect) {
      // drawingContext might not be the best approach in WebGL for bloom
      // Shaders are typically used. This provides a basic glow.
      if (typeof drawingContext !== 'undefined' && drawingContext.shadowBlur !== undefined) {
          drawingContext.shadowBlur = system.config.bloomIntensity;
          drawingContext.shadowColor = 'rgba(255, 255, 255, 0.5)';
      }
  } else {
      if (typeof drawingContext !== 'undefined' && drawingContext.shadowBlur !== undefined) {
          drawingContext.shadowBlur = 0;
      }
  }
  // Reset shadow/bloom *after* drawing everything potentially affected by it
  // but it might interfere with dat.gui. Better to apply selectively if needed.
   if (typeof drawingContext !== 'undefined' && drawingContext.shadowBlur !== undefined) {
      drawingContext.shadowBlur = 0; // Resetting here
   }
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
  // Safety Check: Ensure 'system' exists and has config before using it.
  if (system && system.config && !system.config.autoLaunch) {
    // Check if mouse is over the GUI panel to prevent launching when clicking GUI
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) { // Basic check - assumes GUI isn't full screen
        let isOverGUI = false;
        const guis = document.getElementsByClassName('dg'); // Check if dat.gui element exists and mouse is over it
        if (guis.length > 0) {
            const rect = guis[0].getBoundingClientRect();
             if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
                 isOverGUI = true;
             }
        }
        if (!isOverGUI) {
           system.manualLaunch(mouseX, mouseY);
        }
    }
  } else if (!system) {
    console.warn("System not initialized, cannot manual launch.");
  }
}

// --- Sound Loading Callbacks Removed ---


// --- Firework System Class ---
class FireworkSystem {
    constructor() {
        console.log("FireworkSystem constructor started."); // Debug log A
        this.config = {
            launchFrequency: 0.5,    // Launches per second
            explosionSize: 400,      // Influence particle speed
            particleCount: 1500,     // Target particles per burst
            wind: 0.3,               // Base wind strength
            turbulence: 0.01,        // How much wind varies
            colorTransition: true,   // (Not fully implemented in provided code)
            // sound: true,          // Removed
            // masterVolume: 0.6,    // Removed
            bloomEffect: true,       // Simple glow effect
            bloomIntensity: 35,      // Glow amount
            gravity: 0.08,           // Downward acceleration
            airDrag: 0.02,           // Velocity reduction factor
            autoLaunch: true,        // Launch automatically or on click
            particleType: 'CLASSIC', // 'CLASSIC', 'FLUID', 'QUANTUM'
            fireworkType: 'RANDOM',  // Default launch type
            backgroundOpacity: 25,   // Lower value = longer trails (0-255)
            maxTotalParticles: MAX_TOTAL_PARTICLES, // Global limit
        };
         console.log("Config set."); // Debug log B

        // Initialize GUI *after* config is set
        this.initGUI();
         console.log("GUI initialized."); // Debug log C
        this.lastLaunch = 0;

        // Set initial gravity from config
        if (gravity) gravity.y = this.config.gravity; // Check if global gravity vector exists

        // Apply initial volume setting - Removed
        // this.updateVolume();
         console.log("FireworkSystem constructor finished."); // Debug log D
    }

    initGUI() {
        try {
            const gui = new dat.GUI();
            gui.add(this.config, 'autoLaunch').name('Auto Launch').onChange(this.resetLaunchTimer.bind(this));
            gui.add(this.config, 'launchFrequency', 0.1, 5, 0.1).name('Launch Rate (/sec)');
            gui.add(this.config, 'fireworkType', FIREWORK_TYPES).name('Launch Type');
            // Add the manual launch function directly from the instance
            gui.add(this, 'manualLaunch').name('Launch Now!');

            let fVisuals = gui.addFolder('Visuals');
            fVisuals.add(this.config, 'explosionSize', 50, 1500, 10).name('Explosion Size');
            fVisuals.add(this.config, 'particleCount', 100, MAX_PARTICLES_PER_FIREWORK, 100).name('Particles/Burst').onChange(val => {
                this.config.particleCount = floor(val); // Ensure integer value
            });
            fVisuals.add(this.config, 'particleType', PARTICLE_TYPES).name('Particle Style');
            fVisuals.add(this.config, 'bloomEffect').name('Bloom Effect');
            fVisuals.add(this.config, 'bloomIntensity', 0, 100, 1).name('Bloom Intensity');
            fVisuals.add(this.config, 'backgroundOpacity', 5, 100, 1).name('Trail Persistence');
            fVisuals.open();

            let fPhysics = gui.addFolder('Physics & Environment');
            fPhysics.add(this.config, 'gravity', 0.01, 0.5, 0.01).name('Gravity').onChange(val => { if(gravity) gravity.y = val; });
            fPhysics.add(this.config, 'wind', 0, 2, 0.05).name('Wind Strength');
            fPhysics.add(this.config, 'turbulence', 0.001, 0.05, 0.001).name('Wind Turbulence');
            fPhysics.add(this.config, 'airDrag', 0, 0.1, 0.005).name('Air Drag');
            fPhysics.open();

            // Audio Folder Removed
            // let fAudio = gui.addFolder('Audio');
            // fAudio.add(this.config, 'sound').name('Enable Sound').onChange(this.updateVolume.bind(this));
            // fAudio.add(this.config, 'masterVolume', 0, 1, 0.05).name('Master Volume').onChange(this.updateVolume.bind(this));
            // fAudio.open();

            let fPerformance = gui.addFolder('Performance');
            fPerformance.add(this.config, 'maxTotalParticles', 5000, 50000, 1000).name('Max Particles (Global)').onChange(val => {
                 this.config.maxTotalParticles = floor(val); // Ensure integer
            });
            fPerformance.open();
        } catch (e) {
            console.error("Error initializing dat.GUI:", e);
            // Optionally disable GUI features or notify user
        }
    }

    // updateVolume() method removed

    resetLaunchTimer() {
      // Reset timer only if auto-launch is enabled
      if (this.config.autoLaunch) {
         this.lastLaunch = millis();
      }
    }

    update() {
      if (this.config.autoLaunch && millis() - this.lastLaunch > 1000 / this.config.launchFrequency) {
        if (particles.length < this.config.maxTotalParticles) {
          this.launchRandom();
          this.lastLaunch = millis();
        } else {
          // Optional: Log when max particles prevents auto launch
          // console.log("Max particles reached, skipping auto launch.");
        }
      }
    }

    getWind(position) {
        // Safety check for noise object and position validity
        if (!noise || !position || typeof position.x !== 'number' || typeof position.y !== 'number') {
            return createVector(0, 0);
        }
        const time = millis() * 0.0001; // Slow time evolution for wind pattern
        // Use noise safely
        let noiseVal = 0;
        if (typeof noise.noise3D === 'function') {
             noiseVal = noise.noise3D(position.x * this.config.turbulence, position.y * this.config.turbulence, time);
        }
        // Calculate wind force: base wind + turbulent variation
        const windForce = createVector(this.config.wind + noiseVal * this.config.wind * 0.5, 0); // Wind primarily horizontal
        return windForce;
    }


    launch(pos, typeOverride = null) {
        if (particles.length >= this.config.maxTotalParticles) {
            console.warn("Max particle limit reached. Skipping launch.");
            return;
        }
        // Validate position
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
            console.error("Invalid launch position:", pos);
            return;
        }


        let type = typeOverride || this.config.fireworkType;
        if (type === 'RANDOM') {
            const types = FIREWORK_TYPES.filter(t => t !== 'RANDOM');
            type = random(types); // Pick a random non-random type
        }

        // Launch velocity: mostly upwards, slight horizontal variation
        const launchVel = createVector(random(-1.5, 1.5), random(-18, -24)); // Increased range slightly
        // Pass the system's config to the firework
        fireworks.push(new Firework(pos, launchVel, type, this.config));

        // Play sound block removed
    }


    launchRandom() {
        // Launch from a random position near the bottom
        const xPos = random(width * 0.15, width * 0.85); // Slightly narrower range
        const startPos = createVector(xPos, height); // Start at bottom edge
        // Use the type selected in the GUI if not 'RANDOM', otherwise pick one
         this.launch(startPos, this.config.fireworkType === 'RANDOM' ? 'RANDOM' : this.config.fireworkType);
    }

    manualLaunch(x = null, y = null) {
        // Use provided coordinates if available, otherwise mouse coordinates
         const launchX = (x !== null) ? x : mouseX;
        // Always launch from the bottom of the screen towards the click point conceptually
         console.log(`Manual launch initiated towards (${launchX}, ${y})`); // Y is less relevant for start position
        const startPos = createVector(launchX, height);
        // Launch using the type selected in the GUI
        this.launch(startPos, this.config.fireworkType);
    }

}


// --- Firework Class ---
class Firework {
    constructor(pos, vel, type, config) {
        // Create the initial shell particle
        // Ensure config exists before accessing properties
        const initialColor = color(255, 255, 0, 200); // Brighter, slightly less transparent shell
         this.shell = new Particle(pos.copy(), vel.copy(), initialColor, 4, 'SHELL');
         // Immediately pass config reference to the shell particle
        if (this.shell) {
            this.shell.configRef = config;
        }

        this.type = type;
        this.config = config; // Store config reference for explosion
        this.lifecycle = 'ASCENT';
        // Set explosion altitude relative to window height
        this.explosionAltitude = random(height * 0.1, height * 0.5);
        this.palette = random(PALETTES); // Choose a random color palette for this firework
        this.hasExploded = false;

        // Add shell to the global particle list (ensure 'particles' exists)
        if (particles && this.shell) {
           particles.push(this.shell);
        } else if (!this.shell) {
            console.error("Failed to create shell particle for firework.");
        }
    }

    update() {
        // Check if shell exists and is still ascending
        if (this.lifecycle === 'ASCENT' && this.shell && this.shell.vel && this.shell.pos) {
            // Explode when velocity slows near apex OR reaches target altitude
            if ((this.shell.vel.y >= -0.5) || (this.shell.pos.y <= this.explosionAltitude)) {
                 if (!this.hasExploded) {
                     this.explode(); // Explode uses stored config
                     this.lifecycle = 'EXPLOSION';
                     // Make the original shell particle fade quickly after explosion
                     // Check shell exists before calling method
                     if (this.shell) this.shell.setFading(0.1); // Faster fade out for shell
                     this.hasExploded = true;
                 }
            }
        }
        // If the shell particle somehow got removed before exploding, mark firework as done.
        if (this.lifecycle === 'ASCENT' && !particles.includes(this.shell)) {
             console.warn("Shell particle disappeared before explosion.");
             this.lifecycle = 'EXPLOSION'; // Treat as done
             this.hasExploded = true;
        }
    }


    explode() {
        // Safety check for config object and shell particle/position
        if (!this.config) {
            console.error("Firework cannot explode without config reference.");
            return;
        }
         if (!this.shell || !this.shell.pos) {
            console.error("Firework shell missing or invalid, cannot explode at:", this.shell);
            // Try to mark as done to prevent infinite loop?
            this.lifecycle = 'EXPLOSION';
            this.hasExploded = true;
            return;
        }


        const explosionPos = this.shell.pos.copy();
        // Use config safely, providing defaults
        const numParticles = floor(min(this.config.particleCount || 1000, MAX_PARTICLES_PER_FIREWORK));
        const baseForce = (this.config.explosionSize || 400) / 10.0; // Use float division


        // Play explosion sound block removed

        // --- Explosion Pattern Logic ---
        // Inherit velocity from shell (makes explosions feel less static)
         const inheritedVel = (this.shell && this.shell.vel) ? this.shell.vel.copy().mult(0.1) : createVector(0,0);

        switch (this.type) {
            case 'PEONY': // Spherical burst, classic
            case 'CHRYSANTHEMUM': // Similar to Peony, maybe slightly stronger/longer trails
                for (let i = 0; i < numParticles; i++) {
                    const angle = random(TWO_PI);
                    const forceMag = random(baseForce * 0.8, baseForce * 1.2) * (this.type === 'CHRYSANTHEMUM' ? 1.05 : 1.0); // Chrys slightly stronger
                    const vel = p5.Vector.fromAngle(angle).mult(forceMag).add(inheritedVel);
                    const lifespan = random(1.0, 1.8) * (this.type === 'CHRYSANTHEMUM' ? 1.1 : 1.0); // Chrys lasts slightly longer
                    this.createParticle(explosionPos, vel, random(this.palette), 3, 'EXPLOSION', { lifespan: lifespan });
                }
                break;

            case 'PALM': // Fewer thick branches
                 const mainBranches = floor(random(4, 7));
                 for (let i = 0; i < mainBranches; i++) {
                     const angle = (i / mainBranches) * TWO_PI + random(-0.15, 0.15); // Branch angle + slight randomness
                     const branchForce = baseForce * random(1.2, 1.6); // Stronger initial burst for branches
                     const baseVel = p5.Vector.fromAngle(angle).mult(branchForce);
                     const particlesPerBranch = floor(numParticles / mainBranches);
                     for (let j = 0; j < particlesPerBranch; j++) {
                         // Add variation within the branch direction
                         const variation = p5.Vector.random2D().mult(baseForce * 0.35);
                         const vel = p5.Vector.add(baseVel, variation).add(inheritedVel);
                         this.createParticle(explosionPos, vel, random(this.palette), random(3, 4.5), 'EXPLOSION', { lifespan: random(1.5, 2.5) }); // Slightly larger particles
                     }
                 }
                 break;

            case 'WILLOW': // Long-lasting, drooping trails
                 for (let i = 0; i < numParticles; i++) {
                     const angle = random(TWO_PI);
                     const forceMag = random(baseForce * 0.4, baseForce * 0.8); // Slower explosion
                     const vel = p5.Vector.fromAngle(angle).mult(forceMag).add(inheritedVel);
                     // Add slight downward bias to velocity after initial burst? (gravity handles most drooping)
                     // vel.y += random(0.1, 0.5);
                     this.createParticle(explosionPos, vel, random(this.palette), 2.5, 'EXPLOSION', { lifespan: random(3.0, 5.0), fadeRate: 0.4 }); // Longer life, slower fade
                 }
                 break;

               case 'STROBE': // Flashing white particles
                 for (let i = 0; i < numParticles * 0.7; i++) { // Fewer particles for strobe effect
                     const angle = random(TWO_PI);
                     const forceMag = random(baseForce * 0.7, baseForce * 1.1);
                     const vel = p5.Vector.fromAngle(angle).mult(forceMag).add(inheritedVel);
                     // Strobe particles are typically white or silver
                     const strobeColor = color(random(200, 255)); // Shades of white/grey
                     this.createParticle(explosionPos, vel, strobeColor, 2, 'STROBE', { lifespan: random(1.5, 3.0), strobeRate: random(5, 15) }); // Add strobe rate property
                 }
                 break;

               case 'CRACKLING': // Particles that spawn more tiny, short-lived particles
                 // Play crackle sound block removed
                 for (let i = 0; i < numParticles * 0.8; i++) { // Fewer main particles
                     const angle = random(TWO_PI);
                     const forceMag = random(baseForce * 0.6, baseForce * 1.0);
                     const vel = p5.Vector.fromAngle(angle).mult(forceMag).add(inheritedVel);
                     this.createParticle(explosionPos, vel, random(this.palette), 2.5, 'CRACKLE_SOURCE', { lifespan: random(0.8, 1.5), crackleRate: random(3, 8) }); // Add crackle rate
                 }
                 break;

            case 'MULTI_BREAK': // Shell explodes into several smaller shells that then explode
                 const breaks = floor(random(2, 5));
                 for (let i = 0; i < breaks; i++) {
                     const angle = random(TWO_PI);
                     const forceMag = random(baseForce * 0.6, baseForce * 1.0); // Secondary shells don't travel *too* far
                     const vel = p5.Vector.fromAngle(angle).mult(forceMag).add(inheritedVel.copy().mult(1.5)); // Inherit more initial velocity

                     // Ensure particles array exists before pushing
                     if (particles) {
                         const miniShell = new Particle(
                             explosionPos.copy(),
                             vel,
                             color(255, 220, 150, 200), // Mini shell color
                             3,
                             'MINI_SHELL'
                         );
                         // Assign properties needed for secondary explosion
                         miniShell.delay = random(0.4, 0.9); // Delay before mini-explosion
                         // Prevent infinite multi-breaks or random type
                         const validSubTypes = FIREWORK_TYPES.filter(t => t !== 'RANDOM' && t !== 'MULTI_BREAK');
                         miniShell.subType = random(validSubTypes);
                         miniShell.palette = random(PALETTES); // Give it its own palette
                         miniShell.timeCreated = millis() / 1000.0;
                         // IMPORTANT: Pass the config reference to the mini-shell
                         miniShell.configRef = this.config;
                         particles.push(miniShell);
                     }
                 }
                 break;

            default: // Fallback to a basic spherical explosion
                 console.warn("Unknown or fallback firework type:", this.type);
                 for (let i = 0; i < numParticles; i++) {
                     // Use 3D vector for more spherical distribution, then flatten Z
                     const vel3D = p5.Vector.random3D().mult(random(baseForce * 0.7, baseForce * 1.3));
                     // vel3D.z *= 0.5; // Reduce depth spread if desired
                     const vel = createVector(vel3D.x, vel3D.y).add(inheritedVel); // Use only x, y
                     this.createParticle(explosionPos, vel, random(this.palette), 3, 'EXPLOSION', { lifespan: random(1.2, 2.2) });
                 }
                 break;
        }
    }


    createParticle(pos, vel, col, size, particleRole, options = {}) {
        // Ensure particles array and config exist, and we haven't hit the limit
        if (particles && this.config && particles.length < this.config.maxTotalParticles) {
            const p = new Particle(pos.copy(), vel.copy(), col, size, particleRole, options);
            // Assign particle style and config from the parent firework/system
            p.particleStyle = this.config.particleType;
            p.configRef = this.config; // Pass system config reference
            particles.push(p);
        } else if (particles && this.config) {
            // Optional: Log when particle creation is skipped due to limit
            // console.log("Skipping particle creation - maxTotalParticles reached.");
        }
    }

    // Property to check if the firework has finished its main action (exploding)
    get done() {
        // Firework is done once it enters the EXPLOSION lifecycle state
        // The particles it created will then live on their own.
        return this.lifecycle === 'EXPLOSION';
    }

    // The firework object itself doesn't need a display method,
    // its visual representation is the 'shell' particle during ascent.
    // display() { }
}



// --- Particle Class ---
class Particle {
    constructor(pos, vel, col, size, role, options = {}) {
        this.pos = pos;
        this.vel = vel;
        this.acc = createVector(0, 0);

        // Ensure color() function is available and col is valid before calling
        try {
            // Handle potential p5 color object passed directly
            if (typeof col === 'object' && col.levels) {
                 this.baseColor = col;
            } else {
                 this.baseColor = color(col); // Attempt to convert string/array to p5 color
            }
        } catch (e) {
            console.warn("Invalid color value provided for particle:", col, "Error:", e);
            this.baseColor = color(255); // Default to white on error
        }

        this.alpha = this.baseColor ? this.baseColor.levels[3] : 255; // Get alpha from color, default 255
        this.baseAlpha = this.alpha; // Store initial alpha
        this.size = size;
        this.role = role; // 'SHELL', 'EXPLOSION', 'STROBE', 'CRACKLE_SOURCE', 'CRACKLE', 'MINI_SHELL'
        this.particleStyle = 'CLASSIC'; // Default, assigned by Firework.createParticle
        this.configRef = null; // Reference to system config, set by Firework.createParticle or MINI_SHELL

        // Options with defaults
        this.lifespan = options.lifespan || random(1.5, 2.5); // seconds
        this.strobeRate = options.strobeRate || 0; // flashes per second
        this.crackleRate = options.crackleRate || 0; // crackles per second
        this.fadeRate = options.fadeRate || 1.0; // Multiplier for fade duration (higher = faster fade)
        this.delay = options.delay || 0; // For MINI_SHELL secondary explosion
        this.subType = options.subType || null; // For MINI_SHELL explosion type
        this.palette = options.palette || null; // For MINI_SHELL color palette

        this.timeCreated = millis() / 1000.0;
        this.lastStrobe = this.timeCreated;
        this.lastCrackle = this.timeCreated;
        this.strobeOn = true;
        this.isFading = false;
        this.fadeStartAlpha = this.alpha;
        this.fadeStartTime = 0;
        this.fadeDuration = 0.5 / max(0.1, this.fadeRate); // Base fade duration adjusted by rate

        this.trail = [];
        this.maxTrailLength = TRAIL_LENGTH;

        // Fluid properties (only used if particleStyle is 'FLUID')
        this.fluid = false; // Set true based on particleStyle later
        this.viscosity = 0.98; // Fluid drag factor
        this.density = random(0.8, 1.2); // For potential future fluid interactions
        this.pressure = 0; // For potential future fluid interactions

        // Apply style-specific initial settings
        if (this.particleStyle === 'FLUID') {
            this.enableFluidBehavior();
        }
    }

    applyForce(f) {
        // Check if f is a valid p5.Vector before adding
        if (f && typeof f.add === 'function') {
            // Apply force based on mass (optional, assume mass=1 for now)
            // let force = p5.Vector.div(f, this.mass || 1);
            this.acc.add(f);
        } else {
           // console.warn("Invalid force applied:", f); // Can be noisy
        }
    }

    applyDrag(dragCoefficient) {
        // Apply air drag only if coefficient > 0 and velocity exists
        if (dragCoefficient > 0 && this.vel) {
            const speedSq = this.vel.magSq(); // Use magnitude squared for efficiency
            if (speedSq > 0.0001) { // Avoid division by zero or tiny values
                 const speed = sqrt(speedSq);
                 // Drag force is proportional to velocity squared, opposing velocity
                 const dragMagnitude = speedSq * dragCoefficient;
                 const dragForce = this.vel.copy();
                 dragForce.setMag(-dragMagnitude); // Set magnitude directly opposite to velocity
                 this.applyForce(dragForce);
            }
        }
    }

    update() {
        // Essential property check
        if (!this.pos || !this.vel || !this.acc) {
           console.error("Particle missing essential properties (pos/vel/acc).", this);
           this.alpha = 0; // Mark for removal
           return;
        }

        const currentTime = millis() / 1000.0;
        const age = currentTime - this.timeCreated;

        // --- MINI_SHELL secondary explosion ---
        if (this.role === 'MINI_SHELL' && this.delay > 0 && age >= this.delay) {
            this.explodeSecondary();
            this.alpha = 0; // Mark for immediate removal after triggering explosion
            this.delay = 0; // Prevent re-triggering
            return; // Stop further updates/drawing for this particle
        }
        // If it's a MINI_SHELL that already exploded (delay=0), it should be gone, but double-check alpha
        if (this.role === 'MINI_SHELL' && this.delay <= 0) {
             this.alpha = 0;
             return;
        }


        // --- Physics Update ---
        this.vel.add(this.acc);
        // Use p5's deltaTime if available and reasonable, otherwise estimate frame time
        const dt = (typeof deltaTime !== 'undefined' && deltaTime > 0 && deltaTime < 250) ? deltaTime / 1000.0 : 1.0/60.0; // Convert deltaTime (ms) to seconds
        // Scale velocity by dt for frame-rate independent movement
        this.pos.add(p5.Vector.mult(this.vel, dt));
        this.acc.mult(0); // Clear acceleration for next frame


        // --- Trail Update ---
        // Add current position to trail if moving significantly
        if (this.vel.magSq() > 0.01) {
            this.trail.push(this.pos.copy());
            // Remove oldest point if trail exceeds max length
            while (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        } else if (this.trail.length > 0) {
            // If stopped, shorten the trail gradually
            this.trail.shift();
        }


        // --- Lifespan and Fading ---
        if (this.isFading) {
             // Calculate fade progress (0 to 1)
             const fadeProgress = constrain((currentTime - this.fadeStartTime) / this.fadeDuration, 0, 1);
             this.alpha = lerp(this.fadeStartAlpha, 0, fadeProgress);
             this.alpha = max(0, this.alpha); // Ensure alpha doesn't go below 0
        } else if (this.role !== 'MINI_SHELL' && age >= this.lifespan) {
             // Start fading if lifespan is reached (and not already fading)
              this.setFading(); // Uses calculated fadeDuration based on fadeRate
        }


        // --- Role-Specific Behaviors ---
        // STROBE effect
        if (this.role === 'STROBE' && this.strobeRate > 0 && !this.isFading) {
            const timeSinceStrobe = currentTime - this.lastStrobe;
            const strobeInterval = 1.0 / this.strobeRate;
            if (timeSinceStrobe >= strobeInterval) {
                this.strobeOn = !this.strobeOn;
                // Update lastStrobe accurately to prevent drift
                this.lastStrobe += strobeInterval;
                // Catch up if falling behind
                if (this.lastStrobe < currentTime - strobeInterval * 2) {
                    this.lastStrobe = currentTime;
                }
            }
        }

        // CRACKLE effect (spawning sub-particles)
        if (this.role === 'CRACKLE_SOURCE' && this.crackleRate > 0 && !this.isFading) {
            const timeSinceCrackle = currentTime - this.lastCrackle;
            // Introduce more randomness to crackle timing
            const crackleInterval = random(0.7, 1.3) / this.crackleRate;
            if (timeSinceCrackle >= crackleInterval) {
                // Check global particle limit *before* spawning
                const maxP = (this.configRef && this.configRef.maxTotalParticles) ? this.configRef.maxTotalParticles : MAX_TOTAL_PARTICLES;
                if (particles && particles.length < maxP - 5) { // Leave buffer
                     this.spawnCrackle();
                     this.lastCrackle = currentTime; // Reset timer *after* spawning
                }
            }
        }

        // FLUID style behavior
        if (this.particleStyle === 'FLUID' && this.fluid) {
            this.applyFluidBehavior();
        }
    }


    setFading(duration = -1) { // duration in seconds
        if (!this.isFading) {
            this.isFading = true;
            this.fadeStartTime = millis() / 1000.0;
            this.fadeStartAlpha = this.alpha; // Capture current alpha accurately
            // Use provided duration if valid, otherwise use calculated duration based on fadeRate
            this.fadeDuration = (duration > 0) ? duration : max(0.01, 0.5 / max(0.1, this.fadeRate));
        }
    }


    spawnCrackle() {
        // Check essential properties exist before spawning
        if (!this.pos || !this.vel || !this.configRef || !particles) return;

        const numCrackles = floor(random(1, 4));
        for (let i = 0; i < numCrackles; i++) {
            // Check limit again inside loop
            if (particles.length >= this.configRef.maxTotalParticles) break;

            // Small, fast, outward burst relative to parent particle
            const offsetVel = p5.Vector.random2D().mult(random(3, 6)); // Increased crackle speed
            const crackleVel = this.vel.copy().mult(0.2).add(offsetVel); // Inherit less parent velocity
            const crackleCol = color(random(200, 255), random(180, 255), random(150, 220)); // Brighter crackle
            const crackleLifespan = random(0.05, 0.15); // Very short life
            const crackleFadeRate = 8.0; // Fast fade

            const p = new Particle(
                this.pos.copy(), // Start at parent position
                crackleVel,
                crackleCol,
                random(1, 2.5), // Small size
                'CRACKLE',
                { lifespan: crackleLifespan, fadeRate: crackleFadeRate }
               );
               p.particleStyle = this.particleStyle; // Inherit parent's base style
               p.configRef = this.configRef; // Pass config ref
               particles.push(p);
        }
    }


    explodeSecondary() {
        // --- Critical safety checks ---
        if (!this.configRef || !this.pos || !particles) {
            console.error("Cannot explode secondary: missing config, position, or global particles array.", this);
            this.alpha = 0; // Mark for removal
            return;
        }
        // Ensure the particle exploding actually has velocity (might be needed for inheritance)
        if (!this.vel) {
            console.warn("Secondary explosion source particle has no velocity.", this);
            this.vel = createVector(0,0); // Assign default if missing
        }


        // --- Explosion Parameters ---
        const numParticles = floor(min( (this.configRef.particleCount || 1000) * 0.4, MAX_PARTICLES_PER_FIREWORK)); // Fewer particles for secondary
        const baseForce = (this.configRef.explosionSize || 400) / 18.0; // Smaller secondary explosion force
        const explosionPos = this.pos.copy();
        const paletteToUse = this.palette || random(PALETTES); // Use assigned palette or random
        const explosionType = this.subType || 'PEONY'; // Use assigned subtype or default


        // --- Sound block removed ---


        // --- Particle Creation ---
        // Create a temporary object with the necessary method and config context
        // This simplifies calling createParticle without binding issues.
         const particleCreator = {
             config: this.configRef,
             // Use the prototype function directly. Assumes 'createParticle' exists on Firework.prototype
             createParticle: Firework.prototype.createParticle,
             // We need maxTotalParticles check inside the loop potentially
             maxTotalParticles: this.configRef.maxTotalParticles || MAX_TOTAL_PARTICLES
        };

         const inheritedVel = this.vel.copy().mult(0.3); // Inherit some velocity from mini-shell


        switch (explosionType) {
            case 'PEONY':
            case 'CHRYSANTHEMUM':
             default: // Fallback for secondary is Peony
                for (let i = 0; i < numParticles; i++) {
                     if (particles.length >= particleCreator.maxTotalParticles) break;
                     const angle = random(TWO_PI);
                     const forceMag = random(baseForce * 0.8, baseForce * 1.2);
                     const vel = p5.Vector.fromAngle(angle).mult(forceMag).add(inheritedVel);
                     // Call createParticle via the temporary object, passing necessary args
                     particleCreator.createParticle(explosionPos, vel, random(paletteToUse), random(2, 3.5), 'EXPLOSION', { lifespan: random(0.8, 1.5) });
                 }
                 break;
               case 'CRACKLING':
                 // Play crackle sound block removed
                 for (let i = 0; i < numParticles * 0.8; i++) {
                     if (particles.length >= particleCreator.maxTotalParticles) break;
                     const angle = random(TWO_PI);
                     const forceMag = random(baseForce * 0.6, baseForce * 1.0);
                     const vel = p5.Vector.fromAngle(angle).mult(forceMag).add(inheritedVel);
                     particleCreator.createParticle(explosionPos, vel, random(paletteToUse), 2.5, 'CRACKLE_SOURCE', { lifespan: random(0.6, 1.2), crackleRate: random(4, 9) });
                 }
                 break;
            case 'STROBE':
                 for (let i = 0; i < numParticles * 0.7; i++) {
                     if (particles.length >= particleCreator.maxTotalParticles) break;
                     const angle = random(TWO_PI);
                     const forceMag = random(baseForce * 0.7, baseForce * 1.1);
                     const vel = p5.Vector.fromAngle(angle).mult(forceMag).add(inheritedVel);
                     const strobeColor = color(random(200, 255));
                     particleCreator.createParticle(explosionPos, vel, strobeColor, 2, 'STROBE', { lifespan: random(1.0, 2.0), strobeRate: random(6, 16) });
                 }
                 break;
               // Add other simple secondary types if desired (Willow, Palm might be too complex/heavy)
        }

        // Mini-shell is already marked for removal by setting alpha = 0 where explodeSecondary is called
    }


    enableFluidBehavior() {
       // Called if particleStyle is 'FLUID'
       this.fluid = true;
       this.viscosity = 0.97 + random(-0.02, 0.02); // Slight variation
       this.size *= random(1.3, 1.8); // Fluid particles are larger
       this.maxTrailLength = floor(this.maxTrailLength * 0.5); // Shorter trails for fluid
    }

    applyFluidBehavior() {
       // Check noise exists and particle has velocity
       if (!noise || !this.vel) return;
       // Apply viscosity (drag)
       this.vel.mult(this.viscosity);
       // Apply gentle, swirling noise force
        if (typeof noise.noise2D === 'function') {
             const noiseAngle = noise.noise2D(this.pos.x * 0.03, this.pos.y * 0.03) * TWO_PI * 2; // More swirl
             const noiseForce = p5.Vector.fromAngle(noiseAngle).mult(0.08); // Gentle force
             this.applyForce(noiseForce);
        }
    }

    display() {
        // Don't draw if invisible or invalid position
        if (this.alpha <= 0 || !this.pos) return;

        // Get color components safely
        let R=255, G=255, B=255; // Default white
        let currentAlpha = this.alpha; // Use potentially faded alpha

        if (this.baseColor) {
             try {
                 // Use p5.color methods if available
                 R = red(this.baseColor);
                 G = green(this.baseColor);
                 B = blue(this.baseColor);
                 // Alpha is handled separately by this.alpha which changes over time
             } catch(e) {
                 // console.warn("Could not get color components", e); // Can be noisy
                 // Defaults already set
             }
        }

        // Apply strobe effect visibility
        if (this.role === 'STROBE' && !this.strobeOn) {
            currentAlpha = 0; // Effectively hide it when strobe is off
        }
        if (currentAlpha <= 0) return; // Don't draw if effectively invisible

        push(); // Isolate drawing styles
        translate(this.pos.x, this.pos.y); // Move origin to particle position


        // --- Trail Drawing ---
        if (this.trail && this.trail.length > 1) {
            noFill();
            beginShape();
            for (let i = 0; i < this.trail.length; i++) {
                const trailPos = this.trail[i];
                // Check trailPos is valid relative to current pos
                if (!trailPos) continue;
                 // Calculate position relative to the translated origin
                 const relativeX = trailPos.x - this.pos.x;
                 const relativeY = trailPos.y - this.pos.y;

                const trailProgress = i / (this.trail.length -1); // 0 to 1
                const trailAlpha = currentAlpha * trailProgress * 0.6; // Fade along trail
                const trailWeight = this.size * trailProgress * 0.8; // Taper trail width

                strokeWeight(max(0.1, trailWeight)); // Ensure positive weight
                stroke(R, G, B, max(0, trailAlpha)); // Ensure positive alpha
                vertex(relativeX, relativeY); // Use relative coordinates
            }
            endShape();
        }

        // --- Particle Head Drawing ---
        noStroke();
        fill(R, G, B, currentAlpha);

        // Select drawing style based on particle type
        switch (this.particleStyle) {
            case 'FLUID':
                // Use a slightly blurred ellipse for a softer look
                 if (typeof drawingContext !== 'undefined' && drawingContext.shadowBlur !== undefined) {
                     drawingContext.shadowBlur = 8; // Subtle blur for fluid particles
                     drawingContext.shadowColor = color(R, G, B, currentAlpha * 0.5);
                 }
                ellipse(0, 0, this.size, this.size); // Draw at translated origin (0,0)
                 if (typeof drawingContext !== 'undefined' && drawingContext.shadowBlur !== undefined) {
                    drawingContext.shadowBlur = 0; // Reset blur
                 }
                break;

            case 'QUANTUM': // Example: maybe draw as small squares or with an outline
                 rectMode(CENTER);
                 strokeWeight(0.5);
                 stroke(R, G, B, currentAlpha * 0.5); // Faint outline
                 fill(R, G, B, currentAlpha * 0.8); // Slightly transparent fill
                 rect(0, 0, this.size * 0.8, this.size * 0.8); // Draw at translated origin
                 break;

            case 'CLASSIC':
            default:
                // Simple ellipse
                ellipse(0, 0, this.size, this.size); // Draw at translated origin
                // Add a brighter core for certain roles
                if (this.role === 'CRACKLE' || this.role === 'SHELL') {
                    fill(255, 255, 255, currentAlpha * 0.8); // White core, slightly less alpha
                    ellipse(0, 0, this.size * 0.5, this.size * 0.5);
                }
                 break;
        }

        pop(); // Restore previous drawing styles and origin
    }


    isDone() {
        // Particle is done if its alpha has faded to zero or below.
        // MINI_SHELLs are handled earlier in update after they explode.
        return this.alpha <= 0;
    }
}