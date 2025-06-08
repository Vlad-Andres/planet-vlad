import {
    Scene,
    Vector3,
    Mesh,
    Matrix,
    InstancedMesh,
    Material,
    VertexBuffer,
    VertexData
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
    private static usedPositionIndices: Set<number> = new Set();
    
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
        // Get player position from the scene
        const player = this.scene.getMeshByName('player') as Mesh;
        const playerPosition = player ? player.position : null;
        const MIN_PLAYER_DISTANCE = 10; // Minimum distance from player
        
        let positionData;
        let attempts = 0;
        const MAX_ATTEMPTS = 50;
        
        do {
            positionData = this.getRandomPositionFarFromUsed(positions, association.verticalOffset, 16);
            attempts++;
        } while (
            playerPosition && 
            Vector3.Distance(positionData.liftedPosition, playerPosition) < MIN_PLAYER_DISTANCE &&
            attempts < MAX_ATTEMPTS
        );
        
        const scale = 1;
        const transitionMatrix = this.createTransformationMatrix(positionData, scale);
        
        const meshTemplate = association.meshTemplate!;
        this.conformMeshToSphere(meshTemplate, this.sphere)
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
        
        while(i < association.density) {            
            const positionData = this.getRandomPositionFarFromUsed(positions, association.verticalOffset);
            
            const scale = 1;
            const transitionMatrix = this.createTransformationMatrix(positionData, scale);
            this.busyPositions.set(positionData.liftedPosition, association.meshTemplate!.thinInstanceAdd(transitionMatrix));
            
            i++;
        }
    }
    
    /**
     * Get a random position that's far from previously used positions
     * @param positions Available positions array
     * @param verticalOffset Vertical offset for lifting the position
     * @param minDistanceBetweenPositions Minimum distance between position indices (default based on INSTANCE_FREE_RADIUS)
     * @returns RandomPositionData for the selected position
     */
    public static getRandomPositionFarFromUsed(
        positions: Vector3[], 
        verticalOffset: number, 
        minDistanceBetweenPositions?: number
    ): RandomPositionData {
        // Calculate minimum index distance based on sphere size and desired physical distance
        const sphereRadius = this.sphere.scaling.x * 4;
        const desiredPhysicalDistance = minDistanceBetweenPositions || this.INSTANCE_FREE_RADIUS;
        
        // Estimate how many positions apart we need based on sphere circumference
        const sphereCircumference = 2 * Math.PI * sphereRadius;
        const minIndexDistance = Math.max(1, Math.floor((desiredPhysicalDistance / sphereCircumference) * positions.length));
        
        let randomIndex: number;
        let attempts = 0;
        const MAX_ATTEMPTS = 100;
        
        do {
            randomIndex = Math.floor(Math.random() * positions.length);
            attempts++;
            
            // If we've tried many times and still can't find a good position, 
            // just use any position (fallback to prevent infinite loop)
            if (attempts > MAX_ATTEMPTS) {
                break;
            }
        } while (this.isIndexTooCloseToUsed(randomIndex, minIndexDistance) && attempts < MAX_ATTEMPTS);
        
        // Mark this index as used
        this.usedPositionIndices.add(randomIndex);
        
        const randomPosition = positions[randomIndex];
        const positionNormal = randomPosition.normalize();
        const rotationMatrix = Matrix.Identity();
        const up = Vector3.Up();
        const angle = Math.acos(Vector3.Dot(up, positionNormal));
        const axis = Vector3.Cross(up, positionNormal).normalize();
        
        if (angle !== 0) {
            Matrix.RotationAxisToRef(axis, angle, rotationMatrix);
        }
    
        const surfaceOffset = verticalOffset;
        const liftedPosition = randomPosition.add(positionNormal.scale(surfaceOffset));
    
        return {
            position: randomPosition,
            liftedPosition,
            rotationMatrix,
        };
    }
    
    /**
     * Check if a position index is too close to any previously used indices
     * @param index The index to check
     * @param minDistance Minimum distance between indices
     * @returns true if the index is too close to used ones
     */
    private static isIndexTooCloseToUsed(index: number, minDistance: number): boolean {
        for (const usedIndex of this.usedPositionIndices) {
            // Check both direct distance and wraparound distance (since it's a sphere)
            const directDistance = Math.abs(index - usedIndex);
            const wraparoundDistance = Math.min(directDistance, this.usedPositionIndices.size - directDistance);
            
            if (wraparoundDistance < minDistance) {
                return true;
            }
        }
        return false;
    }
    
    public static addAllThinInstancesForAssociation(
        association: MaterialMeshAssociation,
        positions: Vector3[],
    ): void {
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
        this.usedPositionIndices.clear(); // Clear used position indices
        
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
                totalPositionsNeeded += 1;
            } else if (association.density > 0 && association.meshTemplate) {
                totalPositionsNeeded += association.density;
            }
        }
        
        // Generate more positions than needed to ensure good distribution
        // The spacing algorithm works better with more positions to choose from
        const MIN_POSITIONS = Math.max(totalPositionsNeeded * 8, 200);
        const randomPositions = this.generateRandomPositionsOnSphere(this.sphere, MIN_POSITIONS);
        
        // Clear used position indices for this new placement session
        this.usedPositionIndices.clear();
        
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
        this.usedPositionIndices.clear(); // Clear used position indices
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

    private static conformMeshToSphere(mesh: Mesh, sphere: Mesh): void {
        const sphereRadius = sphere.scaling.x * 4; // Assuming your sphere radius
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        
        if (positions) {
            // Get the mesh's world matrix to transform vertices to world space
            const worldMatrix = mesh.getWorldMatrix();
            let changedVertices = 0;
            for (let i = 0; i < positions.length; i += 3) {
                // Get vertex position
                let vertex = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
                
                // Transform to world space
                vertex = Vector3.TransformCoordinates(vertex, worldMatrix);
                
                // Calculate distance from sphere center
                const distanceFromCenter = vertex.length();
                
                // Only deform vertices that are close to the sphere surface
                // This preserves the mesh's general shape while conforming the base
                if (distanceFromCenter < sphereRadius + 2) { // Adjust threshold as needed
                    // Project vertex onto sphere surface
                    const normalizedVertex = vertex.normalize();
                    const projectedVertex = normalizedVertex.scale(sphereRadius);
                    changedVertices++;
                    // Transform back to local space
                    const inverseWorldMatrix = worldMatrix.clone().invert();
                    const localVertex = Vector3.TransformCoordinates(projectedVertex, inverseWorldMatrix);
                    
                    positions[i] = localVertex.x;
                    positions[i + 1] = localVertex.y;
                    positions[i + 2] = localVertex.z;
                }
            }

            console.log('Changed vertices:'+ changedVertices)
            
            // Update the mesh with new positions
            mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
            
            // Recalculate normals for proper lighting
            const indices = mesh.getIndices();
            if (indices) {
                VertexData.ComputeNormals(positions, indices, mesh.getVerticesData(VertexBuffer.NormalKind));
                mesh.updateVerticesData(VertexBuffer.NormalKind, mesh.getVerticesData(VertexBuffer.NormalKind)!);
            }
        }
    }
}