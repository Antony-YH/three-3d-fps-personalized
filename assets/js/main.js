import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const timer = new THREE.Timer();
timer.connect( document );

// ==========================================
// VARIABLES DEL JUGADOR Y ANIMACIONES
// ==========================================
let playerModel;
let playerMixer;
let idleAction, runAction, throwAction, jumpAction, currentAction;
let isThirdPerson = true; 
let isThrowing = false; 

// NUEVO: Variables para la Cámara Libre
let isFreeCamera = false;
const freeCameraVelocity = new THREE.Vector3();
// ==========================================

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x88ccee );
scene.fog = new THREE.Fog( 0x88ccee, 20, 200 );

const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.rotation.order = 'YXZ';

const fillLight1 = new THREE.HemisphereLight( 0x8dc1de, 0x00668d, 1.5 );
fillLight1.position.set( 2, 1, 1 );
scene.add( fillLight1 );

const directionalLight = new THREE.DirectionalLight( 0xffffff, 2.5 );
directionalLight.position.set( - 5, 25, - 1 );
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = - 30;
directionalLight.shadow.camera.top  = 30;
directionalLight.shadow.camera.bottom = - 30;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = - 0.00006;
scene.add( directionalLight );

const container = document.getElementById( 'container' );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild( renderer.domElement );

const stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '75px'; 
stats.domElement.style.left = '15px'; 
stats.domElement.style.zIndex = '100'; 
stats.domElement.style.filter = 'drop-shadow(0px 0px 4px rgba(0, 243, 255, 0.5))'; 
container.appendChild( stats.domElement );

const GRAVITY = 30;
const NUM_PROJECTILES = 100;
const PROJECTILE_RADIUS = 0.2;
const STEPS_PER_FRAME = 5;

// CREACIÓN DE LOS DIAMANTES NEÓN
const diamondGeometry = new THREE.OctahedronGeometry( PROJECTILE_RADIUS, 0 );
const diamondMaterial = new THREE.MeshStandardMaterial( { 
    color: 0xff00ea,    
    roughness: 0.2,     
    metalness: 0.8,     
    flatShading: true   
} );

const projectiles = [];
let projectileIdx = 0;

for ( let i = 0; i < NUM_PROJECTILES; i ++ ) {
    const diamondMesh = new THREE.Mesh( diamondGeometry, diamondMaterial );
    diamondMesh.castShadow = true;
    diamondMesh.receiveShadow = true;
    scene.add( diamondMesh );
    projectiles.push( {
        mesh: diamondMesh,
        collider: new THREE.Sphere( new THREE.Vector3( 0, - 100, 0 ), PROJECTILE_RADIUS ),
        velocity: new THREE.Vector3()
    } );
}

const worldOctree = new Octree();

const spawnX = 0;
const spawnY = 10;
const spawnZ = 0;

const playerCollider = new Capsule( 
    new THREE.Vector3( spawnX, spawnY + 0.35, spawnZ ), 
    new THREE.Vector3( spawnX, spawnY + 1, spawnZ ), 
    0.35 
);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
let mouseTime = 0;

const keyStates = {};
const vector1 = new THREE.Vector3();
const vector2 = new THREE.Vector3();
const vector3 = new THREE.Vector3();

document.addEventListener( 'keydown', ( event ) => {
    keyStates[ event.code ] = true;

    // Alternar cámara Tercera/Primera persona
    if ( event.code === 'KeyR' && !event.repeat ) {
        if (!isFreeCamera) { // Solo si NO estamos en cámara libre
            isThirdPerson = !isThirdPerson;
            if ( playerModel ) playerModel.visible = isThirdPerson;
        }
    }

    // NUEVO: Alternar Cámara Libre
    if ( event.code === 'KeyT' && !event.repeat ) {
        isFreeCamera = !isFreeCamera;
        if ( isFreeCamera ) {
            // Aseguramos que el jugador se vuelva visible al desacoplar la cámara
            if ( playerModel ) playerModel.visible = true;
        } else {
            // Restauramos la visibilidad según estemos en 1ra o 3ra persona al regresar
            if ( playerModel ) playerModel.visible = isThirdPerson;
        }
    }
} );

document.addEventListener( 'keyup', ( event ) => {
    keyStates[ event.code ] = false;
} );

container.addEventListener( 'mousedown', () => {
    document.body.requestPointerLock();
    mouseTime = performance.now();
} );

document.addEventListener( 'mouseup', () => {
    if ( document.pointerLockElement !== null ) throwBall();
} );

document.body.addEventListener( 'mousemove', ( event ) => {
    if ( document.pointerLockElement === document.body ) {
        camera.rotation.y -= event.movementX / 500;
        camera.rotation.x -= event.movementY / 500;
    }
} );

window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function throwBall() {
    const projectile = projectiles[ projectileIdx ];
    camera.getWorldDirection( playerDirection );
    
    // Si la cámara es libre, disparamos desde la cámara, si no, desde la cabeza del jugador
    const spawnPosition = isFreeCamera ? camera.position : playerCollider.end;
    
    projectile.collider.center.copy( spawnPosition ).addScaledVector( playerDirection, playerCollider.radius * 1.5 );

    const impulse = 15 + 30 * ( 1 - Math.exp( ( mouseTime - performance.now() ) * 0.001 ) );
    projectile.velocity.copy( playerDirection ).multiplyScalar( impulse );
    
    // No sumamos la velocidad del jugador si estamos volando en modo espectador
    if ( !isFreeCamera ) {
        projectile.velocity.addScaledVector( playerVelocity, 2 );
    }

    projectileIdx = ( projectileIdx + 1 ) % projectiles.length;

    // Solo activamos la animación de lanzar si controlamos al personaje
    if ( throwAction && !isFreeCamera ) {
        isThrowing = true;
    }
}

function playerCollisions() {
    const result = worldOctree.capsuleIntersect( playerCollider );
    playerOnFloor = false;

    if ( result ) {
        playerOnFloor = result.normal.y >= 0.15;
        if ( ! playerOnFloor ) {
            playerVelocity.addScaledVector( result.normal, - result.normal.dot( playerVelocity ) );
        }
        if ( result.depth >= 1e-10 ) {
            playerCollider.translate( result.normal.multiplyScalar( result.depth ) );
        }
    }
}

function updatePlayer( deltaTime ) {
    let damping = Math.exp( - 4 * deltaTime ) - 1;

    if ( ! playerOnFloor ) {
        playerVelocity.y -= GRAVITY * deltaTime;
        damping *= 0.1;
    }

    playerVelocity.addScaledVector( playerVelocity, damping );
    const deltaPosition = playerVelocity.clone().multiplyScalar( deltaTime );
    playerCollider.translate( deltaPosition );

    playerCollisions();

    // Lógica del Modelo 3D (Tercera Persona)
    if ( playerModel ) {
        playerModel.position.copy( playerCollider.start );
        playerModel.position.y -= playerCollider.radius; 
        
        // El personaje solo rota con la cámara si lo estamos controlando
        if ( !isFreeCamera ) {
            playerModel.rotation.y = camera.rotation.y + Math.PI; 
        }
    }

    // Si NO estamos en cámara libre, la cámara se acopla al personaje
    if ( !isFreeCamera ) {
        camera.position.copy( playerCollider.end ); 

        if ( isThirdPerson ) {
            const cameraOffset = new THREE.Vector3( 0, 0.5, 3 ); 
            cameraOffset.applyQuaternion( camera.quaternion ); 
            camera.position.add( cameraOffset ); 
        }
    }
}

function playerSphereCollision( projectile ) {
    const center = vector1.addVectors( playerCollider.start, playerCollider.end ).multiplyScalar( 0.5 );
    const sphere_center = projectile.collider.center;
    const r = playerCollider.radius + projectile.collider.radius;
    const r2 = r * r;

    for ( const point of [ playerCollider.start, playerCollider.end, center ] ) {
        const d2 = point.distanceToSquared( sphere_center );
        if ( d2 < r2 ) {
            const normal = vector1.subVectors( point, sphere_center ).normalize();
            const v1 = vector2.copy( normal ).multiplyScalar( normal.dot( playerVelocity ) );
            const v2 = vector3.copy( normal ).multiplyScalar( normal.dot( projectile.velocity ) );
            playerVelocity.add( v2 ).sub( v1 );
            projectile.velocity.add( v1 ).sub( v2 );
            const d = ( r - Math.sqrt( d2 ) ) / 2;
            sphere_center.addScaledVector( normal, - d );
        }
    }
}

function spheresCollisions() {
    for ( let i = 0, length = projectiles.length; i < length; i ++ ) {
        const s1 = projectiles[ i ];
        for ( let j = i + 1; j < length; j ++ ) {
            const s2 = projectiles[ j ];
            const d2 = s1.collider.center.distanceToSquared( s2.collider.center );
            const r = s1.collider.radius + s2.collider.radius;
            const r2 = r * r;
            if ( d2 < r2 ) {
                const normal = vector1.subVectors( s1.collider.center, s2.collider.center ).normalize();
                const v1 = vector2.copy( normal ).multiplyScalar( normal.dot( s1.velocity ) );
                const v2 = vector3.copy( normal ).multiplyScalar( normal.dot( s2.velocity ) );
                s1.velocity.add( v2 ).sub( v1 );
                s2.velocity.add( v1 ).sub( v2 );
                const d = ( r - Math.sqrt( d2 ) ) / 2;
                s1.collider.center.addScaledVector( normal, d );
                s2.collider.center.addScaledVector( normal, - d );
            }
        }
    }
}

function updateSpheres( deltaTime ) {
    projectiles.forEach( projectile => {
        projectile.collider.center.addScaledVector( projectile.velocity, deltaTime );
        const result = worldOctree.sphereIntersect( projectile.collider );
        if ( result ) {
            projectile.velocity.addScaledVector( result.normal, - result.normal.dot( projectile.velocity ) * 1.5 );
            projectile.collider.center.add( result.normal.multiplyScalar( result.depth ) );
        } else {
            projectile.velocity.y -= GRAVITY * deltaTime;
        }
        const damping = Math.exp( - 1.5 * deltaTime ) - 1;
        projectile.velocity.addScaledVector( projectile.velocity, damping );
        playerSphereCollision( projectile );
    } );

    spheresCollisions();

    for ( const projectile of projectiles ) {
        projectile.mesh.position.copy( projectile.collider.center );
        if ( projectile.velocity.lengthSq() > 0.1 ) {
            projectile.mesh.rotation.x += projectile.velocity.y * deltaTime * 0.5;
            projectile.mesh.rotation.y += projectile.velocity.x * deltaTime * 0.5;
            projectile.mesh.rotation.z += projectile.velocity.z * deltaTime * 0.5;
        }
    }
}

function getForwardVector() {
    camera.getWorldDirection( playerDirection );
    // En modo espectador podemos volar en cualquier ángulo (no capamos el eje Y)
    if ( !isFreeCamera ) {
        playerDirection.y = 0;
    }
    playerDirection.normalize();
    return playerDirection;
}

function getSideVector() {
    camera.getWorldDirection( playerDirection );
    if ( !isFreeCamera ) {
        playerDirection.y = 0;
    }
    playerDirection.normalize();
    playerDirection.cross( camera.up );
    return playerDirection;
}

function controls( deltaTime ) {
    // Si estamos en cámara libre, controlamos la cámara directamente
    if ( isFreeCamera ) {
        const speedDelta = deltaTime * 30; // Velocidad de vuelo

        if ( keyStates[ 'KeyW' ] ) freeCameraVelocity.add( getForwardVector().multiplyScalar( speedDelta ) );
        if ( keyStates[ 'KeyS' ] ) freeCameraVelocity.add( getForwardVector().multiplyScalar( - speedDelta ) );
        if ( keyStates[ 'KeyA' ] ) freeCameraVelocity.add( getSideVector().multiplyScalar( - speedDelta ) );
        if ( keyStates[ 'KeyD' ] ) freeCameraVelocity.add( getSideVector().multiplyScalar( speedDelta ) );
        if ( keyStates[ 'Space' ] ) freeCameraVelocity.y += speedDelta; // Volar hacia arriba
        if ( keyStates[ 'ShiftLeft' ] ) freeCameraVelocity.y -= speedDelta; // Volar hacia abajo

        // Fricción suave de la cámara
        const damping = Math.exp( - 8 * deltaTime ) - 1;
        freeCameraVelocity.addScaledVector( freeCameraVelocity, damping );
        
        camera.position.addScaledVector( freeCameraVelocity, deltaTime );

    } 
    // Si no, controlamos al personaje
    else {
        const speedDelta = deltaTime * ( playerOnFloor ? 25 : 8 );

        if ( keyStates[ 'KeyW' ] ) playerVelocity.add( getForwardVector().multiplyScalar( speedDelta ) );
        if ( keyStates[ 'KeyS' ] ) playerVelocity.add( getForwardVector().multiplyScalar( - speedDelta ) );
        if ( keyStates[ 'KeyA' ] ) playerVelocity.add( getSideVector().multiplyScalar( - speedDelta ) );
        if ( keyStates[ 'KeyD' ] ) playerVelocity.add( getSideVector().multiplyScalar( speedDelta ) );
        
        if ( playerOnFloor && keyStates[ 'Space' ] ) {
            playerVelocity.y = 15;
        }
    }
}

const loader = new GLTFLoader().setPath( './assets/models/gltf/' );

// CARGAR EL MAPA
loader.load( 'cityam.glb', ( gltf ) => { 
    scene.add( gltf.scene );
    worldOctree.fromGraphNode( gltf.scene );
    gltf.scene.traverse( child => {
        if ( child.isMesh ) {
            child.castShadow = true;
            child.receiveShadow = true;
            if ( child.material.map ) child.material.map.anisotropy = 4;
        }
    } );
    const helper = new OctreeHelper( worldOctree );
    helper.visible = false;
    scene.add( helper );
    const gui = new GUI( { width: 200 } );
    gui.add( { debug: false }, 'debug' ).onChange( function ( value ) { helper.visible = value; } );
} );

// ==========================================
// CARGAR EL PERSONAJE PROPIO (personajef.glb)
// ==========================================
loader.load( 'minihuman.glb', ( gltf ) => {
    playerModel = gltf.scene;
    playerModel.scale.set( 0.5, 0.5, 0.5 ); 

    playerModel.traverse( child => {
        if ( child.isMesh ) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    } );

    playerModel.visible = isThirdPerson;
    scene.add( playerModel );

    if ( gltf.animations && gltf.animations.length > 0 ) {
        playerMixer = new THREE.AnimationMixer( playerModel );
        
        playerMixer.addEventListener('finished', (e) => {
            if (e.action === throwAction) {
                isThrowing = false;
            }
        });

        const iQuieto = 0; 
        const iCorrer = 1; 
        const iLanzar = 2; 
        const iSaltar = 3; 

        idleAction = playerMixer.clipAction( gltf.animations[iQuieto] );
        
        if (gltf.animations.length > 1) runAction = playerMixer.clipAction( gltf.animations[iCorrer] );
        
        if (gltf.animations.length > 2) {
            throwAction = playerMixer.clipAction( gltf.animations[iLanzar] );
            throwAction.setLoop( THREE.LoopOnce, 1 );
            throwAction.clampWhenFinished = true;
        }

        if (gltf.animations.length > 3) {
            jumpAction = playerMixer.clipAction( gltf.animations[iSaltar] );
            jumpAction.setLoop( THREE.LoopOnce, 1 );
            jumpAction.clampWhenFinished = true;
        }

        currentAction = idleAction;
        currentAction.play();
    }
} );

function teleportPlayerIfOob() {
    if ( camera.position.y <= - 25 ) {
        playerCollider.start.set( spawnX, spawnY + 0.35, spawnZ );
        playerCollider.end.set( spawnX, spawnY + 1, spawnZ );
        playerCollider.radius = 0.35;
        
        if ( !isFreeCamera ) {
            camera.position.copy( playerCollider.end );
            camera.rotation.set( 0, 0, 0 );
        }
    }
}

function animate() {
    timer.update();
    const frameDelta = timer.getDelta();
    const deltaTime = Math.min( 0.05, frameDelta ) / STEPS_PER_FRAME;

    for ( let i = 0; i < STEPS_PER_FRAME; i ++ ) {
        controls( deltaTime );
        updatePlayer( deltaTime );
        updateSpheres( deltaTime );
        teleportPlayerIfOob();
    }

    // ==========================================
    // MÁQUINA DE ESTADOS DE ANIMACIÓN
    // ==========================================
    if ( playerMixer ) {
        playerMixer.update( frameDelta );

        const velocidadHorizontal = Math.sqrt( playerVelocity.x ** 2 + playerVelocity.z ** 2 );
        const estaCorriendo = velocidadHorizontal > 2.0;

        let accionDeseada = idleAction; 

        if ( isThrowing && throwAction ) {
            accionDeseada = throwAction;
        } 
        else if ( !playerOnFloor && jumpAction ) {
            accionDeseada = jumpAction;
        }
        else if ( estaCorriendo && runAction ) {
            accionDeseada = runAction;
        }

        if ( currentAction !== accionDeseada && accionDeseada ) {
            accionDeseada.reset().fadeIn( 0.2 ).play();
            if ( currentAction ) {
                currentAction.fadeOut( 0.2 );
            }
            currentAction = accionDeseada;
        }
    }

    renderer.render( scene, camera );
    stats.update();
}