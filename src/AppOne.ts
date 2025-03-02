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
import { Materials } from './Materials';
import { PlanetTransition } from './PlanetTransition';
import { PlayerMovement } from './PlayerMovement';
import { MeshLoader } from './MeshLoader';
import { Inspector } from '@babylonjs/inspector';
import { BiomeManager } from './BiomeManager';
// import * as BABYLON from '@babylonjs/core'; 

export class AppOne {
    engine: Engine;
    scene: Scene;
    planet!: Mesh;
    camera!: FollowCamera;
    playerMovement: PlayerMovement

    materials: PBRMaterial[] = [];
    currentMaterialIndex = 0;

    constructor(readonly canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas)
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
        this.scene = this.createScene(this.engine)
        console.log('CAAAANVAS' + canvas)
        // Add blur effect initially
        const blurPostProcess = new BlurPostProcess(
            "blur",
            new Vector2(4, 4),
            2,
            0.25,
            null,
            Texture.BILINEAR_SAMPLINGMODE,
            this.engine
        );
        
        // Listen for game start event from Vue component
        document.addEventListener('game-start', () => {
            if (this.scene.activeCamera) {
                this.scene.activeCamera.detachPostProcess(blurPostProcess);
            }
            // Focus the canvas to enable keyboard controls
            canvas.focus();
        });
        
        if (this.scene.activeCamera) {
            this.scene.activeCamera.attachPostProcess(blurPostProcess);
        }

        this.createEnvironment()
        this.playerMovement = new PlayerMovement(this.planet, this.scene)
        this.setupCamera()
        new PlanetTransition(this.planet, false)
        this.loadMeshes(this.scene, this.planet).then(() => {
            PlanetTransition.imediatelySpawnAll(this.scene)
        }); 

        // Initialize BiomeManager
        BiomeManager.initialize(this.scene)
    }

    debug(debugOn: boolean = true) {
        if (debugOn) {
            Inspector.Show(this.scene, {});

            // this.scene.debugLayer.show({ overlay: true });
        } else {
            this.scene.debugLayer.hide();
        }
    }

    run() {
        this.debug(true);
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    createScene = function (engine: Engine) {
        const scene = new Scene(engine)
        scene.clearColor = new Color4(0, 0, 0, 1)

        // Setup lighting
        new HemisphericLight('light1', new Vector3(0, 1, 0), scene).intensity = 0.7
        
        return scene
    }

    private async loadMeshes(scene: Scene, planet: Mesh): Promise<void> {

        // First load all tree models
        await MeshLoader.loadModels(scene);
        
        PlanetTransition.registerMaterialMainLandmark(0, MeshLoader.getMesh("house") as Mesh, 34)
        PlanetTransition
            .registerMaterialMeshAssociation(0, MeshLoader.getMesh("tree1") as Mesh, 3, 12)
        PlanetTransition
            .registerMaterialMeshAssociation(0, MeshLoader.getMesh("bigTree") as Mesh, 1, -1.6)
        PlanetTransition
            .registerMaterialMeshAssociation(0, MeshLoader.getMesh("treeSimple") as Mesh, 1, 600)
        PlanetTransition
            .registerMaterialMeshAssociation(0, MeshLoader.getMesh("grass") as Mesh, 50, 261)

        PlanetTransition.registerMaterialMainLandmark(1, MeshLoader.getMesh("arch") as Mesh, 20)
        PlanetTransition
            .registerMaterialMeshAssociation(1, MeshLoader.getMesh("largeBuilding") as Mesh, 7, 0)
        PlanetTransition
            .registerMaterialMeshAssociation(1, MeshLoader.getMesh("largeBuilding2") as Mesh, 7, 0)
        PlanetTransition
            .registerMaterialMeshAssociation(1, MeshLoader.getMesh("skyscraper") as Mesh, 1, 6)
        PlanetTransition
            .registerMaterialMeshAssociation(1, MeshLoader.getMesh("statue") as Mesh, 10, 1.2)

        PlanetTransition.registerMaterialMainLandmark(2, MeshLoader.getMesh("books") as Mesh, 0.8)
        PlanetTransition
            .registerMaterialMeshAssociation(2, MeshLoader.getMesh("townHouse") as Mesh, 3, 9)
        PlanetTransition
            .registerMaterialMeshAssociation(2, MeshLoader.getMesh("chimney") as Mesh, 1, 1450)
        PlanetTransition
            .registerMaterialMeshAssociation(2, MeshLoader.getMesh("buildingRed") as Mesh, 2, 2.5)

        PlanetTransition.registerMaterialMainLandmark(3, MeshLoader.getMesh("volcano") as Mesh, -1.9)
        PlanetTransition
            .registerMaterialMeshAssociation(3, MeshLoader.getMesh("mount") as Mesh, 1, 6.6)
        PlanetTransition
            .registerMaterialMeshAssociation(3, MeshLoader.getMesh("brad") as Mesh, 150, -1)
        PlanetTransition
            .registerMaterialMeshAssociation(3, MeshLoader.getMesh("seagull") as Mesh, 1, 220)
        }

    createEnvironment(): void {
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

            const cameraOffset = adjustedForward.scale(-cameraDistance);
            this.camera.position = player.position.add(cameraOffset);
            this.camera.upVector = Vector3.Lerp(this.camera.upVector, playerUp, 0.1); // Smooth transition
        });
    }
}