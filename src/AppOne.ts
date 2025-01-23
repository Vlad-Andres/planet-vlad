import {
    Scene,
    Engine,
    Vector3,
    Vector2,
    HemisphericLight,
    MeshBuilder,
    FreeCamera,
    StandardMaterial,
    Color3,
    Texture,
    Material,
    PBRMaterial,
    ArcRotateCamera,
    VertexBuffer
} from 'babylonjs'
export class AppOne {
    engine: Engine;
    scene: Scene;

    materials: PBRMaterial[] = [];
    currentMaterialIndex = 0;
    sphereUVScale = Vector2.FromArray([5, 5]);

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
        this.debug(false);
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    createScene = function (engine: Engine, canvas: HTMLCanvasElement) {
        const scene = new Scene(engine)

        // Create a static camera
        var camera = new ArcRotateCamera("Camera", 0, 0, 0, Vector3.FromArray([12, 0, 0]), scene);
        camera.setTarget(Vector3.Zero())

        // Add a neon retro wave light

        const neonLight = new HemisphericLight('neonLight', new Vector3(1, 0, 1), scene)
        neonLight.intensity = 0.4
        neonLight.diffuse = Color3.FromHexString('#00FFAA')
        neonLight.specular = Color3.FromHexString('#00FFFF')
        neonLight.groundColor = Color3.FromHexString('#00FFFF')

        // Add a light to the scene


        const light = new HemisphericLight('light1', new Vector3(0, 1, 0), scene)
        light.intensity = 0.7

        // Apply material to the sphere

        // TODO: create a displacement map material from basecolor, normal, roughness, ambient occlusion

        // TODO: Import the blender shperes using babylon importer and smothly change them while rotating so it looks
        // like a continous animation and like a planet during rotation transforms to another one

        return scene
    }

    getPBRSphereMaterial(asset: string): PBRMaterial {
        const material = new PBRMaterial('material', this.scene)
        const texturesArray: Texture[] = []

        // Load displacement map
        const albedo = new Texture('public/displacement-models/'+ asset + '/albedo.png', this.scene)
        texturesArray.push(albedo)
        const normal = new Texture('public/displacement-models/'+ asset +'/normal.png', this.scene)
        texturesArray.push(normal)
        const roughness = new Texture('public/displacement-models/'+ asset +'/roughness.png', this.scene)
        texturesArray.push(roughness)
        const ambientOcclusion = new Texture('public/displacement-models/'+ asset +'/ambientOcclusion.png', this.scene)
        texturesArray.push(ambientOcclusion)
        const metallic = new Texture('public/displacement-models/'+ asset +'/metallic.png', this.scene)
        texturesArray.push(metallic)

        texturesArray.forEach(texture => {
            texture.uScale = this.sphereUVScale.x
            texture.vScale = this.sphereUVScale.y
        });

        // displacement.uScale = displacement.vScale = 3
        material.albedoTexture = albedo
        material.bumpTexture = normal
        material.ambientTexture = ambientOcclusion
        material.metallicTexture = metallic

        // material.microSurface = 0.1
        material.useAmbientOcclusionFromMetallicTextureRed = true
        material.invertNormalMapX = true
        material.invertNormalMapY = true
        material.roughness = 0.65
        // material.wireframe = true


        return material
    }

    getMaterial(asset: string): Material {
        const material = new StandardMaterial('material', this.scene)
        const texturesArray: Texture[] = []

        // Load displacement map
        const baseColor = new Texture('public/displacement-models/'+ asset +'/base.png', this.scene)
        texturesArray.push(baseColor)
        const normal = new Texture('public/displacement-models/'+ asset +'/normal.png', this.scene)
        texturesArray.push(normal)
        const roughness = new Texture('public/displacement-models/'+ asset +'/roughness.png', this.scene)
        texturesArray.push(roughness)
        const ambientOcclusion = new Texture('public/displacement-models/'+ asset +'/ambientOcclusion.png', this.scene)
        texturesArray.push(ambientOcclusion)
        const displacement = new Texture('public/displacement-models/'+ asset +'/height.png', this.scene)
        texturesArray.push(displacement)

        texturesArray.forEach(texture => {
            texture.uScale = this.sphereUVScale.x
            texture.vScale = this.sphereUVScale.y
        });

        material.diffuseTexture = baseColor
        material.bumpTexture = normal
        material.specularTexture = roughness
        material.ambientTexture = ambientOcclusion
        material.specularPower = 10

        material.invertNormalMapY = true
        material.invertNormalMapX = true

        return material
    }

    createEnvironment(): void {
        this.materials.push(this.getPBRSphereMaterial('brick'))
        this.materials.push(this.getPBRSphereMaterial('stone'))
        const scene = this.scene
        const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 8, segments: 64, updatable:true }, scene)

        const asset = 'brick'
        let material = this.getPBRSphereMaterial(asset)
        sphere.applyDisplacementMap('public/displacement-models/'+ asset +'/height.png', 0, 1, undefined, undefined, this.sphereUVScale);
        // var material = new StandardMaterial("kosh", scene);
        sphere.material = material
        // material.wireframe = true;


        // Rotate the sphere over time
        scene.registerBeforeRender(() => {
            sphere.rotation.y -= 0.002
            sphere.rotation.z -= 0.001
        })

        // Wait 5 seconds, then start the smooth material update
        setTimeout(() => {
            this.changeMaterialSmoothly();
        }, 2000);
    }

    changeMaterialSmoothly(): void {
        const sphere = this.scene.getMeshByName("sphere");
        if (!sphere || !(sphere.material instanceof PBRMaterial)) return;

        // Get the new material
        this.currentMaterialIndex = (this.currentMaterialIndex + 1) % this.materials.length;
        const newMaterial = this.materials[this.currentMaterialIndex];

        // Access sphere geometry
        const positions = sphere.getVerticesData(VertexBuffer.PositionKind)!;
        const indices = sphere.getIndices()!;
        const normals = sphere.getVerticesData(VertexBuffer.NormalKind)!;

        const camera = this.scene.activeCamera as ArcRotateCamera;

        // Iterate through the vertices and selectively update UVs
        for (let i = 0; i < positions.length; i += 3) {
          const vertex = new Vector3(positions[i], positions[i + 1], positions[i + 2]);

          // Check if the vertex is visible
          if (!this.isPointVisible(camera, vertex)) {
            //TODO: Find a way to change only the vectors that are not visible,
            // -- Smoothly change the material of the sphere starting with those that are behind the camera
            sphere.material = newMaterial;
          }
        }
      }

    isPointVisible(camera: ArcRotateCamera, point: Vector3): boolean {
        const viewport = this.engine.getRenderingCanvasClientRect()!;
        const projectedPoint = Vector3.Project(
            point,
            camera.getWorldMatrix(),
            this.scene.getTransformMatrix(),
            camera.viewport.toGlobal(viewport.width, viewport.height)
        );

        // Check if the point is within the visible range
        return (
            projectedPoint.x >= 0 &&
            projectedPoint.x <= viewport.width &&
            projectedPoint.y >= 0 &&
            projectedPoint.y <= viewport.height
        );
    }

}