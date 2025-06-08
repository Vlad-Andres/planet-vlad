import {
    Scene,
    Vector3,
    MeshBuilder,
    Color4,
    ArcRotateCamera,
    VertexBuffer,
    SubMesh,
    Mesh,
    Matrix,
    IndicesArray,
    InstancedMesh,
    MultiMaterial,
    StandardMaterial,
    Texture,
    Color3,
    Material,
    PBRMaterial
} from '@babylonjs/core'
import { Materials } from './Materials';
import { FurMaterial } from '@babylonjs/materials';
import { MeshPlacementManager } from './MeshPlacementManager';

interface MaterialMeshAssociation {
    materialIndex: number
    meshTemplate: Mesh | null
    instances: InstancedMesh[]
    density: number
    verticalOffset: number
    isLandmark: boolean
}

interface RandomPositionData {
    position: Vector3
    liftedPosition: Vector3
    rotationMatrix: Matrix
    isTooClose: boolean
}
// TODO: make the landmark the gate to the next biome
export class PlanetTransition {
    public static transitionRunning: boolean = false
    public static currentlyHiding: boolean = false
    public static processedFaces: number[] = []
    public static facesProcessedBefore: number[] = []
    public static sphere: Mesh
    public static debug: boolean = false
    private static materialAssociations: MaterialMeshAssociation[] = [];
    private static busyPositions: Map<Vector3, number> = new Map(); // position to indice number localted there
    private static INSTANCE_FREE_RADIUS = 5
    private static oldLandmark: Mesh | undefined = undefined
    private static currentLandmark: Mesh | undefined = undefined
    private static startWithMaterial: number = 1

    public static getCurrentLandmark(): Mesh | undefined {
        return this.currentLandmark;
    }

    constructor(sphere: Mesh, debug: boolean) {
        // Apply the active material directly to the sphere
        // sphere.material = Materials.getActiveMaterial();
        
        // // Force material to refresh by marking it as dirty
        // if (sphere.material) {
        //     sphere.material.markAsDirty(Material.AllDirtyFlag);
        // }
        
        // We'll let the Materials class handle the fur material creation
        // through its materialCallback system instead of creating it here
        
        PlanetTransition.sphere = sphere;
        PlanetTransition.debug = debug;
        new MeshPlacementManager(sphere);
    }

    public static registerMaterialMeshAssociation(
        materialIndex: number,
        meshTemplate: Mesh,
        density: number = 5, // Increased default density from 1 to 5
        verticalOffset: number = 4 // Increased default vertical offset from 2 to 4
    ): void {
        this.materialAssociations.push({
            materialIndex,
            meshTemplate,
            instances: [],
            density,
            verticalOffset,
            isLandmark: false
        });
    }

    public static registerMaterialMainLandmark(
        materialIndex: number,
        meshTemplate: Mesh,
        verticalOffset: number = 4 // Increased default vertical offset from 2 to 4
    ): void {
        const density = 0
        this.materialAssociations.push({
            materialIndex,
            meshTemplate,
            instances: [],
            density,
            verticalOffset,
            isLandmark: true
        })
    }

    private static addMainLandmark(
        association: MaterialMeshAssociation,
        positions: Vector3[],
    ): void {
        // Maximum number of attempts to find a valid position
        const MAX_ATTEMPTS = 50;
        let attempts = 0;
        let positionData;
        
        // Get player position from the scene
        const scene = this.sphere.getScene();
        const player = scene.getMeshByName('player') as Mesh;
        const playerPosition = player ? player.position : null;
        const MIN_PLAYER_DISTANCE = 10; // Minimum distance from player
        
        // Keep trying to find a valid position until we succeed or run out of attempts
        do {
            positionData = this.getRandomPosition(positions, association.verticalOffset, 16);
            attempts++;
            
            // If we've tried too many times, adjust the spacing requirements
            if (attempts > MAX_ATTEMPTS / 2) {
                positionData = this.getRandomPosition(positions, association.verticalOffset, 8); // Try with smaller spacing
            }
        } while ((positionData.isTooClose || (playerPosition && Vector3.Distance(positionData.liftedPosition, playerPosition) < MIN_PLAYER_DISTANCE)) && attempts < MAX_ATTEMPTS);
        
        // If we still couldn't find a position, force placement at the last attempted position
        if (positionData.isTooClose) {
            console.warn('Could not find optimal landmark position, forcing placement');
        }
        
        const scale = 1;
        const scaleMatrix = Matrix.Scaling(scale, scale, scale);
        const transitionMatrix = scaleMatrix
            .multiply(positionData.rotationMatrix)
            .multiply(Matrix.Translation(
                positionData.liftedPosition.x,
                positionData.liftedPosition.y,
                positionData.liftedPosition.z
            ));
        
        const meshTemplate = association.meshTemplate!;
        meshTemplate.setEnabled(true);
        this.busyPositions.set(positionData.liftedPosition, meshTemplate.thinInstanceAdd(transitionMatrix));
        this.oldLandmark = meshTemplate;
        this.currentLandmark = meshTemplate;
        association.meshTemplate = null;
    }

    private static generateRandomPositionsOnSphere(sphere: Mesh, count: number): Vector3[] {
        const positions: Vector3[] = [];
        const radius = sphere.scaling.x * 4; // Assuming sphere radius is 4 units
        
        for (let i = 0; i < count; i++) {
            // Generate random spherical coordinates
            const theta = Math.random() * Math.PI * 2; // Azimuthal angle (0 to 2π)
            const phi = Math.acos(2 * Math.random() - 1); // Polar angle (0 to π)
            
            // Convert to Cartesian coordinates
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            // Create position vector and add to array
            const position = new Vector3(x, y, z);
            positions.push(position);
        }
        
        return positions;
    }
    
    private static getRandomPosition(
        positions: Vector3[], 
        verticalOffset: number, 
        tooCloseMargin = this.INSTANCE_FREE_RADIUS
    ): RandomPositionData {
        const randomIndex = Math.floor(Math.random() * positions.length);
        const randomPosition = positions[randomIndex];
        const positionNormal = randomPosition.normalize(); // Direction from center to position
        const rotationMatrix = Matrix.Identity();
        const up = Vector3.Up();
        const angle = Math.acos(Vector3.Dot(up, positionNormal));
        const axis = Vector3.Cross(up, positionNormal).normalize();
        
        if (angle !== 0) {
            Matrix.RotationAxisToRef(axis, angle, rotationMatrix);
        }
    
        // Calculate lifted position using position normal
        const surfaceOffset = verticalOffset;
        const liftedPosition = randomPosition.add(positionNormal.scale(surfaceOffset));

        const isTooClose = Array.from(this.busyPositions.keys()).some(existingPos =>
            Vector3.Distance(existingPos, liftedPosition) < tooCloseMargin
        );
    
        return {
            position: randomPosition,
            liftedPosition,
            rotationMatrix,
            isTooClose
        };
    }

    private static removeThinInstancesFromPreviousMaterial(visibleVertices: Vector3[]): void {
        for(const association of this.materialAssociations) {
            if (association.materialIndex !== Materials.getActiveMaterialIndex()) {
                continue;
            }
            
            if (association.meshTemplate) {
                association.meshTemplate.thinInstanceCount = 0;
                association.meshTemplate.setEnabled(false);
            }
            
            association.instances.forEach(instance => {
                instance.dispose(true, true);
            });
            association.instances = [];
        }
        
        this.busyPositions.clear();
        
        if (this.oldLandmark) {
            this.oldLandmark.thinInstanceCount = 0;
            this.oldLandmark.setEnabled(false);
            this.oldLandmark = undefined;
        }
    }

    private static addThinInstancesForAssociation(
        association: MaterialMeshAssociation,
        positions: Vector3[],
    ): void {
        let i = 0
        while(i < association.density) {
            const positionData = this.getRandomPosition(positions, association.verticalOffset)

            if (positionData.isTooClose) {
                i+= 0.5
                continue;
            }
            i++;

            const scale = 1;
            const scaleMatrix = Matrix.Scaling(scale, scale, scale);
            const transitionMatrix = scaleMatrix
                .multiply(positionData.rotationMatrix)
                .multiply(Matrix.Translation(
                    positionData.liftedPosition.x,
                    positionData.liftedPosition.y,
                    positionData.liftedPosition.z
                ));

            this.busyPositions.set(positionData.position, association.meshTemplate!.thinInstanceAdd(transitionMatrix));
        }
    }

    private static addAllThinInstancesForAssociation(
        association: MaterialMeshAssociation,
        positions: Vector3[],
    ): void {
        console.log('Adding thin instances for association !');
            this.addThinInstancesForAssociation(association, positions);
    }

    public static do(scene: Scene): void {
        const sphere = scene.getMeshByName('planet') as Mesh;
        this.sphere = sphere; // Ensure sphere is set
        
        // Set transition flag
        // this.transitionRunning = true;
        
        // Remove all existing mesh instances from the current biome
        this.removeThinInstancesFromPreviousMaterial([]);
        
        // Update the material index to the next biome
        Materials.changeActiveMaterial();
        sphere.material = Materials.getActiveMaterial();
        sphere.material.wireframe = true;
        
        // Generate random positions on the sphere surface for placing meshes
        const randomPositions = this.generateRandomPositionsOnSphere(sphere, 100); // Increased from 50 to 100 positions
        
        // Get the next material index
        const nextMaterialIndex = Materials.getActiveMaterialIndex();

        // Reset all mesh templates to their initial state
        this.materialAssociations.forEach(association => {
            if (association.meshTemplate) {
                association.meshTemplate.thinInstanceCount = 0;
                association.meshTemplate.setEnabled(true);
            }
        });
        
        // First pass: Add landmarks for the new biome
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== nextMaterialIndex || !association.isLandmark) {
                continue;
            }
            
            if (association.meshTemplate != null) {
                this.addMainLandmark(association, randomPositions);
            }
        }
        
        // Second pass: Add other meshes for the new biome
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== nextMaterialIndex || association.isLandmark) {
                continue;
            }
            
            if (association.density !== 0) {
                this.addThinInstancesForAssociation(association, randomPositions);
            }
        }
        
        // Apply the new material directly
        
        // Complete the transition
        // this.resetVariables(nextMaterialIndex);
    }

    public static imediatelySpawnAll(scene: Scene) {
        console.log('Initial biome setup')
        const sphere = scene.getMeshByName('planet') as Mesh;
        this.sphere = sphere; // Ensure sphere is set
        const materialIndex = this.startWithMaterial;
        // Set material index to 0 (grass biome) before spawning
        // This ensures we start with the grass biome (index 0 in BiomeManager)
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
        
        // Reset all mesh templates to their initial state
        this.materialAssociations.forEach(association => {
            if (association.meshTemplate) {
                association.meshTemplate.thinInstanceCount = 0;
                association.meshTemplate.setEnabled(true);
            }
        });

        // Generate random positions on the sphere surface for placing meshes
        const randomPositions = this.generateRandomPositionsOnSphere(sphere, 200); // Increased from 100 to 200 positions

        // First pass: Add landmarks only for the initial biome (index 0)
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== materialIndex) {
                continue;
            }
            
            if (association.density === 0 && association.meshTemplate != null) {
                this.addMainLandmark(association, randomPositions);
            }
        }

        // Second pass: Add other meshes for the initial biome
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== materialIndex) {
                continue;
            }
            
            if (association.density !== 0) {
                this.addAllThinInstancesForAssociation(association, randomPositions);
            }
        }

        this.transitionRunning = true;
        this.facesProcessedBefore = this.processedFaces;
        this.transitionRunning = false;
        // this.resetVariables();
    }

    // public static transitHiddenFaces(scene: Scene): void {
    //     console.log("Starting immediate transition");
        
    //     // Simply call the start method which now handles the entire transition
    //     this.do(scene);
        
    //     console.log("Transition complete");
    // }


    private static resetVariables(materialIndex? :number): void {
        this.transitionRunning = false;
        this.processedFaces = [];
        this.facesProcessedBefore = [];
        
        if (this.sphere) {
            // Simply apply the next material directly to the sphere
            // No need for submeshes or MultiMaterial anymore
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
            
            this.busyPositions.clear();
        }
    }

    public static dispose(): void {

        this.removeThinInstancesFromPreviousMaterial([]);
        
        if (this.debug && this.sphere) {
            const scene = this.sphere.getScene();
            scene.meshes
                .filter(mesh => mesh.name.startsWith("highlight"))
                .forEach(mesh => mesh.dispose());
        }
        
        this.processedFaces = [];
        this.facesProcessedBefore = [];
        this.materialAssociations = [];
        this.busyPositions.clear();
        this.oldLandmark = undefined;
    }
    
}
