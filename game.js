(function () {
  const LEVELS = [
    {
      label: 'Hühnerjagd',
      background: 'assets/background.png',
      duration: 30000,
      spawnMin: 450, spawnMax: 550,
      creatureSound: 'chicken',
      bandMinFrac: 0.05, bandMaxFrac: 0.55,
      bobAmpMin: 10, bobAmpMax: 22,
      creatures: {
        normal: {
          points: 10, minSpeed: 90, maxSpeed: 160, className: 'bird--normal', probability: 0.82,
          upSrc: 'assets/chicken_normal_up.png', downSrc: 'assets/chicken_normal_down.png'
        },
        golden: {
          points: 50, minSpeed: 190, maxSpeed: 270, className: 'bird--golden', probability: 0.18,
          upSrc: 'assets/chicken_golden_up.png', downSrc: 'assets/chicken_golden_down.png'
        }
      }
    },
    {
      label: 'Fliegenjagd',
      background: 'assets/kitchen_bg.png',
      duration: 25000,
      spawnMin: 320, spawnMax: 420,
      creatureSound: 'fly',
      bandMinFrac: 0.08, bandMaxFrac: 0.6,
      bobAmpMin: 8, bobAmpMax: 18,
      creatures: {
        normal: {
          points: 15, minSpeed: 150, maxSpeed: 260, className: 'bird--fly', probability: 0.85,
          upSrc: 'assets/fly_normal.png', downSrc: 'assets/fly_normal.png'
        },
        golden: {
          points: 70, minSpeed: 260, maxSpeed: 380, className: 'bird--fly-golden', probability: 0.15,
          upSrc: 'assets/fly_golden.png', downSrc: 'assets/fly_golden.png'
        }
      }
    },
    {
      label: 'Schafsprung',
      background: 'assets/pasture_bg.png',
      duration: 25000,
      spawnMin: 380, spawnMax: 480,
      creatureSound: 'sheep',
      bandMinFrac: 0.56, bandMaxFrac: 0.74,
      bobAmpMin: 2, bobAmpMax: 4,
      creatures: {
        normal: {
          points: 20, minSpeed: 70, maxSpeed: 130, className: 'bird--sheep', probability: 0.85,
          upSrc: 'assets/sheep_normal.png', downSrc: 'assets/sheep_normal.png'
        },
        golden: {
          points: 90, minSpeed: 110, maxSpeed: 190, className: 'bird--sheep-golden', probability: 0.15,
          upSrc: 'assets/sheep_golden.png', downSrc: 'assets/sheep_golden.png'
        }
      }
    }
  ];

  const FLAP_INTERVAL_MS = 260;
  let flapFrameUp = true;

  const SPECIAL_TYPES = {
    ufo: {
      points: 100, minSpeed: 220, maxSpeed: 320, className: 'special--ufo',
      ammoRefill: 40, sprite: 'assets/ufo.png', sound: 'ufo'
    },
    zombie: {
      points: 150, minSpeed: 70, maxSpeed: 120, className: 'special--zombie',
      ammoRefill: 55, sprite: 'assets/zombie_chicken.png', sound: 'zombie'
    }
  };
  const SPECIAL_KEYS = Object.keys(SPECIAL_TYPES);
  const SPECIAL_MIN_DELAY_MS = 11000;
  const SPECIAL_MAX_DELAY_MS = 19000;

  const MAX_AMMO = 100;
  const AMMO_DRAIN_PER_SEC = MAX_AMMO / 40;
  let ammo = MAX_AMMO;

  const SPAWN_RAMP_MS_PER_HIT = 9;
  const SPAWN_MIN_FLOOR_MS = 300;
  const MAX_CONCURRENT_CREATURES = 5;
  let hitsThisLevel = 0;

  const LEADERBOARD_KEY = 'huehnerjagd_leaderboard_v1';
  const PLAYER_NAME_KEY = 'huehnerjagd_player_name';
  const MAX_LEADERBOARD_ENTRIES = 5;

  const birdsLayer = document.getElementById('birds-layer');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const levelNumEl = document.getElementById('level-num');
  const levelTotalEl = document.getElementById('level-total');
  const finalScoreEl = document.getElementById('final-score');
  const startScreen = document.getElementById('start-screen');
  const endScreen = document.getElementById('end-screen');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const gameArea = document.getElementById('game-area');
  const ammoFillEl = document.getElementById('ammo-fill');
  const playerNameInput = document.getElementById('player-name');
  const leaderboardListEl = document.getElementById('leaderboard-list');
  const levelTransitionEl = document.getElementById('level-transition');
  const levelTransitionTitleEl = document.getElementById('level-transition-title');
  const levelTransitionSubEl = document.getElementById('level-transition-sub');

  let gameActive = false;
  let score = 0;
  let currentLevelIndex = 0;
  let levelStartTimestamp = 0;
  let spawnTimeoutId = null;
  let specialTimeoutId = null;
  let levelTransitionTimeoutId = null;
  let rafId = null;
  let lastFrameTime = 0;
  const birds = [];
  const specials = [];

  let audioCtx = null;

  function currentLevel() {
    return LEVELS[currentLevelIndex];
  }

  function ensureAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playShotSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(audioCtx.destination);

    // Sharp initial "crack" transient — very short, bright, unfiltered noise
    const crackSize = Math.floor(audioCtx.sampleRate * 0.02);
    const crackBuffer = audioCtx.createBuffer(1, crackSize, audioCtx.sampleRate);
    const crackData = crackBuffer.getChannelData(0);
    for (let i = 0; i < crackSize; i++) {
      crackData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / crackSize, 0.5);
    }
    const crack = audioCtx.createBufferSource();
    crack.buffer = crackBuffer;
    const crackGain = audioCtx.createGain();
    crackGain.gain.setValueAtTime(0.9, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    crack.connect(crackGain);
    crackGain.connect(masterGain);
    crack.start(now);
    crack.stop(now + 0.03);

    // Body — filtered noise sweep, the "bang"
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.18);
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.pow(1 - i / bufferSize, 1.8);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2600, now);
    bandpass.frequency.exponentialRampToValueAtTime(150, now + 0.16);
    bandpass.Q.value = 0.6;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(now);
    noise.stop(now + 0.18);

    // Sub-bass thump for weight
    const thump = audioCtx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(150, now);
    thump.frequency.exponentialRampToValueAtTime(35, now + 0.12);
    const thumpGain = audioCtx.createGain();
    thumpGain.gain.setValueAtTime(0.85, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    thump.connect(thumpGain);
    thumpGain.connect(masterGain);
    thump.start(now);
    thump.stop(now + 0.16);
  }

  function playCreatureSound(kind, isGolden) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const pitchMul = isGolden ? 1.35 : 1;

    if (kind === 'fly') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2600 * pitchMul, now);
      osc.frequency.exponentialRampToValueAtTime(400 * pitchMul, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
      return;
    }

    if (kind === 'sheep') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 * pitchMul, now);
      osc.frequency.linearRampToValueAtTime(260 * pitchMul, now + 0.12);
      osc.frequency.linearRampToValueAtTime(300 * pitchMul, now + 0.22);
      osc.frequency.linearRampToValueAtTime(200 * pitchMul, now + 0.34);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.37);
      return;
    }

    // chicken cluck: two short pulses
    [0, 0.09].forEach(function (offset) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(420 * pitchMul, now + offset);
      osc.frequency.exponentialRampToValueAtTime(260 * pitchMul, now + offset + 0.07);
      gain.gain.setValueAtTime(0.22, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  function playSpecialSound(kind) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    if (kind === 'ufo') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.35);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
    }
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  function playEmptyClickSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  function setAmmo(value) {
    ammo = Math.max(0, Math.min(MAX_AMMO, value));
    const pct = (ammo / MAX_AMMO) * 100;
    ammoFillEl.style.width = pct + '%';
    ammoFillEl.classList.toggle('ammo-fill--low', pct <= 25);
  }

  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveLeaderboardEntry(name, finalScore) {
    const list = loadLeaderboard();
    list.push({ name: name, score: finalScore, date: new Date().toLocaleDateString('de-DE') });
    list.sort(function (a, b) { return b.score - a.score; });
    const top = list.slice(0, MAX_LEADERBOARD_ENTRIES);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top));
    } catch (e) {
      // localStorage unavailable — leaderboard just won't persist this run
    }
    return top;
  }

  function renderLeaderboard(list) {
    leaderboardListEl.innerHTML = '';
    if (list.length === 0) {
      const li = document.createElement('li');
      li.className = 'leaderboard-empty';
      li.textContent = 'Noch keine Einträge';
      leaderboardListEl.appendChild(li);
      return;
    }
    list.forEach(function (entry, i) {
      const li = document.createElement('li');

      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = '#' + (i + 1);

      const name = document.createElement('span');
      name.className = 'lb-name';
      name.textContent = entry.name;

      const points = document.createElement('span');
      points.className = 'lb-score';
      points.textContent = String(entry.score);

      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(points);
      leaderboardListEl.appendChild(li);
    });
  }

  function pickCreatureType() {
    const creatures = currentLevel().creatures;
    return Math.random() < creatures.golden.probability ? 'golden' : 'normal';
  }

  function createBirdElement(typeKey) {
    const type = currentLevel().creatures[typeKey];
    const el = document.createElement('div');
    el.className = 'bird ' + type.className;

    const sprite = document.createElement('img');
    sprite.className = 'bird-sprite';
    sprite.src = flapFrameUp ? type.upSrc : type.downSrc;
    sprite.draggable = false;
    sprite.alt = '';

    el.appendChild(sprite);

    return el;
  }

  function spawnBird() {
    if (!gameActive) return;

    if (birds.length >= MAX_CONCURRENT_CREATURES) {
      scheduleNextSpawn();
      return;
    }

    const level = currentLevel();
    const areaHeight = gameArea.clientHeight;
    const minY = areaHeight * level.bandMinFrac;
    const maxY = areaHeight * level.bandMaxFrac;
    const y = minY + Math.random() * Math.max(20, maxY - minY);

    const fromLeft = Math.random() < 0.5;
    const typeKey = pickCreatureType();
    const type = level.creatures[typeKey];
    const speed = type.minSpeed + Math.random() * (type.maxSpeed - type.minSpeed);

    const el = createBirdElement(typeKey);
    const startX = fromLeft ? -80 : gameArea.clientWidth + 80;
    const vx = fromLeft ? speed : -speed;

    if (vx < 0) {
      el.classList.add('bird--flipped');
    }

    el.style.left = startX + 'px';
    el.style.top = y + 'px';

    const sprite = el.querySelector('.bird-sprite');
    const bird = {
      el, sprite, upSrc: type.upSrc, downSrc: type.downSrc,
      x: startX, baseY: y, vx, points: type.points, isGolden: typeKey === 'golden', hit: false,
      soundKind: level.creatureSound,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmplitude: level.bobAmpMin + Math.random() * (level.bobAmpMax - level.bobAmpMin),
      bobSpeed: 0.7 + Math.random() * 0.5
    };

    el.addEventListener('click', function (event) {
      onBirdClick(bird, event);
    });

    birdsLayer.appendChild(el);
    birds.push(bird);

    scheduleNextSpawn();
  }

  function scheduleNextSpawn() {
    if (!gameActive) return;
    const level = currentLevel();
    const ramp = Math.min(hitsThisLevel * SPAWN_RAMP_MS_PER_HIT, level.spawnMax - SPAWN_MIN_FLOOR_MS);
    const min = Math.max(SPAWN_MIN_FLOOR_MS, level.spawnMin - ramp);
    const max = Math.max(min + 50, level.spawnMax - ramp);
    const delay = min + Math.random() * (max - min);
    spawnTimeoutId = setTimeout(spawnBird, delay);
  }

  function createSpecialElement(kindKey) {
    const kind = SPECIAL_TYPES[kindKey];
    const el = document.createElement('div');
    el.className = 'bird special ' + kind.className;

    const sprite = document.createElement('img');
    sprite.className = 'bird-sprite';
    sprite.src = kind.sprite;
    sprite.draggable = false;
    sprite.alt = '';

    el.appendChild(sprite);
    return el;
  }

  function spawnSpecial() {
    if (!gameActive) return;

    const kindKey = SPECIAL_KEYS[Math.floor(Math.random() * SPECIAL_KEYS.length)];
    const kind = SPECIAL_TYPES[kindKey];

    const areaHeight = gameArea.clientHeight;
    const minY = areaHeight * 0.05;
    const maxY = areaHeight * 0.55;
    const y = minY + Math.random() * (maxY - minY);

    const fromLeft = Math.random() < 0.5;
    const speed = kind.minSpeed + Math.random() * (kind.maxSpeed - kind.minSpeed);
    const el = createSpecialElement(kindKey);
    const startX = fromLeft ? -100 : gameArea.clientWidth + 100;
    const vx = fromLeft ? speed : -speed;

    if (vx < 0) {
      el.classList.add('bird--flipped');
    }

    el.style.left = startX + 'px';
    el.style.top = y + 'px';

    const special = {
      el, x: startX, baseY: y, vx, points: kind.points, ammoRefill: kind.ammoRefill,
      sound: kind.sound, hit: false,
      bobPhase: Math.random() * Math.PI * 2,
      bobAmplitude: 14 + Math.random() * 10,
      bobSpeed: 0.9 + Math.random() * 0.6
    };

    el.addEventListener('click', function (event) {
      onSpecialClick(special, event);
    });

    birdsLayer.appendChild(el);
    specials.push(special);

    scheduleNextSpecial();
  }

  function scheduleNextSpecial() {
    if (!gameActive) return;
    const delay = SPECIAL_MIN_DELAY_MS + Math.random() * (SPECIAL_MAX_DELAY_MS - SPECIAL_MIN_DELAY_MS);
    specialTimeoutId = setTimeout(spawnSpecial, delay);
  }

  function removeSpecial(special) {
    if (special.el.parentNode) {
      special.el.parentNode.removeChild(special.el);
    }
    const idx = specials.indexOf(special);
    if (idx !== -1) specials.splice(idx, 1);
  }

  function onSpecialClick(special, event) {
    if (!gameActive || special.hit) return;
    special.hit = true;
    hitsThisLevel += 1;

    special.el.classList.add('is-hit');
    score += special.points;
    scoreEl.textContent = String(score);
    setAmmo(ammo + special.ammoRefill);

    playSpecialSound(special.sound);
    showScorePopup(event.clientX, event.clientY, special.points);

    setTimeout(function () {
      removeSpecial(special);
    }, 500);
  }

  function onBirdClick(bird, event) {
    if (!gameActive || bird.hit) return;

    if (ammo <= 0) {
      return;
    }

    bird.hit = true;
    hitsThisLevel += 1;

    bird.el.classList.add('is-hit');
    score += bird.points;
    scoreEl.textContent = String(score);

    playCreatureSound(bird.soundKind, bird.isGolden);
    showScorePopup(event.clientX, event.clientY, bird.points);
    if (bird.soundKind === 'fly') {
      showSmashEffect(event.clientX, event.clientY);
    }

    setTimeout(function () {
      if (bird.el.parentNode) {
        bird.el.parentNode.removeChild(bird.el);
      }
      const idx = birds.indexOf(bird);
      if (idx !== -1) birds.splice(idx, 1);
    }, 500);
  }

  function showSmashEffect(x, y) {
    const smash = document.createElement('div');
    smash.className = 'smash-fx';
    smash.style.left = x + 'px';
    smash.style.top = y + 'px';

    const label = document.createElement('span');
    label.className = 'smash-fx-label';
    label.textContent = 'PATSCH!';
    smash.appendChild(label);

    for (let i = 0; i < 6; i++) {
      const spike = document.createElement('span');
      spike.className = 'smash-fx-spike';
      spike.style.setProperty('--r', (i * 60) + 'deg');
      smash.appendChild(spike);
    }

    gameArea.appendChild(smash);
    setTimeout(function () {
      if (smash.parentNode) smash.parentNode.removeChild(smash);
    }, 350);
  }

  function showScorePopup(x, y, points) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+' + points;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    gameArea.appendChild(popup);
    setTimeout(function () {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 700);
  }

  function removeBird(bird) {
    if (bird.el.parentNode) {
      bird.el.parentNode.removeChild(bird.el);
    }
    const idx = birds.indexOf(bird);
    if (idx !== -1) birds.splice(idx, 1);
  }

  function clearAllBirds() {
    for (let i = birds.length - 1; i >= 0; i--) {
      removeBird(birds[i]);
    }
    for (let i = specials.length - 1; i >= 0; i--) {
      removeSpecial(specials[i]);
    }
  }

  function updateFrame(now) {
    if (!gameActive) return;

    const dt = lastFrameTime ? (now - lastFrameTime) / 1000 : 0;
    lastFrameTime = now;

    const areaWidth = gameArea.clientWidth;

    const shouldBeUp = Math.floor(now / FLAP_INTERVAL_MS) % 2 === 0;
    const flapChanged = shouldBeUp !== flapFrameUp;
    flapFrameUp = shouldBeUp;

    for (let i = birds.length - 1; i >= 0; i--) {
      const bird = birds[i];
      if (bird.hit) continue;
      bird.x += bird.vx * dt;
      bird.el.style.left = bird.x + 'px';

      const bob = Math.sin(now / 1000 * bird.bobSpeed + bird.bobPhase) * bird.bobAmplitude;
      bird.el.style.top = (bird.baseY + bob) + 'px';

      if (flapChanged) {
        bird.sprite.src = flapFrameUp ? bird.upSrc : bird.downSrc;
      }

      if (bird.x < -120 || bird.x > areaWidth + 120) {
        removeBird(bird);
      }
    }

    for (let i = specials.length - 1; i >= 0; i--) {
      const special = specials[i];
      if (special.hit) continue;
      special.x += special.vx * dt;
      special.el.style.left = special.x + 'px';

      const bob = Math.sin(now / 1000 * special.bobSpeed + special.bobPhase) * special.bobAmplitude;
      special.el.style.top = (special.baseY + bob) + 'px';

      if (special.x < -150 || special.x > areaWidth + 150) {
        removeSpecial(special);
      }
    }

    setAmmo(ammo - AMMO_DRAIN_PER_SEC * dt);

    const elapsed = Date.now() - levelStartTimestamp;
    const remainingMs = Math.max(0, currentLevel().duration - elapsed);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    timeEl.textContent = String(remainingSeconds);

    if (remainingMs <= 0) {
      advanceLevel();
      return;
    }

    rafId = requestAnimationFrame(updateFrame);
  }

  function startLevel(index) {
    currentLevelIndex = index;
    hitsThisLevel = 0;
    const level = currentLevel();

    gameArea.style.backgroundImage = "url('" + level.background + "')";
    gameArea.dataset.level = String(index);
    levelNumEl.textContent = String(index + 1);
    levelTotalEl.textContent = String(LEVELS.length);
    timeEl.textContent = String(Math.ceil(level.duration / 1000));

    clearAllBirds();

    levelStartTimestamp = Date.now();
    lastFrameTime = 0;

    scheduleNextSpawn();
    scheduleNextSpecial();
  }

  function advanceLevel() {
    if (spawnTimeoutId) {
      clearTimeout(spawnTimeoutId);
      spawnTimeoutId = null;
    }
    if (specialTimeoutId) {
      clearTimeout(specialTimeoutId);
      specialTimeoutId = null;
    }

    if (currentLevelIndex + 1 < LEVELS.length) {
      showLevelTransition(currentLevelIndex + 1);
    } else {
      endGame();
    }
  }

  function showLevelTransition(nextIndex) {
    gameActive = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    clearAllBirds();

    levelTransitionTitleEl.textContent = 'Level ' + (currentLevelIndex + 1) + ' geschafft!';
    levelTransitionSubEl.textContent = 'Weiter zu Level ' + (nextIndex + 1) + ': ' + LEVELS[nextIndex].label;
    levelTransitionEl.classList.remove('hidden');

    levelTransitionTimeoutId = setTimeout(function () {
      levelTransitionEl.classList.add('hidden');
      gameActive = true;
      startLevel(nextIndex);
      rafId = requestAnimationFrame(updateFrame);
    }, 2200);
  }

  function startGame() {
    ensureAudioContext();

    if (levelTransitionTimeoutId) {
      clearTimeout(levelTransitionTimeoutId);
      levelTransitionTimeoutId = null;
    }

    score = 0;
    scoreEl.textContent = '0';
    setAmmo(MAX_AMMO);

    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    levelTransitionEl.classList.add('hidden');

    gameActive = true;
    startLevel(0);
    rafId = requestAnimationFrame(updateFrame);
  }

  function endGame() {
    gameActive = false;

    if (spawnTimeoutId) {
      clearTimeout(spawnTimeoutId);
      spawnTimeoutId = null;
    }
    if (specialTimeoutId) {
      clearTimeout(specialTimeoutId);
      specialTimeoutId = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    timeEl.textContent = '0';
    finalScoreEl.textContent = String(score);

    const rawName = (playerNameInput.value || '').trim().slice(0, 20);
    const name = rawName || 'Spieler';
    playerNameInput.value = name;
    try {
      localStorage.setItem(PLAYER_NAME_KEY, name);
    } catch (e) {
      // ignore — leaderboard name just won't persist
    }

    const top = saveLeaderboardEntry(name, score);
    renderLeaderboard(top);

    endScreen.classList.remove('hidden');
  }

  (function initPlayerName() {
    let stored = '';
    try {
      stored = localStorage.getItem(PLAYER_NAME_KEY) || '';
    } catch (e) {
      stored = '';
    }
    playerNameInput.value = stored || 'Spieler';
    renderLeaderboard(loadLeaderboard());
  })();

  gameArea.addEventListener('click', function () {
    if (!gameActive) return;
    if (ammo <= 0) {
      playEmptyClickSound();
    } else {
      playShotSound();
    }
  });

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
})();
