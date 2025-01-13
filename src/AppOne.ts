import {
    Scene,
    Engine,
    Vector3,
    HemisphericLight,
    MeshBuilder,
    FreeCamera,
    StandardMaterial,
    Color3,
    Texture
} from 'babylonjs'
export class AppOne {
    engine: Engine;
    scene: Scene;

    constructor(readonly canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas)
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
        this.scene = createScene(this.engine, this.canvas)

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
}


var createScene = function (engine: Engine, canvas: HTMLCanvasElement) {
    const scene = new Scene(engine)

    // Create a static camera
    const camera = new FreeCamera('camera1', new Vector3(0, 0, -10), scene)
    camera.setTarget(Vector3.Zero())

    // Add a light
    const light = new HemisphericLight('light1', new Vector3(0, 1, 0), scene)
    light.intensity = 0.8

    // Create a non-uniform sphere
    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 8, segments: 64 }, scene)

    // Deform the sphere slightly to make it non-uniform
    const positions = sphere.getVerticesData('position') || []
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      positions[i + 1] += Math.sin(x * z) * 0.3 // Modify the Y-axis to create unevenness
    }
    sphere.updateVerticesData('position', positions)

    // Apply material to the sphere
    const material = new StandardMaterial('material', scene)
    material.diffuseTexture = new Texture('https://www.babylonjs.com/assets/earth.jpg', scene) // Planet texture
    sphere.material = material

    // Rotate the sphere over time
    scene.registerBeforeRender(() => {
      sphere.rotation.y += 0.01 // Rotate around the Y-axis
    })


    // TODO: Import the blender shperes using babylon importer and smothly change them while rotating so it looks
    // like a continous animation and like a planet during rotation transforms to another one
    // https://doc.babylonjs.com/divingDeeper/importers/blender
    return scene
};