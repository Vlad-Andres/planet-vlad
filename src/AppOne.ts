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
    SceneLoader
} from '@babylonjs/core'
import { GLTFFileLoader } from "@babylonjs/loaders";
import { Materials } from './Materials';
import { PlanetTransition } from './PlanetTransition';
import { PlayerMovement } from './PlayerMovement';
import { MeshLoader } from './MeshLoader';
import { Inspector } from '@babylonjs/inspector';

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
        this.createEnvironment()
        this.playerMovement = new PlayerMovement(this.planet, this.scene)
        this.setupCamera()
        new PlanetTransition(this.planet, false)
        PlanetTransition.start(1, this.scene)

        // registerBuiltInLoaders();
        this.loadMeshes(this.scene, this.planet)
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
        // await SceneLoader.ImportMeshAsync("", "models/trees/", "winter-tree1.glb", scene);


        // First load all tree models
        await MeshLoader.loadTreeModels(scene);
        
        PlanetTransition
            .registerMaterialMeshAssociation(1, MeshLoader.getTreeMesh("tree1") as Mesh, 12, 12)
        PlanetTransition
            .registerMaterialMeshAssociation(1, MeshLoader.getTreeMesh("big-tree") as Mesh, 2, -1.6)
        PlanetTransition
            .registerMaterialMeshAssociation(1, MeshLoader.getTreeMesh("tree-simple") as Mesh, 1, 600)
        
            // if (treeWinter2Mesh) {
        //     // Register the material-mesh association as before
        //     PlanetTransition.registerMaterialMeshAssociation(
        //         1, treeWinter2Mesh as Mesh, 32, 1.5
        //     );
        // }
        // if (stud) {
        //     // Register the material-mesh association as before
        //     PlanetTransition.registerMaterialMeshAssociation(
        //         1, stud as Mesh, 1032, 78
        //     );
        // }
    }

    createEnvironment(): void {
        const scene = this.scene
        // Create planet
        this.planet = MeshBuilder.CreateSphere('planet', { diameter: 8, segments: 32, updatable:true }, scene)
        this.planet.position = Vector3.Zero()

        const asset = 'brick'
        this.planet.applyDisplacementMap('displacement-models/'+ asset +'/height.png', 0, 1, undefined, undefined, Materials.getScale());
        // var material = new StandardMaterial("kosh", scene);

        new Materials(this.scene)
        // new PlanetTransition(this.planet)

        this.planet.material = Materials.get(0)
        this.planet!.material!.wireframe = true;
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