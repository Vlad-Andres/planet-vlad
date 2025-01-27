import {
    Scene,
    Engine,
    Vector3,
    Vector2,
    HemisphericLight,
    MeshBuilder,
    FreeCamera,
    Color3,
    PBRMaterial,
    ArcRotateCamera,
} from 'babylonjs'
import { Materials } from './Materials';
import { PlanetTransition } from './PlanetTransition';
export class AppOne {
    engine: Engine;
    scene: Scene;

    materials: PBRMaterial[] = [];
    currentMaterialIndex = 0;

    constructor(readonly canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas)
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
        this.scene = this.createScene(this.engine, this.canvas)
        this.createEnvironment()
    }

    debug(debugOn: boolean = true) {
        if (debugOn) {
            this.scene.debugLayer.show({ overlay: true });
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

    createScene = function (engine: Engine, canvas: HTMLCanvasElement) {
        const scene = new Scene(engine)

        // Create a static camera
        const camera = new ArcRotateCamera(
            "camera", // Name
            Math.PI / 4, // Alpha (horizontal angle)
            Math.PI / 4, // Beta (vertical angle)
            15, // Radius (distance from target)
            new Vector3(0, 0, 0), // Target (point the camera looks at)
            scene // Scene
        );
        // var camera = new ArcRotateCamera("Camera", 0, 0, 0, Vector3.FromArray([12, 0, 0]), scene);
        // camera.setTarget(Vector3.Zero())
        camera.attachControl(canvas, true);


        const neonLight = new HemisphericLight('neonLight', new Vector3(1, 0, 1), scene)
        neonLight.intensity = 0.4
        neonLight.diffuse = Color3.FromHexString('#00FFAA')
        neonLight.specular = Color3.FromHexString('#00FFFF')
        neonLight.groundColor = Color3.FromHexString('#00FFFF')

        const light = new HemisphericLight('light1', new Vector3(0, 1, 0), scene)
        light.intensity = 0.7

        return scene
    }

    createEnvironment(): void {
        const scene = this.scene
        const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 8, segments: 8, updatable:true }, scene)

        const asset = 'brick'
        sphere.applyDisplacementMap('public/displacement-models/'+ asset +'/height.png', 0, 1, undefined, undefined, Materials.getScale());
        // var material = new StandardMaterial("kosh", scene);

        new Materials(this.scene)
        new PlanetTransition(sphere)

        // material.wireframe = true;
        // sphere.material = Materials.get(0)

        // Rotate the sphere over time
    }
}