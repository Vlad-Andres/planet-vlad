import {
    Scene,
    Vector3,
    Mesh,
    Material,
    StandardMaterial,
    PBRMaterial
} from '@babylonjs/core'
import { Materials } from './Materials';
import { MeshPlacementManager, MaterialMeshAssociation } from './MeshPlacementManager';

// TODO: make the landmark the gate to the next biome
export class PlanetTransition {
    public static transitionRunning: boolean = false
    public static currentlyHiding: boolean = false
    public static processedFaces: number[] = []
    public static facesProcessedBefore: number[] = []
    public static sphere: Mesh
    public static debug: boolean = false
    private static startWithMaterial: number = 1

    constructor(sphere: Mesh, debug: boolean) {
        PlanetTransition.sphere = sphere;
        PlanetTransition.debug = debug;
        
        // Initialize the MeshPlacementManager with the sphere
        MeshPlacementManager.initialize(sphere.getScene(), sphere);
    }

    public static getCurrentLandmark(): Mesh | undefined {
        return MeshPlacementManager.getCurrentLandmark();
    }

    public static registerMaterialMeshAssociation(
        materialIndex: number,
        meshTemplate: Mesh,
        density: number = 5,
        verticalOffset: number = 4
    ): void {
        MeshPlacementManager.registerMaterialMeshAssociation(
            materialIndex,
            meshTemplate,
            density,
            verticalOffset
        );
    }

    public static registerMaterialMainLandmark(
        materialIndex: number,
        meshTemplate: Mesh,
        verticalOffset: number = 4
    ): void {
        MeshPlacementManager.registerMaterialMainLandmark(
            materialIndex,
            meshTemplate,
            verticalOffset
        );
    }

    public static do(scene: Scene): void {
        const sphere = scene.getMeshByName('planet') as Mesh;
        this.sphere = sphere; // Ensure sphere is set
        
        // Clear instances for the current material
        MeshPlacementManager.clearInstances(Materials.getActiveMaterialIndex());
        
        // Update the material index to the next biome
        Materials.changeActiveMaterial();
        sphere.material = Materials.getActiveMaterial();
        sphere.material.wireframe = true;
        
        // Get the next material index
        const nextMaterialIndex = Materials.getActiveMaterialIndex();
        
        // Place meshes for the new material
        MeshPlacementManager.placeMeshesForMaterial(nextMaterialIndex);
    }

    public static imediatelySpawnAll(scene: Scene) {
        console.log('Initial biome setup')
        const sphere = scene.getMeshByName('planet') as Mesh;
        this.sphere = sphere; // Ensure sphere is set
        const materialIndex = this.startWithMaterial;
        
        // Set material index to the starting biome
        Materials.changeActiveMaterial(materialIndex);
        
        // Apply the initial material directly and ensure it's properly refreshed
        const material = Materials.getActiveMaterial();
        sphere.material = material;
        sphere.material.wireframe = true;
        
        // Force material to refresh by marking it as dirty
        if (sphere.material) {
            sphere.material.markAsDirty(Material.AllDirtyFlag);
            console.log('Material applied and refreshed:', sphere.material.name);
        }
        
        // Place meshes for the initial material
        MeshPlacementManager.placeMeshesForMaterial(materialIndex);

        this.transitionRunning = true;
        this.facesProcessedBefore = this.processedFaces;
        this.transitionRunning = false;
    }

    private static resetVariables(materialIndex? :number): void {
        this.transitionRunning = false;
        this.processedFaces = [];
        this.facesProcessedBefore = [];
        
        if (this.sphere) {
            // Simply apply the next material directly to the sphere
            const nextMaterialIndex = materialIndex !== undefined ? materialIndex : Materials.getNextActiveMaterial();
            
            // Clear any existing submeshes (for cleanup)
            if (this.sphere.subMeshes.length > 0) {
                this.sphere.subMeshes.forEach(submesh => {
                    submesh.dispose();
                });
                this.sphere.subMeshes = [];
            }
            
            // Apply the next material directly
            const material = Materials.get(nextMaterialIndex);
            this.sphere.material = material;
            
            // Ensure material is properly applied and visible
            if (this.sphere.material) {
                // Use type checking to apply the appropriate markAsDirty method
                if (this.sphere.material instanceof StandardMaterial) {
                    this.sphere.material.markAsDirty(Material.AllDirtyFlag);
                } else if (this.sphere.material instanceof PBRMaterial) {
                    this.sphere.material.markAsDirty(Material.AllDirtyFlag);
                }
                console.log('Material updated during transition:', this.sphere.material.name);
            }
        
            if (this.debug && this.sphere) {
                const scene = this.sphere.getScene();
                scene.meshes
                    .filter(mesh => mesh.name.startsWith("highlight"))
                    .forEach(mesh => mesh.dispose());
            }
        }
    }

    public static dispose(): void {
        // Clear all instances
        MeshPlacementManager.dispose();
        
        if (this.debug && this.sphere) {
            const scene = this.sphere.getScene();
            scene.meshes
                .filter(mesh => mesh.name.startsWith("highlight"))
                .forEach(mesh => mesh.dispose());
        }
        
        this.processedFaces = [];
        this.facesProcessedBefore = [];
    }
}
