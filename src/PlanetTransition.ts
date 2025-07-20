import {
    Scene,
    Vector3,
    Mesh,
    Material,
    StandardMaterial,
    PBRMaterial
} from '@babylonjs/core'
import { Materials } from './Materials';
import { MeshPlacementManager } from './MeshPlacementManager';

export class PlanetTransition {
    public static transitionRunning: boolean = false;
    public static sphere: Mesh;
    private static startWithMaterial: number = 3;

    constructor(sphere: Mesh, debug: boolean = false) {
        PlanetTransition.sphere = sphere;
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
        this.sphere = sphere;
        
        MeshPlacementManager.clearInstances(Materials.getActiveMaterialIndex());
        Materials.changeActiveMaterial();
        sphere.material = Materials.getActiveMaterial();
        sphere.material.wireframe = true;
        
        const nextMaterialIndex = Materials.getActiveMaterialIndex();
        MeshPlacementManager.placeMeshesForMaterial(nextMaterialIndex);
    }

    public static imediatelySpawnAll(scene: Scene): void {
        console.log('Initial biome setup');
        const sphere = scene.getMeshByName('planet') as Mesh;
        this.sphere = sphere;
        const materialIndex = this.startWithMaterial;
        
        Materials.changeActiveMaterial(materialIndex);
        const material = Materials.getActiveMaterial();
        sphere.material = material;
        sphere.material.wireframe = true;
        
        if (sphere.material) {
            sphere.material.markAsDirty(Material.AllDirtyFlag);
        }
        
        MeshPlacementManager.placeMeshesForMaterial(materialIndex);
        this.transitionRunning = false;
    }

    public static dispose(): void {
        MeshPlacementManager.dispose();
    }
}
