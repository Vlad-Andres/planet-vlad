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
        const MAX_ATTEMPTS = 100;
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
            
            // If we've tried too many times, reduce the spacing requirements gradually
            let currentSpacing = 16;
            if (attempts > MAX_ATTEMPTS * 0.3) {
                currentSpacing = 12;
            } else if (attempts > MAX_ATTEMPTS * 0.6) {
                currentSpacing = 8;
            } else if (attempts > MAX_ATTEMPTS * 0.8) {
                currentSpacing = 4;
            }
            
            if (attempts > MAX_ATTEMPTS / 2) {
                positionData = this.getRandomPosition(positions, association.verticalOffset, currentSpacing);
            }
        } while ((
            this.isPositionTooClose(positionData.liftedPosition, 16) ||
            (playerPosition && Vector3.Distance(positionData.liftedPosition, playerPosition) < MIN_PLAYER_DISTANCE)
        ) && attempts < MAX_ATTEMPTS);
        
        const scale = 1;
        const transitionMatrix = this.createTransformationMatrix(positionData, scale);
        
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
        let i = 0;
        const MAX_ATTEMPTS_PER_INSTANCE = 50;
        
        console.log('--------------------------------')
        console.log('Association density: ' + association.density)
        console.log('Association meshTemplate: ' + association.meshTemplate)
        
        while(i < association.density) {
            console.log('Adding thin instances for association! Instance: ' + (i + 1) + '/' + association.density);
            
            let attempts = 0;
            let positionData;
            let validPositionFound = false;
            
            // Keep trying to find a valid position that's not too close to existing instances
            do {
                positionData = this.getRandomPosition(positions, association.verticalOffset);
                attempts++;
                
                // Check if this position is too close to existing instances
                if (!this.isPositionTooClose(positionData.liftedPosition, this.INSTANCE_FREE_RADIUS)) {
                    validPositionFound = true;
                } else if (attempts > MAX_ATTEMPTS_PER_INSTANCE * 0.7) {
                    // If we're struggling to find a position, reduce the minimum distance requirement
                    if (!this.isPositionTooClose(positionData.liftedPosition, this.INSTANCE_FREE_RADIUS * 0.5)) {
                        validPositionFound = true;
                    }
                }
                
            } while (!validPositionFound && attempts < MAX_ATTEMPTS_PER_INSTANCE);
            
            if (validPositionFound) {
                const scale = 1;
                const transitionMatrix = this.createTransformationMatrix(positionData!, scale);
                this.busyPositions.set(positionData!.liftedPosition, association.meshTemplate!.thinInstanceAdd(transitionMatrix));
                i++; // Only increment if we successfully placed an instance
            } else {
                console.warn('Could not find valid position for instance after ' + MAX_ATTEMPTS_PER_INSTANCE + ' attempts. Skipping this instance.');
                i++; // Still increment to avoid infinite loop, but log the issue
            }
        }
    }
    
    /**
     * Check if a given position is too close to any existing instances
     * @param position The position to check
     * @param minDistance The minimum allowed distance
     * @returns true if the position is too close to existing instances
     */
    private static isPositionTooClose(position: Vector3, minDistance: number): boolean {
        for (const busyPosition of this.busyPositions.keys()) {
            const distance = Vector3.Distance(position, busyPosition);
            if (distance < minDistance) {
                return true;
            }
        }
        return false;
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
    
        return {
            position: randomPosition,
            liftedPosition,
            rotationMatrix,
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
    
    public static placeMeshesForMaterial(materialIndex: number): void {
        if (!this.sphere) {
            console.error("MeshPlacementManager not initialized with a sphere.");
            return;
        }
        
        // Calculate how many positions we actually need based on material associations
        let totalPositionsNeeded = 0;
        let needsLandmark = false;
        
        // Count how many positions we need based on density
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== materialIndex) {
                continue;
            }
            
            if (association.isLandmark && association.meshTemplate) {
                needsLandmark = true;
                totalPositionsNeeded += 1; // Only need one position for the landmark
            } else if (association.density > 0 && association.meshTemplate) {
                // Add positions for regular meshes based on density
                // Increase the buffer significantly to account for positions that might be too close
                totalPositionsNeeded += association.density * 5; // More buffer for better position selection
            }
        }
        
        // Ensure we have at least a minimum number of positions to choose from
        const MIN_POSITIONS = 100; // Increased minimum to give more position options
        totalPositionsNeeded = Math.max(totalPositionsNeeded, MIN_POSITIONS);
        
        // Generate only the positions we need
        const randomPositions = this.generateRandomPositionsOnSphere(this.sphere, totalPositionsNeeded);
        
        // Reset all mesh templates to their initial state for this material
        this.materialAssociations.forEach(association => {
            if (association.materialIndex === materialIndex && association.meshTemplate) {
                association.meshTemplate.thinInstanceCount = 0;
                association.meshTemplate.setEnabled(true);
            }
        });
        
        // First pass: Add landmarks for the material (ensuring only one is placed)
        let landmarkPlaced = false;
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== materialIndex || !association.isLandmark || landmarkPlaced) {
                continue;
            }
            
            if (association.meshTemplate != null) {
                this.addMainLandmark(association, randomPositions);
                landmarkPlaced = true; // Ensure only one landmark is placed
            }
        }
        
        // Second pass: Add other meshes for the material
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== materialIndex || association.isLandmark) {
                continue;
            }
            
            if (association.meshTemplate && association.density > 0) {
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

    private static createTransformationMatrix(positionData: RandomPositionData, scale: number = 1): Matrix {
        const scaleMatrix = Matrix.Scaling(scale, scale, scale);
        return scaleMatrix
            .multiply(positionData.rotationMatrix)
            .multiply(Matrix.Translation(
                positionData.liftedPosition.x,
                positionData.liftedPosition.y,
                positionData.liftedPosition.z
            ));
    }
}