const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const xpElement = document.getElementById('xp');
const levelElement = document.getElementById('level');
const timeElement = document.getElementById('time');
const heartsElement = document.getElementById('hearts');
const weaponElement = document.getElementById('weapon');
const powerElement = document.getElementById('power');
const gameOverElement = document.getElementById('game-over');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');

let score = 0;
let xp = 0;
let level = 1;
let health = 100;
let maxHealth = 100;
let elapsedTime = 0;
let startTime = Date.now();
let gameStarted = false;
let gameRunning = false;
let bossStage = false;
let bossSpawned = false;
let bossMessage = '';
let bossMessageTimer = 0;
let activePower = null;
let powerTimer = 0;
let lastPowerSpawnTime = 0;
const powerNames = {
    rapid: 'Rafale',
    triple: 'Triple',
    shield: 'Bouclier',
    freeze: 'Gel',
    bomb: 'Bombe'
};

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function xpForNextLevel(currentLevel) {
    return Math.floor(150 * Math.pow(1.5, currentLevel - 1));
}

const stars = [];
const starCount = 200;
const nebulas = [];
const nebulaCount = 3;
const distantPlanets = [];
const planetCount = 2;

// Vaisseau
let ship = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 24,
    height: 24,
    speed: 6,
    baseFireRate: 10,
    color: '#9df7ff',
    fireRate: 10,
    lastShot: 0,
    shield: false
};

// Pommes (ennemis)
let apples = [];
let appleSpeedY = 1.7;
let spawnRate = 0.025;

// Tirs
let bullets = [];
const bulletSpeed = 9;
const bulletRadius = 5;

// Lasers
let lasers = [];

// Contrôles
let keys = {};

document.addEventListener('keydown', (e) => {
    if ((!gameStarted || !gameRunning) && (e.code === 'Enter' || e.code === 'Space')) {
        startGame();
        return;
    }
    keys[e.code] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function attachStartHandlers() {
    if (startButton) {
        startButton.addEventListener('click', startGame);
        startButton.addEventListener('pointerdown', startGame);
    }
    if (startScreen) {
        startScreen.addEventListener('pointerdown', (event) => {
            if (event.target === startScreen || event.target === startButton) {
                startGame();
            }
        });
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', attachStartHandlers);
} else {
    attachStartHandlers();
}

function startGame() {
    if (gameRunning) return;
    console.log('Starting game...');
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    gameStarted = true;
    gameRunning = true;
    startScreen.style.display = 'none';
    console.log('Start screen hidden');
    startTime = Date.now();
    elapsedTime = 0;
    score = 0;
    xp = 0;
    level = 1;
    health = 100;
    currentShipLevel = 0;
    ship.speed = shipUpgrades[0].speed;
    ship.baseFireRate = shipUpgrades[0].fireRate;
    ship.fireRate = shipUpgrades[0].fireRate;
    ship.width = shipUpgrades[0].size;
    ship.height = shipUpgrades[0].size;
    ship.shield = false;
    activePower = null;
    powerTimer = 0;
    lastPowerSpawnTime = 0;
    weaponElement.textContent = 'Vaisseau : ' + shipUpgrades[0].name;
    if (powerElement) powerElement.textContent = 'Pouvoir : Aucun';
    scoreElement.textContent = 'Score : ' + score;
    xpElement.textContent = 'XP : ' + xp;
    levelElement.textContent = 'Niveau : ' + level;
    heartsElement.textContent = '♥♥♥';
    apples = [];
    bullets = [];
    gameOverElement.classList.add('hidden');
    renderHealthBar();
    updateTime();
    gameLoop();
}

window.startGame = startGame;

const shipUpgrades = [
    { name: 'Basique', speed: 6, fireRate: 10, bulletColor: '#fff176', size: 24, color: '#9df7ff' },
    { name: 'Rapide', speed: 7.5, fireRate: 8, bulletColor: '#ff9d40', size: 20, color: '#61caf7' },
    { name: 'Sniper', speed: 6.8, fireRate: 9, bulletColor: '#7df0ff', size: 26, color: '#7dffff' },
    { name: 'Tank', speed: 5.8, fireRate: 12, bulletColor: '#c47dff', size: 30, color: '#9f5dff' },
    { name: 'Fusée', speed: 8.2, fireRate: 7, bulletColor: '#9aff7c', size: 22, color: '#a6ff8c' },
    { name: 'Nova', speed: 8.6, fireRate: 6, bulletColor: '#ff5cde', size: 28, color: '#ff82e8' },
    { name: 'Spectre', speed: 8.8, fireRate: 5, bulletColor: '#ff00ff', size: 26, color: '#e600ff' },
    { name: 'Titan', speed: 5, fireRate: 15, bulletColor: '#ffff00', size: 36, color: '#ffaa00' },
    { name: 'Eclaire', speed: 9.2, fireRate: 4, bulletColor: '#00ffff', size: 24, color: '#00ff88' },
    { name: 'Photon', speed: 9.5, fireRate: 3, bulletColor: '#ffffff', size: 22, color: '#ffffff' },
    { name: 'Quantum', speed: 9.8, fireRate: 2, bulletColor: '#ff0080', size: 20, color: '#ff0080' },
    { name: 'Nexus', speed: 10, fireRate: 1.5, bulletColor: '#8000ff', size: 18, color: '#8000ff' },
    { name: 'Void', speed: 10.2, fireRate: 1, bulletColor: '#000000', size: 16, color: '#000000' },
    { name: 'Cosmos', speed: 10.5, fireRate: 0.8, bulletColor: '#ff8000', size: 14, color: '#ff8000' },
    { name: 'Laser Ultime', speed: 11, fireRate: 20, bulletColor: '#ff0000', size: 40, color: '#ff0000' }
];
let currentShipLevel = 0;

const appleTypes = [
    { name: 'Astéroïde', color: '#8B4513', hp: 1, size: 32, speedY: 1.7, score: 10, xp: 10, chance: 0.20, label: '' },
    { name: 'Comète', color: '#87CEEB', hp: 2, size: 38, speedY: 1.4, score: 20, xp: 15, chance: 0.12, label: 'C' },
    { name: 'Météore', color: '#FF6347', hp: 1, size: 28, speedY: 2.6, score: 18, xp: 12, chance: 0.12, label: 'M' },
    { name: 'Galaxie', color: '#9370DB', hp: 3, size: 45, speedY: 1.2, score: 30, xp: 25, chance: 0.10, label: 'G' },
    { name: 'Nébuleuse', color: '#FF69B4', hp: 4, size: 50, speedY: 1.1, score: 40, xp: 30, chance: 0.08, label: 'N' },
    { name: 'Trou Noir', color: '#000000', hp: 2, size: 35, speedY: 1.5, score: 25, xp: 18, chance: 0.10, label: 'T', power: 'triple' },
    { name: 'Étoile', color: '#FFFF00', hp: 3, size: 34, speedY: 2.2, score: 35, xp: 22, chance: 0.08, label: 'E', power: 'rapid' },
    { name: 'Supernova', color: '#FF4500', hp: 5, size: 42, speedY: 1.3, score: 50, xp: 35, chance: 0.06, label: 'S', power: 'shield' },
    { name: 'Quasar', color: '#00CED1', hp: 2, size: 26, speedY: 2.8, score: 28, xp: 20, chance: 0.07, label: 'Q', power: 'bomb' },
    { name: 'Planète', color: '#228B22', hp: 6, size: 48, speedY: 0.9, score: 60, xp: 40, chance: 0.05, label: 'P' },
    { name: 'Pulsar', color: '#DC143C', hp: 4, size: 40, speedY: 1.6, score: 45, xp: 32, chance: 0.04, label: 'P', power: 'freeze' },
    { name: 'Boss', color: '#8A2BE2', hp: 15, size: 120, speedY: 1.0, score: 120, xp: 60, chance: 0.02, label: 'B+' }
];
const enemyTypes = appleTypes.filter(type => type.name !== 'Boss');

function initStars() {
    // Étoiles normales avec scintillement
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2.5 + 0.5,
            speed: Math.random() * 0.4 + 0.2,
            alpha: Math.random() * 0.7 + 0.3,
            twinkle: Math.random() * 0.02 - 0.01
        });
    }

    // Nébuleuses colorées
    for (let i = 0; i < nebulaCount; i++) {
        nebulas.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 150 + 100,
            color: ['#4B0082', '#8A2BE2', '#FF1493', '#00CED1'][Math.floor(Math.random() * 4)],
            alpha: Math.random() * 0.1 + 0.05,
            speed: Math.random() * 0.1 + 0.05
        });
    }

    // Planètes lointaines
    for (let i = 0; i < planetCount; i++) {
        distantPlanets.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (canvas.height * 0.6) + canvas.height * 0.2,
            radius: Math.random() * 30 + 20,
            color: ['#8B4513', '#228B22', '#4169E1', '#FF6347'][Math.floor(Math.random() * 4)],
            speed: Math.random() * 0.05 + 0.02
        });
    }
}

function chooseAppleType() {
    const r = Math.random();
    let types = [];

    if (level === 1) {
        types = [
            { ...enemyTypes[0], chance: 0.50 },
            { ...enemyTypes[1], chance: 0.20 },
            { ...enemyTypes[2], chance: 0.15 },
            { ...enemyTypes[5], chance: 0.15 }
        ];
    } else if (level === 2) {
        types = [
            { ...enemyTypes[0], chance: 0.20 },
            { ...enemyTypes[1], chance: 0.15 },
            { ...enemyTypes[2], chance: 0.15 },
            { ...enemyTypes[3], chance: 0.15 },
            { ...enemyTypes[4], chance: 0.10 },
            { ...enemyTypes[5], chance: 0.15 },
            { ...enemyTypes[6], chance: 0.15 }
        ];
    } else if (level <= 4) {
        types = [
            { ...enemyTypes[0], chance: 0.10 },
            { ...enemyTypes[1], chance: 0.10 },
            { ...enemyTypes[2], chance: 0.10 },
            { ...enemyTypes[3], chance: 0.10 },
            { ...enemyTypes[4], chance: 0.08 },
            { ...enemyTypes[5], chance: 0.18 },
            { ...enemyTypes[6], chance: 0.15 },
            { ...enemyTypes[8], chance: 0.12 },
            { ...enemyTypes[10], chance: 0.12 }
        ];
    } else {
        types = [
            { ...enemyTypes[0], chance: 0.06 },
            { ...enemyTypes[1], chance: 0.06 },
            { ...enemyTypes[2], chance: 0.08 },
            { ...enemyTypes[3], chance: 0.08 },
            { ...enemyTypes[4], chance: 0.06 },
            { ...enemyTypes[5], chance: 0.20 },
            { ...enemyTypes[6], chance: 0.15 },
            { ...enemyTypes[7], chance: 0.08 },
            { ...enemyTypes[8], chance: 0.12 },
            { ...enemyTypes[9], chance: 0.06 },
            { ...enemyTypes[10], chance: 0.15 }
        ];
    }

    let total = 0;
    for (const type of types) {
        total += type.chance;
        if (r < total) return type;
    }
    return types[0];
}

function createBoss() {
    const bossType = appleTypes.find(type => type.name === 'Boss');
    apples.push({
        x: canvas.width / 2,
        y: -bossType.size,
        radius: bossType.size / 2,
        color: bossType.color,
        hp: bossType.hp + level,
        score: bossType.score + level * 10,
        xp: bossType.xp + level * 5,
        speedY: bossType.speedY,
        label: bossType.label,
        type: 'boss'
    });
    bossSpawned = true;
    playSound('boss');
}

function createApple() {
    const type = chooseAppleType();
    
    // Augmenter la difficulte selon le niveau
    const hpBonus = Math.floor((level - 1) * 0.6);
    const speedBonus = (level - 1) * 0.12;
    const scoreBonus = Math.floor((level - 1) * 5);
    const xpBonus = Math.floor((level - 1) * 3);
    
    apples.push({
        x: Math.random() * (canvas.width - type.size) + type.size / 2,
        y: -type.size,
        radius: type.size / 2,
        color: type.color,
        hp: type.hp + hpBonus,
        score: type.score + scoreBonus,
        xp: type.xp + xpBonus,
        speedY: type.speedY + speedBonus,
        label: type.label,
        type: 'enemy'
    });
}

function createPowerEnemy() {
    // Choisir un ennemi avec pouvoir aléatoirement
    const powerEnemies = appleTypes.filter(type => type.power);
    const randomPowerEnemy = powerEnemies[Math.floor(Math.random() * powerEnemies.length)];
    
    // Augmenter la difficulté selon le niveau
    const hpBonus = Math.floor((level - 1) * 0.6);
    const speedBonus = (level - 1) * 0.12;
    const scoreBonus = Math.floor((level - 1) * 5);
    const xpBonus = Math.floor((level - 1) * 3);
    
    apples.push({
        x: Math.random() * (canvas.width - randomPowerEnemy.size) + randomPowerEnemy.size / 2,
        y: -randomPowerEnemy.size,
        radius: randomPowerEnemy.size / 2,
        color: randomPowerEnemy.color,
        hp: randomPowerEnemy.hp + hpBonus,
        score: randomPowerEnemy.score + scoreBonus,
        xp: randomPowerEnemy.xp + xpBonus,
        speedY: randomPowerEnemy.speedY + speedBonus,
        label: randomPowerEnemy.label,
        type: 'enemy',
        power: randomPowerEnemy.power
    });
}

function shoot() {
    if (!gameRunning) return;
    const now = Date.now();
    if (now - ship.lastShot > ship.fireRate * 16.67) {
        const config = shipUpgrades[currentShipLevel];
        const baseSpeed = 6; // Plus lent que le vaisseau (vitesse vaisseau = 6-9.2)

        // Fonction pour créer une balle avec direction changeante
        const createSmartBullet = (x, y, angle, speed = baseSpeed) => {
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            bullets.push({
                x, y,
                vx, vy,
                radius: bulletRadius,
                color: config.bulletColor,
                damage: 1,
                changeTimer: 0,
                changeInterval: 30 + Math.random() * 60, // Change direction toutes les 30-90 frames
                targetAngle: angle + (Math.random() - 0.5) * Math.PI / 2 // Angle cible aléatoire
            });
        };

        // Différents patterns selon le niveau du vaisseau
        if (currentShipLevel === 0) {
            // Tir simple mais avec changement de direction
            createSmartBullet(ship.x, ship.y - ship.height / 2, -Math.PI / 2);
        } else if (currentShipLevel === 1) {
            // Double tir avec angles
            createSmartBullet(ship.x - 15, ship.y - ship.height / 2, -Math.PI / 2 - 0.2);
            createSmartBullet(ship.x + 15, ship.y - ship.height / 2, -Math.PI / 2 + 0.2);
        } else if (currentShipLevel === 2) {
            // Tir laser : ligne droite puissante
            createLaser(ship.x, ship.y - ship.height / 2, ship.x, ship.y - canvas.height, 3);
        } else if (currentShipLevel === 14) {
            // ÉNORME LASER ULTIME - traverse tout l'écran et détruit tout sur son passage
            createLaser(ship.x, ship.y - ship.height / 2, ship.x, ship.y - canvas.height, 50);
            // Laser secondaire pour plus de destruction
            createLaser(ship.x - 30, ship.y - ship.height / 2, ship.x - 30, ship.y - canvas.height, 30);
            createLaser(ship.x + 30, ship.y - ship.height / 2, ship.x + 30, ship.y - canvas.height, 30);
        } else {
            // Barrage massif pour niveaux avancés
            const numBullets = 8 + currentShipLevel * 2; // 10-16 balles
            for (let i = 0; i < numBullets; i++) {
                const angle = -Math.PI / 2 + (i - (numBullets - 1) / 2) * (Math.PI / 6); // Spread de 60 degrés
                const x = ship.x + (i - (numBullets - 1) / 2) * 8;
                createSmartBullet(x, ship.y - ship.height / 2, angle);
            }
        }

        // Pouvoir triple : balles supplémentaires
        if (activePower === 'triple') {
            createSmartBullet(ship.x - 25, ship.y - ship.height / 2, -Math.PI / 2 - 0.4);
            createSmartBullet(ship.x + 25, ship.y - ship.height / 2, -Math.PI / 2 + 0.4);
        }

        playSound('shoot');
        ship.lastShot = now;
    }
}

function gainXP(amount) {
    xp += amount;
    xpElement.textContent = 'XP : ' + xp;
    if (!bossStage && xp >= xpForNextLevel(level)) {
        prepareNextLevel();
    }
}
function createLaser(x, y, targetX, targetY, damage = 10) {
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 15;
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;

    lasers.push({
        x, y,
        vx, vy,
        width: 4,
        height: 50,
        color: '#ff0080',
        damage,
        life: 120 // Durée de vie en frames
    });
}

function activatePower(name) {
    if (!name) return;
    activePower = name;
    powerTimer = 600;
    if (powerElement) powerElement.textContent = 'Pouvoir : ' + powerNames[name];

    if (name === 'rapid') {
        ship.fireRate = Math.max(2, ship.baseFireRate / 2);
        // Laser rapide vers les ennemis proches
        apples.forEach(apple => {
            if (apple.y > 0 && apple.y < canvas.height / 2) {
                createLaser(ship.x, ship.y - ship.height / 2, apple.x, apple.y, 5);
            }
        });
    }
    if (name === 'shield') {
        ship.shield = true;
        // Laser de protection qui détruit les ennemis autour
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
            const targetX = ship.x + Math.cos(angle) * 100;
            const targetY = ship.y + Math.sin(angle) * 100;
            createLaser(ship.x, ship.y, targetX, targetY, 8);
        }
    }
    if (name === 'bomb') {
        detonateBomb();
        activePower = 'bomb';
        powerTimer = 120;
        // Laser de destruction massive
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const targetX = ship.x + Math.cos(angle) * 200;
            const targetY = ship.y + Math.sin(angle) * 200;
            createLaser(ship.x, ship.y, targetX, targetY, 15);
        }
    }
    if (name === 'triple') {
        // Lasers triples vers les planètes lointaines
        distantPlanets.forEach(planet => {
            createLaser(ship.x, ship.y - ship.height / 2, planet.x, planet.y, 20);
        });
    }
    if (name === 'freeze') {
        // Laser de gel vers tous les ennemis
        apples.forEach(apple => {
            createLaser(ship.x, ship.y - ship.height / 2, apple.x, apple.y, 12);
        });
    }
}

function resetPower() {
    if (activePower === 'rapid') {
        ship.fireRate = ship.baseFireRate;
    }
    if (activePower === 'shield') {
        ship.shield = false;
    }
    activePower = null;
    if (powerElement) powerElement.textContent = 'Pouvoir : Aucun';
}

function detonateBomb() {
    const remainingApples = apples.filter(apple => apple.type !== 'boss');
    remainingApples.forEach(apple => {
        score += apple.score;
        gainXP(apple.xp);
    });
    apples = apples.filter(apple => apple.type === 'boss');
    scoreElement.textContent = 'Score : ' + score;
    playSound('hit');
}
function prepareNextLevel() {
    level++;
    levelElement.textContent = 'Niveau : ' + level;
    bossStage = true;
    bossSpawned = false;
    bossMessage = 'Boss niveau ' + level + ' arrive...';
    bossMessageTimer = 180;
    if (currentShipLevel < shipUpgrades.length - 1) {
        currentShipLevel++;
        const config = shipUpgrades[currentShipLevel];
        ship.speed = config.speed;
        ship.baseFireRate = config.fireRate;
        ship.fireRate = config.fireRate;
        ship.width = config.size;
        ship.height = config.size;
        ship.color = config.color;
        ship.shield = false;
        activePower = null;
        powerTimer = 0;
        if (powerElement) powerElement.textContent = 'Pouvoir : Aucun';
        weaponElement.textContent = 'Vaisseau : ' + config.name;
    }
    playSound('levelup');
}

function loseLife(damage = 10) {
    if (activePower === 'shield' && powerTimer > 0) {
        playSound('hit');
        resetPower();
        return;
    }
    health -= damage;
    renderHealthBar();
    if (health <= 0) {
        endGame();
    }
}

function renderHealthBar() {
    const healthPercent = Math.max(0, health / maxHealth);
    heartsElement.textContent = `Vie: ${Math.ceil(health)}/${maxHealth}`;
}

function updateTime() {
    if (!gameRunning) return;
    elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timeElement.textContent = 'Temps : ' + elapsedTime + 's';
}

function endGame() {
    gameRunning = false;
    gameOverElement.classList.remove('hidden');
}

function completeBoss() {
    bossStage = false;
    bossMessage = 'Boss vaincu !';
    bossMessageTimer = 150;
    playSound('bossdefeat');
    appleSpeedY += 0.18;
    spawnRate += 0.008;
}

function levelUp() {
    level++;
    levelElement.textContent = 'Niveau : ' + level;
    if (currentShipLevel < shipUpgrades.length - 1) {
        currentShipLevel++;
        ship.speed = shipUpgrades[currentShipLevel].speed;
        ship.fireRate = shipUpgrades[currentShipLevel].fireRate;
        ship.width = shipUpgrades[currentShipLevel].size;
        ship.height = shipUpgrades[currentShipLevel].size;
        weaponElement.textContent = 'Vaisseau : ' + shipUpgrades[currentShipLevel].name;
    }
    appleSpeedY += 0.15;
    spawnRate += 0.006;
}

function update() {
    if (!gameRunning) return;
    if (keys['ArrowLeft'] && ship.x > 30) ship.x -= ship.speed;
    if (keys['ArrowRight'] && ship.x < canvas.width - 30) ship.x += ship.speed;
    if (keys['KeyF']) shoot();

    apples.forEach((apple, index) => {
        const effectiveSpeed = apple.speedY * (activePower === 'freeze' ? 0.4 : 1);
        apple.y += effectiveSpeed;
        if (apple.y - apple.radius > canvas.height) {
            apples.splice(index, 1);
            // Plus l'ennemi est puissant, plus il fait perdre de vie
            const damage = Math.ceil(apple.hp * 2) + Math.ceil(apple.score / 10);
            loseLife(damage);
        }
    });

    bullets.forEach((bullet, index) => {
        // Gestion des changements de direction intelligents
        if (bullet.changeTimer !== undefined) {
            bullet.changeTimer++;
            if (bullet.changeTimer >= bullet.changeInterval) {
                // Changer progressivement vers l'angle cible
                const currentAngle = Math.atan2(bullet.vy, bullet.vx);
                const angleDiff = bullet.targetAngle - currentAngle;
                const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.1);
                const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                bullet.vx = Math.cos(newAngle) * speed;
                bullet.vy = Math.sin(newAngle) * speed;

                // Nouveau timer et nouvel angle cible
                bullet.changeTimer = 0;
                bullet.changeInterval = 30 + Math.random() * 60;
                bullet.targetAngle = newAngle + (Math.random() - 0.5) * Math.PI / 3;
            }
        }

        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        // Rebond sur les bords
        if (bullet.x - bullet.radius < 0) {
            bullet.x = bullet.radius;
            bullet.vx = Math.abs(bullet.vx);
            playSound('hit');
        }
        if (bullet.x + bullet.radius > canvas.width) {
            bullet.x = canvas.width - bullet.radius;
            bullet.vx = -Math.abs(bullet.vx);
            playSound('hit');
        }
        if (bullet.y + bullet.radius < 0 || bullet.y - bullet.radius > canvas.height) {
            bullets.splice(index, 1);
        }
    });

    bullets.forEach((bullet, bIndex) => {
        apples.forEach((apple, aIndex) => {
            const dx = bullet.x - apple.x;
            const dy = bullet.y - apple.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bullet.radius + apple.radius) {
                bullets.splice(bIndex, 1);
                apple.hp -= bullet.damage || 1;
                playSound('hit');
                if (apple.hp <= 0) {
                    const defeatedBoss = apple.type === 'boss';
                    if (apple.power) activatePower(apple.power);
                    apples.splice(aIndex, 1);
                    score += apple.score;
                    scoreElement.textContent = 'Score : ' + score;
                    gainXP(apple.xp);
                    if (defeatedBoss) completeBoss();
                }
            }
        });
    });

    // Gestion des lasers
    lasers.forEach((laser, index) => {
        laser.x += laser.vx;
        laser.y += laser.vy;
        laser.life--;

        // Collision avec les ennemis
        apples.forEach((apple, aIndex) => {
            if (laser.x > apple.x - apple.radius && laser.x < apple.x + apple.radius &&
                laser.y > apple.y - apple.radius && laser.y < apple.y + apple.radius) {
                apple.hp -= laser.damage;
                if (apple.hp <= 0) {
                    const defeatedBoss = apple.type === 'boss';
                    apples.splice(aIndex, 1);
                    score += apple.score;
                    scoreElement.textContent = 'Score : ' + score;
                    gainXP(apple.xp);
                    if (defeatedBoss) completeBoss();
                }
                lasers.splice(index, 1);
                return;
            }
        });

        // Collision avec les planètes lointaines
        distantPlanets.forEach((planet, pIndex) => {
            const dx = laser.x - planet.x;
            const dy = laser.y - planet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < planet.radius) {
                // Détruire la planète
                distantPlanets.splice(pIndex, 1);
                score += 100;
                scoreElement.textContent = 'Score : ' + score;
                gainXP(50);
                lasers.splice(index, 1);
                return;
            }
        });

        if (laser.life <= 0 || laser.x < 0 || laser.x > canvas.width || laser.y < 0 || laser.y > canvas.height) {
            lasers.splice(index, 1);
        }
    });

    if (!bossStage) {
        if (Math.random() < spawnRate) createApple();
        if (Math.random() < spawnRate * 0.6) createApple();
        if (Math.random() < spawnRate * 0.25) createApple();
        // Spawn supplémentaire basé sur le niveau
        const extraSpawns = Math.floor(level / 3);
        for (let i = 0; i < extraSpawns; i++) {
            if (Math.random() < spawnRate * 0.15) createApple();
        }
    }
    if (bossStage && !bossSpawned) createBoss();
    if (bossStage && bossSpawned && !apples.some(apple => apple.type === 'boss')) {
        bossStage = false;
    }

    if (powerTimer > 0) {
        powerTimer -= 1;
        if (powerTimer === 0) resetPower();
    }

    // Système de pouvoirs toutes les 30 secondes
    if (elapsedTime - lastPowerSpawnTime >= 30) {
        createPowerEnemy();
        lastPowerSpawnTime = elapsedTime;
    }

    updateTime();
}

function drawBackground() {
    // Fond spatial avec vagues animées
    const time = elapsedTime;
    
    // Dégradé principal avec effet de vagues
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `hsl(260, 60%, ${10 + Math.sin(time * 0.5) * 3}%)`);
    gradient.addColorStop(0.5, `hsl(240, 50%, ${5 + Math.sin(time * 0.3) * 2}%)`);
    gradient.addColorStop(1, `hsl(280, 40%, ${3 + Math.sin(time * 0.4) * 2}%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Vagues de plasma animées
    const waveAmount = 3;
    for (let w = 0; w < waveAmount; w++) {
        ctx.strokeStyle = `hsla(${200 + w * 30}, 100%, 50%, ${0.15 - w * 0.04})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 20) {
            const y = canvas.height / 2 + Math.sin(x * 0.01 + time * 0.02 + w) * 50 + w * 40;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
    }

    // Aurore boréale animée
    const auroraGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    auroraGradient.addColorStop(0, `hsla(180, 100%, 50%, 0)`);
    auroraGradient.addColorStop(0.3, `hsla(${200 + Math.sin(time * 0.3) * 40}, 100%, 50%, ${0.1 + Math.sin(time * 0.5) * 0.05})`);
    auroraGradient.addColorStop(0.7, `hsla(${280 + Math.sin(time * 0.4) * 40}, 100%, 50%, ${0.1 + Math.sin(time * 0.6) * 0.05})`);
    auroraGradient.addColorStop(1, `hsla(180, 100%, 50%, 0)`);
    ctx.fillStyle = auroraGradient;
    ctx.fillRect(0, 50 + Math.sin(time * 0.1) * 100, canvas.width, 150);

    // Nébuleuses
    nebulas.forEach(nebula => {
        nebula.y += nebula.speed;
        if (nebula.y > canvas.height + nebula.radius) nebula.y = -nebula.radius;
        const gradient = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.radius);
        gradient.addColorStop(0, nebula.color + Math.floor(nebula.alpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Planètes lointaines avec effet de brillance
    distantPlanets.forEach((planet, idx) => {
        planet.y += planet.speed;
        if (planet.y > canvas.height + planet.radius) planet.y = -planet.radius;
        
        // Halo autour de la planète
        const haloGradient = ctx.createRadialGradient(planet.x, planet.y, 0, planet.x, planet.y, planet.radius * 1.8);
        haloGradient.addColorStop(0, `rgba(255, 255, 255, ${0.1 + Math.sin(time * 0.3 + idx) * 0.05})`);
        haloGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = haloGradient;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Planète
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Ombre animée sur la planète
        ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + Math.sin(time * 0.2 + idx) * 0.1})`;
        ctx.beginPath();
        ctx.arc(planet.x - planet.radius * 0.4, planet.y - planet.radius * 0.3, planet.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
    });

    // Étoiles avec scintillement amélioré
    stars.forEach((star, idx) => {
        star.y += star.speed;
        star.alpha += star.twinkle;
        if (star.alpha > 0.9) star.twinkle = -Math.abs(star.twinkle);
        if (star.alpha < 0.1) star.twinkle = Math.abs(star.twinkle);
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        
        // Étoile avec halo
        const haloSize = star.size * (1 + Math.sin(time * 0.1 + idx) * 0.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, haloSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Étoile brillante
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawShip() {
    const config = shipUpgrades[currentShipLevel];
    ctx.fillStyle = config.color;
    const w = ship.width;
    const h = ship.height;
    
    // Corps principal du vaisseau
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y - h/2);
    ctx.lineTo(ship.x - w/2.5, ship.y + h/4);
    ctx.lineTo(ship.x - w/3.5, ship.y + h/2);
    ctx.lineTo(ship.x + w/3.5, ship.y + h/2);
    ctx.lineTo(ship.x + w/2.5, ship.y + h/4);
    ctx.closePath();
    ctx.fill();
    
    // Ailes laterales pour certains niveaux
    if (currentShipLevel === 1 || currentShipLevel === 4) {
        ctx.beginPath();
        ctx.moveTo(ship.x - w/2.5, ship.y + h/4);
        ctx.lineTo(ship.x - w*0.8, ship.y + h/6);
        ctx.lineTo(ship.x - w/2, ship.y + h/3);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ship.x + w/2.5, ship.y + h/4);
        ctx.lineTo(ship.x + w*0.8, ship.y + h/6);
        ctx.lineTo(ship.x + w/2, ship.y + h/3);
        ctx.closePath();
        ctx.fill();
    }
    
    // Cockpit selon le niveau
    ctx.fillStyle = '#ffffff';
    if (currentShipLevel === 0) {
        ctx.beginPath();
        ctx.arc(ship.x, ship.y - h/3, w/5, 0, Math.PI * 2);
        ctx.fill();
    } else if (currentShipLevel === 2) {
        ctx.fillRect(ship.x - w/8, ship.y - h/3, w/4, h/6);
    } else if (currentShipLevel === 3) {
        ctx.beginPath();
        ctx.rect(ship.x - w/6, ship.y - h/2.5, w/3, h/5);
        ctx.fill();
    } else if (currentShipLevel === 5) {
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.arc(ship.x + i*w/4, ship.y - h/3, w/8, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (currentShipLevel === 6) {
        // Spectre: triple cockpit
        ctx.beginPath();
        ctx.arc(ship.x, ship.y - h/3, w/6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ship.x - w/3, ship.y - h/6, w/8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ship.x + w/3, ship.y - h/6, w/8, 0, Math.PI * 2);
        ctx.fill();
    } else if (currentShipLevel === 7) {
        // Titan: grosse fenetre
        ctx.fillRect(ship.x - w/4, ship.y - h/3, w/2, h/5);
    } else if (currentShipLevel === 8) {
        // Eclaire: fenetre pointue
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y - h/2.5);
        ctx.lineTo(ship.x - w/6, ship.y - h/4);
        ctx.lineTo(ship.x + w/6, ship.y - h/4);
        ctx.closePath();
        ctx.fill();
    }
    
    // Moteur/flamme
    ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
    ctx.beginPath();
    ctx.moveTo(ship.x - w/6, ship.y + h/1.8);
    ctx.lineTo(ship.x + w/6, ship.y + h/1.8);
    ctx.lineTo(ship.x, ship.y + h/1.3);
    ctx.closePath();
    ctx.fill();
}

function draw() {
    drawBackground();
    drawShip();

    apples.forEach(apple => {
        ctx.fillStyle = apple.color;
        const r = apple.radius;
        
        if (apple.type === 'boss') {
            // Boss = etoile
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI) / 5 - Math.PI / 2;
                const radius = i % 2 === 0 ? r : r / 2;
                const x = apple.x + Math.cos(angle) * radius;
                const y = apple.y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (apple.label === 'M') {
            // Météore = losange allongé
            ctx.beginPath();
            ctx.moveTo(apple.x, apple.y - r);
            ctx.lineTo(apple.x + r * 0.6, apple.y);
            ctx.lineTo(apple.x, apple.y + r);
            ctx.lineTo(apple.x - r * 0.6, apple.y);
            ctx.closePath();
            ctx.fill();
        } else if (apple.label === 'G' || apple.label === 'N') {
            // Galaxie et Nébuleuse = spirale
            ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const angle = (i * Math.PI) / 10;
                const radius = r * (0.3 + i * 0.03);
                const x = apple.x + Math.cos(angle) * radius;
                const y = apple.y + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (apple.label === 'C') {
            // Comète = hexagone
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = apple.x + Math.cos(angle) * r;
                const y = apple.y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (apple.label === 'T') {
            // Trou Noir = cercle noir avec anneau
            ctx.beginPath();
            ctx.arc(apple.x, apple.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#660000';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (apple.label === 'E') {
            // Étoile = croix
            ctx.fillRect(apple.x - r/3, apple.y - r, r*2/3, r*2);
            ctx.fillRect(apple.x - r, apple.y - r/3, r*2, r*2/3);
        } else if (apple.label === 'S') {
            // Supernova = pentagone
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
                const x = apple.x + Math.cos(angle) * r;
                const y = apple.y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (apple.label === 'Q') {
            // Quasar = ligne épaisse
            ctx.globalAlpha = 0.8;
            ctx.fillRect(apple.x - r/4, apple.y - r, r/2, r*2);
            ctx.globalAlpha = 1;
        } else if (apple.label === 'P') {
            // Planète/Pulsar = carré arrondi épais
            ctx.fillRect(apple.x - r*0.9, apple.y - r*0.9, r*1.8, r*1.8);
            ctx.strokeStyle = apple.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(apple.x - r*0.9, apple.y - r*0.9, r*1.8, r*1.8);
        } else {
            // Astéroïde = cercle
            ctx.beginPath();
            ctx.arc(apple.x, apple.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Reflet
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(apple.x - r / 3, apple.y - r / 3, r / 3, 0, Math.PI * 2);
        ctx.fill();
        
        if (apple.hp > 1) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(apple.label, apple.x, apple.y + 5);
        }
    });

    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius / 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Rendu des lasers
    lasers.forEach(laser => {
        ctx.save();
        const angle = Math.atan2(laser.vy, laser.vx);
        ctx.translate(laser.x, laser.y);
        ctx.rotate(angle);

        // Corps du laser
        const gradient = ctx.createLinearGradient(-laser.height/2, 0, laser.height/2, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, laser.color);
        gradient.addColorStop(0.7, laser.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(-laser.height/2, -laser.width/2, laser.height, laser.width);

        // Effet lumineux
        ctx.shadowColor = laser.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(-laser.height/2, -laser.width/4, laser.height, laser.width/2);

        ctx.restore();
    });

    if (bossMessageTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = '26px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(bossMessage, canvas.width / 2, 70);
        bossMessageTimer -= 1;
    }
    
    // Barre d'XP
    const barWidth = 500;
    const barHeight = 25;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = canvas.height - 35;
    
    const nextLevelXp = xpForNextLevel(level);
    const prevLevelXp = level === 1 ? 0 : xpForNextLevel(level - 1);
    const currentXpInLevel = xp - prevLevelXp;
    const maxXpInLevel = nextLevelXp - prevLevelXp;
    const xpProgress = Math.min(currentXpInLevel / maxXpInLevel, 1);
    
    // Fond de la barre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Bordure de la barre
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Barre de progression
    const fillWidth = barWidth * xpProgress;
    const gradient = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
    gradient.addColorStop(0, '#00ff00');
    gradient.addColorStop(1, '#00aa00');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX + 2, barY + 2, fillWidth - 4, barHeight - 4);
    
    // Texte XP
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`XP: ${xp - prevLevelXp}/${maxXpInLevel}`, canvas.width / 2, barY + 18);
}

function playSound(type) {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
    } else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
    } else if (type === 'boss') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        gain.gain.setValueAtTime(0.15, now);
    } else if (type === 'bossdefeat') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
    } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
    }

    osc.start(now);
    osc.stop(now + 0.15);
}

function gameLoop() {
    update();
    draw();
    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

initStars();
renderHearts();
updateTime();
gameLoop();