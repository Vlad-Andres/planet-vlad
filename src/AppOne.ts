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
} from 'babylonjs'
import { Materials } from './Materials';
import { PlanetTransition } from './PlanetTransition';
import { PlayerMovement } from './PlayerMovement';
export class AppOne {
    engine: Engine;
    scene: Scene;
    planet!: Mesh;
    camera!: FollowCamera;

    materials: PBRMaterial[] = [];
    currentMaterialIndex = 0;

    constructor(readonly canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas)
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
        this.scene = this.createScene(this.engine)
        this.createEnvironment()
        new PlayerMovement(this.planet, this.scene)
        this.setupCamera()
        new PlanetTransition(this.planet)
    }

    debug(debugOn: boolean = true) {
        if (debugOn) {
            this.scene.debugLayer.show({ overlay: true });
        } else {
            this.scene.debugLayer.hide();
        }
    }

    run() {
        this.debug(false);
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

    createEnvironment(): void {
        const scene = this.scene
        // Create planet
        this.planet = MeshBuilder.CreateSphere('planet', { diameter: 8, segments: 8, updatable:true }, scene)
        this.planet.position = Vector3.Zero()

        const asset = 'brick'
        this.planet.applyDisplacementMap('public/displacement-models/'+ asset +'/height.png', 0, 1, undefined, undefined, Materials.getScale());
        // var material = new StandardMaterial("kosh", scene);

        new Materials(this.scene)
        // new PlanetTransition(this.planet)

        // material.wireframe = true;
        this.planet.material = Materials.get(0)
    }

    setupCamera(): void {
        // Instead of creating the camera with a fixed target,
        // create it and then parent it to the player.
        // this.camera = new ArcRotateCamera("camera", -Math.PI/2, Math.PI/8, 10, Vector3.Zero(), this.scene);

        // this.camera = new FollowCamera("camera", new Vector3(-Math.PI/2, Math.PI/8, 6), this.scene);
        this.camera = new FollowCamera("camera", new Vector3(-Math.PI/2, Math.PI/8, 6), this.scene);

        // The goal distance of camera from target
        // camera.radius = 10;


        // this.camera.parent = this.player;  // The camera now moves with the player.
        // Set the camera's local position relative to the player:
        // this.camera.position = new Vector3(0, 3, -8); // adjust as needed
        // Optionally, force the camera to look at the player:
        // this.camera.setTarget(this.player.position);
        const player = this.scene.getMeshByName("player") as Mesh;

        // Set the camera's target to the player
        this.camera.lockedTarget = player;

        // Smooth follow and update each frame
        this.scene.registerBeforeRender(() => {
            // Calculate the direction from the planet's center to the player
            const playerDirection = player.position.subtract(this.planet.position).normalize();

            // Set the camera's position to be behind the player, at a fixed distance
            const cameraDistance = 10; // Adjust as needed
            const cameraOffset = playerDirection.scale(cameraDistance); // Negative to position behind the player
            this.camera.position = player.position.add(cameraOffset);

            // Ensure the camera looks at the player
            this.camera.setTarget(player.position);
        });
    }
}