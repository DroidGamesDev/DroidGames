// Variables globales
let scene, camera, renderer;
let player, ground, fog;
let cacti = [];
let clouds = [];
let score = 0;
let gameSpeed = 0.3;
let isGameOver = false;
let isJumping = false;
let jumpVelocity = 0;
let lastTime = performance.now();
let scoreTimer = 0;
let difficultyLevel = 1;
let frameCount = 0;
let fpsTime = 0;

// Configuración
const GRAVITY = 0.015;
const JUMP_FORCE = 0.35;
const GROUND_Y = -1;
const PLAYER_SIZE = 0.8;

// Inicializar
init();
animate();

function init() {
    // Escena con niebla (fog)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

    // Cámara en tercera persona
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffd700, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Jugador (Cubo naranja suave)
    const playerGeometry = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
    const playerMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xFF8C00,
        emissive: 0xFF4500,
        emissiveIntensity: 0.2
    });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.y = GROUND_Y + PLAYER_SIZE / 2;
    player.castShadow = true;
    scene.add(player);

    // Suelo desértico amarillo
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xF4A460 });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.receiveShadow = true;
    scene.add(ground);

    // Crear nubes MÁS ABAJO
    createClouds();

    // Eventos
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('mousedown', onTouchStart);
    document.addEventListener('keydown', onKeyDown);

    // Iniciar generación de cactus
    spawnCactus();
}

function createClouds() {
    for (let i = 0; i < 8; i++) {
        const cloudGroup = new THREE.Group();
        
        // Nube formada por esferas
        for (let j = 0; j < 5; j++) {
            const cloudGeometry = new THREE.SphereGeometry(1 + Math.random(), 16, 16);
            const cloudMaterial = new THREE.MeshLambertMaterial({ 
                color: 0xFFFACD,
                transparent: true,
                opacity: 0.8
            });
            const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloudPart.position.set(
                (Math.random() - 0.5) * 3,
                Math.random() * 1,
                (Math.random() - 0.5) * 2
            );
            cloudGroup.add(cloudPart);
        }
        
        // NUBES MÁS ABAJO
        cloudGroup.position.set(
            (Math.random() - 0.5) * 40,
            4 + Math.random() * 3,
            -20 - Math.random() * 30
        );
        
        scene.add(cloudGroup);
        clouds.push({ mesh: cloudGroup, speed: 0.02 + Math.random() * 0.03 });
    }
}

function spawnCactus() {
    if (isGameOver) return;

    const cactusGroup = new THREE.Group();
    
    // Tallo principal
    const stemHeight = 1.5;
    const stemRadius = 0.3;
    const stemGeometry = new THREE.CylinderGeometry(stemRadius, stemRadius, stemHeight, 8);
    const cactusMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const stem = new THREE.Mesh(stemGeometry, cactusMaterial);
    stem.castShadow = true;
    cactusGroup.add(stem);

    // PUNTOS NEGROS CORREGIDOS - Siempre sobre la superficie del cactus
    const numDots = 6;
    for (let i = 0; i < numDots; i++) {
        const dotGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        
        // Altura aleatoria dentro del tallo (de -0.6 a 0.6 aprox)
        const yPos = (Math.random() - 0.5) * (stemHeight * 0.8);
        
        // Ángulo aleatorio alrededor del cilindro
        const angle = Math.random() * Math.PI * 2;
        
        // Radio ligeramente mayor que el del tallo para que quede sobre la superficie
        const surfaceRadius = stemRadius + 0.02;
        
        // Calcular posición en la superficie del cilindro
        const xPos = Math.cos(angle) * surfaceRadius;
        const zPos = Math.sin(angle) * surfaceRadius;
        
        dot.position.set(xPos, yPos, zPos);
        cactusGroup.add(dot);
    }

    // Brazos del cactus (aleatorios)
    if (Math.random() > 0.5) {
        const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
        const arm = new THREE.Mesh(armGeometry, cactusMaterial);
        arm.position.set(0.4, 0.2, 0);
        arm.rotation.z = -Math.PI / 4;
        cactusGroup.add(arm);
        
        // Puntos en el brazo también
        const armDotGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const armDotMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const armDot = new THREE.Mesh(armDotGeometry, armDotMaterial);
        armDot.position.set(0.4, 0.2, 0.15);
        cactusGroup.add(armDot);
    }

    // CACTUS SIEMPRE EN X=0
    cactusGroup.position.set(
        0,
        GROUND_Y + stemHeight / 2,
        -50
    );

    scene.add(cactusGroup);
    cacti.push(cactusGroup);

    // Programar siguiente cactus según dificultad
    const spawnDelay = Math.max(1000, 2500 - (difficultyLevel * 300));
    setTimeout(spawnCactus, spawnDelay);
}

function onTouchStart(event) {
    if (isGameOver) return;
    if (!isJumping) {
        jump();
    }
}

function onKeyDown(event) {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
        onTouchStart();
    }
}

function jump() {
    isJumping = true;
    jumpVelocity = JUMP_FORCE;
}

function updatePlayer() {
    if (isJumping) {
        player.position.y += jumpVelocity;
        jumpVelocity -= GRAVITY;

        // Rotar mientras salta
        player.rotation.x -= 0.1;

        // Aterrizar
        if (player.position.y <= GROUND_Y + PLAYER_SIZE / 2) {
            player.position.y = GROUND_Y + PLAYER_SIZE / 2;
            player.rotation.x = 0;
            isJumping = false;
            jumpVelocity = 0;
        }
    }
}

function updateCacti() {
    for (let i = cacti.length - 1; i >= 0; i--) {
        const cactus = cacti[i];
        cactus.position.z += gameSpeed;

        // Colisión
        const dz = Math.abs(cactus.position.z - player.position.z);
        const dy = player.position.y - GROUND_Y;

        if (dz < 0.7 && dy < 1.3) {
            gameOver();
        }

        // Eliminar cactus pasados
        if (cactus.position.z > 10) {
            scene.remove(cactus);
            cacti.splice(i, 1);
        }
    }
}

function updateClouds() {
    clouds.forEach(cloud => {
        cloud.mesh.position.z += cloud.speed;
        if (cloud.mesh.position.z > 10) {
            cloud.mesh.position.z = -50;
            cloud.mesh.position.x = (Math.random() - 0.5) * 40;
        }
    });
}

function updateScore(deltaTime) {
    scoreTimer += deltaTime;
    if (scoreTimer >= 100) {
        score++;
        scoreTimer = 0;
        document.getElementById('score').textContent = `Score: ${score}`;

        // Aumentar dificultad cada 50 puntos
        if (score % 50 === 0) {
            difficultyLevel++;
            gameSpeed += 0.05;
        }
    }
}

function updateFPS(deltaTime) {
    frameCount++;
    fpsTime += deltaTime;

    if (fpsTime >= 500) {
        const fps = Math.round((frameCount * 1000) / fpsTime);
        document.getElementById('fps').textContent = `FPS: ${fps}`;
        frameCount = 0;
        fpsTime = 0;
    }
}

function gameOver() {
    isGameOver = true;
    document.getElementById('final-score').textContent = `Score: ${score}`;
    document.getElementById('game-over').classList.remove('hidden');
}

function restartGame() {
    // Resetear variables
    score = 0;
    gameSpeed = 0.3;
    difficultyLevel = 1;
    isGameOver = false;
    isJumping = false;
    jumpVelocity = 0;
    scoreTimer = 0;
    frameCount = 0;
    fpsTime = 0;
    lastTime = performance.now();

    // Limpiar cactus
    cacti.forEach(cactus => scene.remove(cactus));
    cacti = [];

    // Resetear jugador
    player.position.y = GROUND_Y + PLAYER_SIZE / 2;
    player.rotation.set(0, 0, 0);

    // Ocultar game over
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('score').textContent = 'Score: 0';
    document.getElementById('fps').textContent = 'FPS: 60';

    // Reiniciar spawner
    spawnCactus();
}

// FUNCIÓN GLOBAL para volver al menú
window.backToMenu = function() {
    window.location.href = 'index.html';
};

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (!isGameOver) {
        updatePlayer();
        updateCacti();
        updateClouds();
        updateScore(deltaTime);
    }

    updateFPS(deltaTime);
    renderer.render(scene, camera);
}
