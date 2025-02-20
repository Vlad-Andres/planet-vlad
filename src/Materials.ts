import {
    Scene,
    Vector2,
    StandardMaterial,
    Texture,
    Material,
    PBRMaterial,
    MultiMaterial
} from '@babylonjs/core'
export class Materials {
    private static materials: (PBRMaterial|Material)[] = []
    private static multiMaterial: MultiMaterial
    private static sphereUVScale: Vector2 = Vector2.FromArray([10, 10]);
    private static activeMaterialIndex: number = 0
    private scene: Scene
    private assets: string[] = [
        'stone',
        'grass',
        'brick',
    ]

    constructor(scene: Scene) {
        this.scene = scene
        this.assets.forEach(asset => {
            Materials.materials.push(this.getMaterial(asset))
        });
        this.setMultiMaterial()
    }

    private setMultiMaterial(): void {
        const multiMaterial = new MultiMaterial("multiMaterial", this.scene);
        for (let i = 0; i < Materials.getMaterialsCount(); i++) {
            multiMaterial.subMaterials.push(Materials.get(i))
        }
        Materials.multiMaterial = multiMaterial
    }

    public static getActiveMaterialIndex(): number {
        return Materials.activeMaterialIndex
    }

    public static getActiveMaterial(): Material {
        return Materials.get(Materials.activeMaterialIndex) as Material
    }

    public static getNextActiveMaterial(): number {
        return (Materials.activeMaterialIndex + 1) % Materials.getMaterialsCount()
    }

    public static changeActiveMaterial(): void {
        // Get the current material before changing index
        const oldMaterial = this.materials[this.activeMaterialIndex];
        
        // Update the index
        this.activeMaterialIndex = (this.activeMaterialIndex + 1) % this.getMaterialsCount();
        
        // Get the new material
        const newMaterial = this.materials[this.activeMaterialIndex];
        
        // // Update the multimaterial
        // if (this.multiMaterial) {
        //     this.multiMaterial.subMaterials = this.multiMaterial.subMaterials.map(mat => 
        //         mat === oldMaterial ? newMaterial : mat
        //     );
        // }
    }
    

    public static dispose(): void {
        this.materials.forEach(material => {
            if (material instanceof StandardMaterial) {
                material.diffuseTexture?.dispose();
                material.bumpTexture?.dispose();
                material.specularTexture?.dispose();
                material.ambientTexture?.dispose();
            } else if (material instanceof PBRMaterial) {
                material.albedoTexture?.dispose();
                material.bumpTexture?.dispose();
                material.metallicTexture?.dispose();
                material.ambientTexture?.dispose();
            }
            material.dispose();
        });
        
        this.materials = [];
        this.multiMaterial.dispose();
    }

    getPBR(asset: string): PBRMaterial {
        const sphereUVScale = Materials.sphereUVScale
        const material = new PBRMaterial('material', this.scene)
        const texturesArray: Texture[] = []

        // Load displacement map
        const albedo = new Texture('displacement-models/'+ asset + '/albedo.png', this.scene)
        texturesArray.push(albedo)
        const normal = new Texture('displacement-models/'+ asset +'/normal.png', this.scene)
        texturesArray.push(normal)
        const roughness = new Texture('displacement-models/'+ asset +'/roughness.png', this.scene)
        texturesArray.push(roughness)
        const ambientOcclusion = new Texture('displacement-models/'+ asset +'/ambientOcclusion.png', this.scene)
        texturesArray.push(ambientOcclusion)
        const metallic = new Texture('displacement-models/'+ asset +'/metallic.png', this.scene)
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
        const baseColor = new Texture('displacement-models/'+ asset +'/base.png', this.scene)
        texturesArray.push(baseColor)
        const normal = new Texture('displacement-models/'+ asset +'/normal.png', this.scene)
        texturesArray.push(normal)
        const roughness = new Texture('displacement-models/'+ asset +'/roughness.png', this.scene)
        texturesArray.push(roughness)
        const ambientOcclusion = new Texture('displacement-models/'+ asset +'/ambientOcclusion.png', this.scene)
        texturesArray.push(ambientOcclusion)
        const displacement = new Texture('displacement-models/'+ asset +'/height.png', this.scene)
        texturesArray.push(displacement)
        texturesArray.forEach(texture => {
            texture.uScale = sphereUVScale.x
            texture.vScale = sphereUVScale.y
        });
        material.name = asset

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

    public static getMultiMaterial(): MultiMaterial {
        return Materials.multiMaterial
    }

    // public static getMultiMaterial(scene: Scene): MultiMaterial {
    //     if (!this.multiMaterial) {
    //         this.multiMaterial = new MultiMaterial("planetMultiMaterial", scene);
    //         // Initialize with all materials
    //         for (let i = 0; i < this.materials.length; i++) {
    //             this.multiMaterial.subMaterials.push(this.materials[i]);
    //         }
    //     }
    //     return this.multiMaterial;
    // }
}