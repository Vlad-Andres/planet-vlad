import {
    Scene,
    Vector3,
    Mesh,
    Matrix,
    InstancedMesh,
    Material
} from '@babylonjs/core'
import { Materials } from './Materials';

export interface MaterialMeshAssociation {
    materialIndex: number
    meshTemplate: Mesh | null
    instances: InstancedMesh[]
    density: number
    verticalOffset: number
    isLandmark: boolean
}

export interface RandomPositionData {
    position: Vector3
    liftedPosition: Vector3
    rotationMatrix: Matrix
    isTooClose: boolean
}

export class MeshPlacementManager {
    private static materialAssociations: MaterialMeshAssociation[] = [];
    private static busyPositions: Map<Vector3, number> = new Map();
    private static INSTANCE_FREE_RADIUS = 5;
    private static currentLandmark: Mesh | undefined = undefined;
    private static oldLandmark: Mesh | undefined = undefined;
    private static sphere: Mesh;
    private static scene: Scene;
    
    constructor(sphere: Mesh) {
        MeshPlacementManager.sphere = sphere;
    }
    
    public static initialize(scene: Scene, sphere: Mesh): void {
        this.scene = scene;
        this.sphere = sphere;
    }
    
    public static getCurrentLandmark(): Mesh | undefined {
        return this.currentLandmark;
    }
    
    public static registerMaterialMeshAssociation(
        materialIndex: number,
        meshTemplate: Mesh,
        density: number = 5,
        verticalOffset: number = 4
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
        verticalOffset: number = 4
    ): void {
        const density = 0;
        this.materialAssociations.push({
            materialIndex,
            meshTemplate,
            instances: [],
            density,
            verticalOffset,
            isLandmark: true
        });
    }
    
    public static addMainLandmark(
        association: MaterialMeshAssociation,
        positions: Vector3[],
    ): void {
        // Maximum number of attempts to find a valid position
        const MAX_ATTEMPTS = 50;
        let attempts = 0;
        let positionData;
        
        // Get player position from the scene
        const player = this.scene.getMeshByName('player') as Mesh;
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
    
    public static addThinInstancesForAssociation(
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
    
    public static addAllThinInstancesForAssociation(
        association: MaterialMeshAssociation,
        positions: Vector3[],
    ): void {
        console.log('Adding thin instances for association!');
        this.addThinInstancesForAssociation(association, positions);
    }
    
    public static generateRandomPositionsOnSphere(sphere: Mesh, count: number): Vector3[] {
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
    
    public static getRandomPosition(
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
    
    public static clearInstances(materialIndex?: number): void {
        // If materialIndex is provided, clear only instances for that material
        // Otherwise, clear all instances
        for(const association of this.materialAssociations) {
            if (materialIndex !== undefined && association.materialIndex !== materialIndex) {
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
    
    public static placeMeshesForMaterial(materialIndex: number, count: number = 100): void {
        if (!this.sphere) {
            console.error("MeshPlacementManager not initialized with a sphere.");
            return;
        }
        
        // Generate random positions on the sphere surface for placing meshes
        const randomPositions = this.generateRandomPositionsOnSphere(this.sphere, count);
        
        // Reset all mesh templates to their initial state for this material
        this.materialAssociations.forEach(association => {
            if (association.materialIndex === materialIndex && association.meshTemplate) {
                association.meshTemplate.thinInstanceCount = 0;
                association.meshTemplate.setEnabled(true);
            }
        });
        
        // First pass: Add landmarks for the material
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== materialIndex || !association.isLandmark) {
                continue;
            }
            
            if (association.meshTemplate != null) {
                this.addMainLandmark(association, randomPositions);
            }
        }
        
        // Second pass: Add other meshes for the material
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== materialIndex || association.isLandmark) {
                continue;
            }
            
            if (association.density !== 0) {
                this.addThinInstancesForAssociation(association, randomPositions);
            }
        }
    }
    
    public static dispose(): void {
        this.clearInstances();
        
        this.materialAssociations = [];
        this.busyPositions.clear();
        this.oldLandmark = undefined;
        this.currentLandmark = undefined;
    }
}