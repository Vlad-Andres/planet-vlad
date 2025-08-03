import {
    Scene,
    Engine,
    Vector3,
    HemisphericLight,
    MeshBuilder,
    Color4,
    PBRMaterial,
    Mesh,
    FollowCamera,
    Matrix,
    Quaternion,
    SceneLoader,
    StandardMaterial,
    CubeTexture,
    Texture,
    BlurPostProcess,
    Color3,
    Vector2
} from '@babylonjs/core'
import { GLTFFileLoader } from "@babylonjs/loaders";
import { Materials } from '../managers/Materials';
import { PlanetTransition } from '../transitions/PlanetTransition';
import { PlayerMovement } from '../systems/PlayerMovement';
import { MeshLoader } from '../managers/MeshLoader';
import { Inspector } from '@babylonjs/inspector';
import { BiomeManager } from '../managers/BiomeManager';
import { GameSystemManager } from './GameSystemManager';

/**
 * Main application class that manages the 3D planet environment, camera, and game initialization.
 * Handles rendering, scene setup, and coordinates all game components.
 */
export class AppOne {
    engine: Engine;
    scene: Scene;
    planet!: Mesh;
    camera!: FollowCamera;
    playerMovement!: PlayerMovement;
    blurPostProcess: BlurPostProcess;

    materials: PBRMaterial[] = [];
    currentMaterialIndex = 0;

/**
 * Creates a new AppOne instance and initializes the Babylon.js engine and scene.
 * Sets up event listeners and creates the initial blur post-process effect.
 * 
 * @param canvas - The HTML canvas element where the 3D scene will be rendered
 */
constructor(readonly canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas);
        this.scene = this.createScene();
        this.blurPostProcess = this.createBlurEffect();
        
        window.addEventListener('resize', () => this.engine.resize());
        document.addEventListener('game-start', () => this.removeBlur());
    }

    /**
     * Initializes the game environment without starting the render loop.
     * Creates the planet, player, camera, and loads all necessary meshes.
     * Applies initial visual effects and prepares the scene for gameplay.
     * 
     * @returns A promise that resolves when initialization is complete
     */
    public async initialize(): Promise<void> {
        console.log('Initializing AppOne...');

        this.createEnvironment();

        // 1️⃣  Player and camera setup comes first
        this.playerMovement = new PlayerMovement(this.planet, this.scene, false);
        this.setupCamera(); // ✅ Keep this one

        // 2️⃣  Now that a camera exists, BiomeManager can create the blur effect safely
        BiomeManager.initialize(this.scene);

        // 3️⃣  Other systems that depend on biomes
        const gsm = new GameSystemManager(this.scene);
        gsm.setPlayerMovement(this.playerMovement);

        // this.setupCamera(); ❌ Remove this duplicate call - it's creating a new camera that loses lock to player
        
        // Attach blur effect to camera
        this.scene.activeCamera?.attachPostProcess(this.blurPostProcess);
        
        // Initialize planet transition and load meshes
        new PlanetTransition(this.planet, false);
        await this.registerMeshes(this.scene);
        
        // Planet objects are spawned only once biomes are ready
        PlanetTransition.imediatelySpawnAll(this.scene);
    }

    /**
     * Starts the render loop and enables debugging.
     * This method should be called after initialization to begin the game.
     */
    public run(): void {
        console.log('Running AppOne...');
        this.canvas.focus();
        
        // Enable debug mode after a short delay
        setTimeout(() => this.debug(true), 100);
        
        this.engine.runRenderLoop(() => this.scene.render());
    }

    /**
     * Toggles the Babylon.js Inspector for debugging purposes.
     * 
     * @param debugOn - Whether to enable (true) or disable (false) the debug layer
     */
    private debug(debugOn: boolean = true): void {
        if (debugOn) {
            Inspector.Show(this.scene, {
                embedMode: true,
                handleResize: true,
            });
        } else {
            this.scene.debugLayer.hide();
        }
    }

    /**
     * Creates and configures a new Babylon.js scene.
     * Sets up basic scene properties and lighting.
     * 
     * @param engine - The Babylon.js engine instance
     * @returns The newly created scene
     */
    private createScene(): Scene {
        const scene = new Scene(this.engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        new HemisphericLight('light1', new Vector3(0, 1, 0), scene).intensity = 0.7;
        return scene;
    }

    private createBlurEffect(): BlurPostProcess {
        return new BlurPostProcess(
            "blur",
            new Vector2(4, 4),
            2,
            0.25,
            null,
            Texture.BILINEAR_SAMPLINGMODE,
            this.engine
        );
    }

    private removeBlur(): void {
        this.scene.activeCamera?.detachPostProcess(this.blurPostProcess);
        this.canvas.focus();
    }

    /**
     * Loads all 3D models and registers them with the PlanetTransition system.
     * Associates meshes with specific biomes and positions them on the planet.
     * 
     * @param scene - The current Babylon.js scene
     * @returns A promise that resolves when all meshes are loaded
     */
    private async registerMeshes(scene: Scene): Promise<void> {
        await MeshLoader.loadModels(scene);
        
        // Biome configuration data
        const biomeConfigs = [
            // Biome 0: Grass/Nature
            {
                landmark: { name: "house", offset: 34 },
                meshes: [
                    { name: "tree1", density: 15, offset: 15.5 },
                    { name: "bigTree", density: 5, offset: 1.42 },
                    { name: "treeSimple", density: 8, offset: 650 },
                    { name: "grass", density: 50, offset: 261 }
                ]
            },
            // Biome 1: Urban
            {
                landmark: { name: "arch", offset: 24 },
                meshes: [
                    { name: "largeBuilding", density: 4, offset: 3 },
                    { name: "largeBuilding2", density: 7, offset: 3 },
                    { name: "skyscraper", density: 5, offset: 9 },
                    { name: "statue", density: 2, offset: 4.3 }
                ]
            },
            // Biome 2: Netherlands
            {
                landmark: { name: "books", offset: 3.5 },
                meshes: [
                    { name: "townHouse", density: 6, offset: 12 },
                    { name: "chimney", density: 2, offset: 1450 },
                    { name: "buildingRed", density: 4, offset: 5.6 }
                ]
            },
            // Biome 3: Iceland
            {
                landmark: { name: "volcano", offset: 1.15 },
                meshes: [
                    { name: "mount", density: 1, offset: 9.5 },
                    { name: "brad", density: 5, offset: 1.3 },
                    { name: "seagull", density: 1, offset: 220 }
                ]
            }
        ];

        // Register all biomes
        biomeConfigs.forEach((biome, index) => {
            // Register landmark
            const landmarkMesh = MeshLoader.getMesh(biome.landmark.name) as Mesh;
            if (landmarkMesh) {
                PlanetTransition.registerMaterialMainLandmark(index, landmarkMesh, biome.landmark.offset);
            }

            // Register meshes
            biome.meshes.forEach(({ name, density, offset }) => {
                const mesh = MeshLoader.getMesh(name) as Mesh;
                if (mesh) {
                    PlanetTransition.registerMaterialMeshAssociation(index, mesh, density, offset);
                }
            });
        });
    }

    /**
     * Creates the planet and sets up the visual environment.
     * Configures materials, lighting, and atmospheric effects to create a retro neon aesthetic.
     */
    createEnvironment(): void {
        // TODO: add the save screen later that will have a rotating planet
        const scene = this.scene
        // Create planet
        this.planet = MeshBuilder.CreateSphere('planet', { diameter: 8, segments: 32, updatable:true }, scene)
        this.planet.position = Vector3.Zero()

        // const asset = 'grass'
        // this.planet.applyDisplacementMap('displacement-models/'+ asset +'/height.png', 0, 1, undefined, undefined, Materials.getScale());
        // var material = new StandardMaterial("kosh", scene);

        new Materials(this.scene)


        // this.planet.material = Materials.get(0)
        // this.planet!.material!.wireframe = true;

        // Create a retro neon background
        scene.clearColor = new Color4(0.05, 0, 0.1, 1); // Deep purple base color
        
        // Add neon lighting effects
        const topLight = new HemisphericLight("topLight", new Vector3(0, 1, 0), scene);
        topLight.intensity = 0.9;
        topLight.diffuse = new Color3(1, 0.2, 0.8);  // Hot pink top
        topLight.groundColor = new Color3(0.2, 0, 0.4); // Deep purple bottom
        
        const ambientLight = new HemisphericLight("ambientLight", new Vector3(0, -1, 0), scene);
        ambientLight.intensity = 0.5;
        ambientLight.diffuse = new Color3(0, 0.8, 1);  // Cyan glow
        ambientLight.groundColor = new Color3(0.4, 0, 0.8); // Purple glow
        
        // Add stronger fog for neon atmosphere
        scene.fogMode = Scene.FOGMODE_EXP2;
        scene.fogColor = new Color3(0.15, 0, 0.3); // Purple fog
        scene.fogDensity = 0.002; // Slightly denser fog for more atmosphere
    }

    /**
     * Configures the follow camera to track the player.
     * Sets up camera parameters and adds a render observable to maintain proper orientation
     * relative to the planet's surface and player's heading.
     */
    setupCamera(): void {
        this.camera = new FollowCamera("camera", new Vector3(-Math.PI/2, Math.PI/4, 6), this.scene);        
        const player = this.scene.getMeshByName("player") as Mesh;
    
        const cameraDistance = 12;
        this.camera.lockedTarget = player;
        this.camera.radius = cameraDistance;
        this.camera.heightOffset = 4;
        this.camera.cameraAcceleration = 0.05;
        this.camera.maxCameraSpeed = 20;
        this.camera.attachControl();
    
        // Keep camera's position and orientation stable using player's heading and up vector
        this.scene.onBeforeRenderObservable.add(() => {
            const playerUp = player.position.subtract(this.planet.position).normalize();
            const playerForward = this.playerMovement.getCurrentHeading();
            const playerRight = Vector3.Cross(playerForward, playerUp).normalize();
            const adjustedForward = Vector3.Cross(playerUp, playerRight).normalize();
    
            // Use the camera's radius property instead of hardcoded distance
            const currentCameraDistance = this.camera.radius;
            const cameraOffset = adjustedForward.scale(-currentCameraDistance);
            
            // Apply height offset
            const heightOffset = playerUp.scale(this.camera.heightOffset);
            
            this.camera.position = player.position.add(cameraOffset).add(heightOffset);
            this.camera.upVector = Vector3.Lerp(this.camera.upVector, playerUp, 0.1); // Smooth transition
        });
    }
}