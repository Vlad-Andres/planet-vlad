import {
    Scene,
    Vector2,
    StandardMaterial,
    Texture,
    Material,
    PBRMaterial,
    MultiMaterial,
    Color3,
    Vector3,
    Mesh
} from '@babylonjs/core'
import { FurMaterial } from "@babylonjs/materials";
export class Materials {
    private static materials: (PBRMaterial|Material)[] = []
    private static multiMaterial: MultiMaterial
    private static sphereUVScale: Vector2 = Vector2.FromArray([10, 10]);
    private static activeMaterialIndex: number = 0
    private scene: Scene
    public static activeFurShells: Mesh[] = []
    private assets: string[] = [
        'grass',
        'asphalt',
        'brick',
        'volcanic',
    ]

    private materialConfigs: { 
        [key: string]: { 
            roughness: number, 
            useAmbientOcclusionFromMetallicTextureRed: boolean, 
            invertNormalMapX: boolean, 
            invertNormalMapY: boolean, 
            scale: number,
            materialCallback?: (scene: Scene) => void 
        } 
    } = {
        'grass': {
            roughness: 0.65,
            useAmbientOcclusionFromMetallicTextureRed: true,
            invertNormalMapX: true,
            invertNormalMapY: true,
            scale: 1.0,
            // materialCallback: (scene: Scene) => {
            //     const furMaterial = new FurMaterial("furMaterial", scene);
                
            //     // Set base material properties
            //     furMaterial.diffuseColor = new Color3(0.1, 0.5, 0.1);
            //     furMaterial.furColor = new Color3(0.1, 0.5, 0.1);
                
            //     // Generate and apply fur texture first
            //     const furTexture = FurMaterial.GenerateTexture("furTexture", scene);
            //     furMaterial.furTexture = furTexture;
                
            //     // Adjust fur properties for grass-like appearance
            //     furMaterial.furLength = 0.3;
            //     furMaterial.furAngle = 0;
            //     furMaterial.furSpacing = 0.1;
            //     furMaterial.furDensity = 15;
            //     furMaterial.furGravity = new Vector3(0, -0.2, 0);
                
            //     // Enable high-level fur with animation
            //     furMaterial.highLevelFur = true;
            //     furMaterial.furTime = 0;
            //     furMaterial.furSpeed = 200;
            //     furMaterial.furSpacing = 0.5;
                
            //     // Get the planet mesh and apply the fur material
            //     const sphere = scene.getMeshByName('planet') as Mesh;
            //     sphere.material = furMaterial;
                
            //     // Generate fur layers
            //     const furShells = FurMaterial.FurifyMesh(sphere, 30);
            //     // Store the shells for later use
            //     Materials.activeFurShells = furShells as Mesh[];
            // }
        },
        'asphalt': {
            roughness: 0.8,
            useAmbientOcclusionFromMetallicTextureRed: true,
            invertNormalMapX: true,
            invertNormalMapY: true,
            scale: 3.0
        },
        'brick': {
            roughness: 0.3, // Lower roughness for brick material
            useAmbientOcclusionFromMetallicTextureRed: true,
            invertNormalMapX: true,
            invertNormalMapY: true,
            scale: 10.0
        },
        'volcanic': {
            roughness: 0.9,
            useAmbientOcclusionFromMetallicTextureRed: true,
            invertNormalMapX: false,
            invertNormalMapY: true,
            scale: 8.0
        }
    }

    constructor(scene: Scene) {
        this.scene = scene
        this.assets.forEach(asset => {
            const material = this.getPBR(asset);
            Materials.materials.push(material);
            
            // Execute material callback if it exists
            const config = this.materialConfigs[asset];
            if (config.materialCallback) {
                config.materialCallback(scene);
            }
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

    public static changeActiveMaterial(index?: number): void {
        // Get the current material before changing index
        const oldMaterial = this.materials[this.activeMaterialIndex];

        // Update the index
        this.activeMaterialIndex = index !== undefined ? index : (this.activeMaterialIndex + 1) % this.getMaterialsCount();

        // Get the new material
        const newMaterial = this.materials[this.activeMaterialIndex];
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

    getPBR(asset: string): PBRMaterial | Material {
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

        material.albedoTexture = albedo
        material.bumpTexture = normal
        material.ambientTexture = ambientOcclusion
        material.metallicTexture = metallic

        // Apply material configuration based on asset type
        const config = this.materialConfigs[asset]

        material.roughness = config.roughness
        material.useAmbientOcclusionFromMetallicTextureRed = config.useAmbientOcclusionFromMetallicTextureRed
        material.invertNormalMapX = config.invertNormalMapX
        material.invertNormalMapY = config.invertNormalMapY

        texturesArray.forEach(texture => {
            texture.uScale = config.scale
            texture.vScale = config.scale
            texture.vAng = 0
            texture.wAng = 0
            texture.uAng = 0
        });

        // material.useTrypla

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