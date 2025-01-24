import {
    Scene,
    Vector2,
    StandardMaterial,
    Texture,
    Material,
    PBRMaterial,
} from 'babylonjs'
export class Materials {
    private static materials: (PBRMaterial|Material)[] = []
    private static sphereUVScale: Vector2 = Vector2.FromArray([5, 5]);
    private scene: Scene
    private assets: string[] = [
        'stone',
        'brick',
    ]

    constructor(scene: Scene) {
        this.scene = scene
        this.assets.forEach(asset => {
            Materials.materials.push(this.getPBR(asset))
        });
    }

    getPBR(asset: string): PBRMaterial {
        const sphereUVScale = Materials.sphereUVScale
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
            texture.uScale = sphereUVScale.x
            texture.vScale = sphereUVScale.y
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
        const sphereUVScale = Materials.sphereUVScale
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
            texture.uScale = sphereUVScale.x
            texture.vScale = sphereUVScale.y
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

    public static get(index: number): Material | PBRMaterial {
        return Materials.materials[index]
    }

    public static getScale(): Vector2 {
        return Materials.sphereUVScale
    }

    public static getMaterialsCount(): number {
        return Materials.materials.length
    }
}