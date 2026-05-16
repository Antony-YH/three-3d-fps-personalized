readme_content = """# 🎮 Motor de Interacción 3D con Físicas Octree, Sistema Multicámara y HUD Táctico

![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-990000?style=for-the-badge&logo=webgl&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Bootstrap 5](https://img.shields.io/badge/Bootstrap_5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

## 📖 Descripción General

En este proyecto diseñé, programé e implementé un entorno interactivo tridimensional avanzado utilizando **Three.js** y **WebGL**, enfocado en la simulación de físicas por particionamiento espacial y el desarrollo de mecánicas complejas para videojuegos en la web. La aplicación combina un sólido núcleo de cómputo físico con una interfaz de usuario táctica de alto impacto visual (*Glassmorphism* y estilo *Cyberpunk*) desarrollada con **Bootstrap 5**.

El desarrollo destaca por lograr un desacoplamiento completo entre la lógica matemática de colisión y el renderizado visual de los modelos, garantizando una ejecución óptima con tasas estables superiores a los 60 FPS.

---

## ✨ Características Técnicas Detalladas

### 1. Núcleo Mecánico y Particionamiento Espacial (`Octree`)
* **Colisiones Eficientes:** Implementé un árbol octal (`Octree`) optimizado a partir de la geometría del entorno estático (`cityam.glb`). Esto permite subdividir el espacio tridimensional jerárquicamente, reduciendo la complejidad del cálculo de colisiones de un costo algorítmico global a comprobaciones locales inmediatas.
* **Físicas de Proyectiles:** El sistema gestiona un grupo de hasta 100 proyectiles simultáneos de diamantes magenta neón (`OctahedronGeometry` con `flatShading`). El movimiento calcula dinámicamente vectores de rebote elástico basados en el vector normal de las superficies impactadas del Octree, aplicando amortiguación física lineal (*damping*).

### 2. Controlador de Personaje Desacoplado (Cápsula Física)
* **Separación de Responsabilidades:** El jugador está representado matemáticamente por una forma abstracta de cápsula (`Capsule`). Toda la lógica de gravedad, aceleración, fricción con el suelo y saltos se aplica directamente sobre esta estructura invisible.
* **Seguimiento Visual:** El modelo 3D del personaje (`personajef.glb`) actúa como un componente visual esclavo que copia la posición e interpola la rotación respecto al colisionador, eliminando por completo los errores de atasco geométrico (*glitches* en paredes o rampas).

### 3. Sistema de Animación por Máquina de Estados
* **Transiciones Dinámicas:** Programé una máquina de estados para controlar el componente `AnimationMixer`. En lugar de forzar animaciones mediante la presión directa de teclas, el sistema calcula la magnitud del vector de velocidad horizontal real del jugador en los ejes X y Z.
* **Priorización de Estados:**
    1.  **Lanzamiento (Throw/Attack):** Se ejecuta una sola vez (`THREE.LoopOnce`) al hacer clic, interrumpiendo cualquier animación y regresando con suavidad al finalizar.
    2.  **Salto/Vuelo (Jump/Fall):** Se activa al despegar del suelo (`!playerOnFloor`), congelando el último cuadro en el aire para simular caída libre.
    3.  **Movimiento (Run):** Se activa de forma progresiva mediante interpolación lineal si la velocidad en el suelo supera el umbral límite.
    4.  **Reposo (Idle):** Estado base de respiración cuando el personaje se encuentra estático.
* **Crossfading Progresivo:** Las transiciones de estados utilizan técnicas de desvanecimiento cruzado (`fadeIn` / `fadeOut`) de 0.2 segundos, logrando cambios de postura fluidos y naturales.

### 4. Controlador Multicámara Avanzado (Matemática de Matrices)
* **Tercera Persona (TPS):** Cámara orbital nativa calculada mediante un vector de desplazamiento (*offset*) posicional que se transforma frame a frame utilizando el cuaternión de rotación del mouse, permitiendo orbitar alrededor del personaje con fluidez.
* **Primera Persona (FPS):** La cámara se posiciona con precisión milimétrica en el nodo superior de la cápsula física (los ojos del personaje) y el modelo 3D se oculta automáticamente para evitar la superposición de polígonos internos de la cabeza.
* **Cámara Libre (Free Cam / Espectador):** Activada mediante un estado global, desacopla la cámara de las físicas del personaje y deshabilita la gravedad del observador. Implementa vectores de aceleración tridimensional libre con fricción exponencial para lograr un vuelo suave por todo el escenario.

### 5. Gestión Asíncrona y Pantalla de Carga
* **Control de Ciclo de Vida:** Integré `THREE.LoadingManager` para centralizar la descarga asíncrona de recursos pesados de red (geometrías GLTF, mapas de texturas, shaders).
* **HUD de Carga:** El sistema intercepta el progreso numérico exacto (*items cargados / items totales*) y lo mapea matemáticamente a una barra de progreso nativa en el DOM de HTML5, liberando la interactividad de la escena e implementando un fundido (*fade-out*) suave de opacidad una vez completado el procesamiento en la GPU.

---

## 🎮 Interfaz Gráfica (HUD) y Controles

La interfaz de usuario emula un centro de comando militar digital de alta tecnología con tipografías futuristas (`Orbitron` y `Rajdhani`) y un efecto esmerilado translúcido (*Glassmorphism*).

### Mapeo Completo del Teclado y Mouse

| Periferico / Tecla | Modo Personaje (1ra / 3ra Persona) | Modo Cámara Libre (Espectador) |
| :--- | :--- | :--- |
| **Movimiento de Mouse** | Rotación de Cámara / Orientación | Orientación de Vuelo de Cámara |
| **Clic Izquierdo** | Cargar impulso y Lanzar Diamante Neón | Disparar Diamante desde la Cámara |
| **W, A, S, D** | Caminar / Correr por el escenario | Volar en dirección horizontal/mirada |
| **SPACE (Barra Espaciadora)**| Saltar (Aplica impulso vertical positivo) | Elevarse verticalmente en el aire |
| **LSHIFT (Shift Izquierdo)** | N/A | Descender verticalmente en el aire |
| **Tecla R** | Alternar vista entre Primera y Tercera Persona | N/A |
| **Tecla T** | Activar Modo Cámara Libre (Desacoplar) | Desactivar Modo Cámara Libre (Acoplar) |
| **Tecla P** | Imprimir coordenadas exactas en Consola F12 | Imprimir coordenadas de cámara en F12 |
| **Tecla ESC** | Liberar puntero del mouse (`PointerLock`) | Liberar puntero del mouse (`PointerLock`) |

---

## 📁 Estructura Arquitectónica del Proyecto

El código está estrictamente modularizado para separar la maquetación visual de la lógica computacional del motor 3D:
README.md generado con éxito.

```text
📦 raiz-del-proyecto
 ┣ 📂 assets
 ┃ ┣ 📂 build
 ┃ ┃ ┗ 📜 three.module.js        # Biblioteca Core de Three.js (Módulo ES6)
 ┃ ┣ 📂 css
 ┃ ┃ ┗ 📜 main.css               # Estilos HUD, Glassmorphism, Neon Glow y Animaciones
 ┃ ┣ 📂 js
 ┃ ┃ ┗ 📜 main.js                # Motor de Físicas, Máquina de Estados, Cámaras y Controladores
 ┃ ┣ 📂 jsm                      # Extensiones y Addons Oficiales de Three.js
 ┃ ┃ ┣ 📂 loaders
 ┃ ┃ ┃ ┗ 📜 GLTFLoader.js        # Importador de archivos GLTF/GLB
 ┃ ┃ ┣ 📂 math
 ┃ ┃ ┃ ┣ 📜 Octree.js            # Algoritmo de subdivisión espacial
 ┃ ┃ ┃ ┗ 📜 Capsule.js           # Primitiva matemática de colisión
 ┃ ┃ ┗ 📂 libs
 ┃ ┃   ┗ 📜 stats.module.js      # Monitorizador de FPS en tiempo real
 ┃ ┗ 📂 models
 ┃   ┗ 📂 gltf
 ┃     ┣ 📜 cityam.glb           # Geometría tridimensional del mapa del juego
 ┃     ┗ 📜 minihuman.glb       # Malla del personaje y esqueleto de animación (Rigging)
 ┗ 📜 index.html                 # Estructura del HUD Táctico, Contenedores DOM e Import Maps
 ```

## 🛠️ Despliegue Local y Requisitos
Para poder ejecutar la aplicación y evitar las restricciones de seguridad del navegador relacionadas con la carga de archivos locales e hilos asíncronos (Políticas CORS para recursos GLTF/GLB):

Clonar o Descargar los directorios manteniendo la jerarquía de carpetas intacta.

Montar un Servidor Web Local:

Opción VS Code: Instalar la extensión Live Server, hacer clic derecho en index.html y seleccionar Open with Live Server.

Opción Node.js: Instalar http-server de manera global (npm install -g http-server) y ejecutar el comando http-server en la raíz de la carpeta.

Navegación: Acceder a la dirección local provista (usualmente https://antony-yh.github.io/three-3d-fps-personalized/).

## 👨‍💻 Información del Desarrollador
Nombre: Antonio Yáñez Hernández

Carrera: Ingeniería en Sistemas Computacionales (ISC)

Especialidad: Redes y Tecnología de Software

Institución: Tecnológico Nacional de México (TecNM) — Instituto Tecnológico de Pachuca (ITP)