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
    private static currentLandmark: Mesh | undefined = undefined;
    private static oldLandmark: Mesh | undefined = undefined;
    private static sphere: Mesh;
    private static scene: Scene;
    private static usedPositionIndices: Set<number> = new Set();
    private static busyPositions: Map<Vector3, number> = new Map();
    private static readonly INSTANCE_FREE_RADIUS = 8;
    private static readonly MIN_PLAYER_DISTANCE = 20;
    private static readonly MIN_LANDMARK_DISTANCE = 25;
    
    // Density-aware configuration
    private static readonly HIGH_DENSITY_THRESHOLD = 10;
    private static readonly LOW_DENSITY_THRESHOLD = 3;
    private static readonly LOW_DENSITY_RADIUS_MULTIPLIER = 0.5; // Relax spacing for low density
    private static readonly HIGH_DENSITY_RADIUS_MULTIPLIER = 1.2; // Tighter spacing for high density
    
    // Lightweight clustering configuration (per-association, in-memory)
    // Enables grouping of same-type meshes with minimal overhead
    private static readonly CLUSTERING_ENABLED = true;
    private static readonly CLUSTER_STRENGTH = 1; // Probability to bias toward clusters when available
    private static readonly CLUSTER_SAMPLE_CANDIDATES = 48; // Number of candidate indices to sample near a center
    private static readonly CLUSTER_RADIUS_FACTOR = 0.4; // Search radius around a cluster center relative to instance radius
    
    // Dynamic distance helpers based on sphere size
    private static getSphereRadius(): number {
        return this.sphere ? this.sphere.scaling.x * 4 : 4;
    }
    
    private static getPlayerSafeDistance(): number {
        const r = this.getSphereRadius();
        return Math.max(4, r * 1.25); // scale with planet size
    }
    
    private static getLandmarkMinDistance(): number {
        const r = this.getSphereRadius();
        return Math.max(6, r * 1.5);
    }
    
    private static getBaseInstanceFreeRadius(): number {
        const r = this.getSphereRadius();
        return Math.max(2, r * 0.7);
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
        this.materialAssociations.push({
            materialIndex,
            meshTemplate,
            instances: [],
            density: 0,
            verticalOffset,
            isLandmark: true
        });
    }
    
    public static addMainLandmark(
        association: MaterialMeshAssociation,
        positions: Vector3[],
    ): void {
        const player = this.scene.getMeshByName('player') as Mesh;
        const playerPosition = player ? player.position : null;
        
        const playerSafe = this.getPlayerSafeDistance();
        const landmarkMin = this.getLandmarkMinDistance();
        
        let positionData: RandomPositionData | null = null;
        let attempts = 0;
        const MAX_ATTEMPTS = 300;
        
        while (attempts < MAX_ATTEMPTS) {
            const candidate = this.getRandomPositionFarFromUsed(positions, association.verticalOffset, landmarkMin);
            attempts++;
            // Check player safe radius
            if (playerPosition && Vector3.Distance(candidate.liftedPosition, playerPosition) < playerSafe) {
                continue;
            }
            // Check against other busy positions to avoid overlap with other meshes
            if (this.isTooCloseToExisting(candidate.liftedPosition, landmarkMin)) {
                continue;
            }
            positionData = candidate;
            break;
        }
        
        // Fallback if no valid position found: still respect overlap, but relax player safe to ensure landmark presence
        if (!positionData) {
            let fallbackAttempts = 0;
            while (fallbackAttempts < MAX_ATTEMPTS) {
                const candidate = this.getRandomPositionFarFromUsed(positions, association.verticalOffset, Math.max(landmarkMin * 0.8, 4));
                fallbackAttempts++;
                // Keep a minimal safety around player even in fallback
                if (playerPosition && Vector3.Distance(candidate.liftedPosition, playerPosition) < Math.max(4, playerSafe * 0.6)) {
                    continue;
                }
                if (this.isTooCloseToExisting(candidate.liftedPosition, Math.max(landmarkMin * 0.9, 4))) {
                    continue;
                }
                positionData = candidate;
                break;
            }
        }
        
        if (positionData) {
            const transitionMatrix = this.createTransformationMatrix(positionData, 1);
            this.busyPositions.set(positionData.liftedPosition, association.meshTemplate!.thinInstanceAdd(transitionMatrix));
            this.currentLandmark = association.meshTemplate!;
            this.oldLandmark = association.meshTemplate!;
        }
    }
    
    public static addThinInstancesForAssociation(
        association: MaterialMeshAssociation,
        positions: Vector3[],
    ): void {
        const player = this.scene.getMeshByName('player') as Mesh;
        const playerPosition = player ? player.position : null;
        const MAX_ATTEMPTS = 200;
        
        // Adjust spacing based on density
        let spacingMultiplier = 1;
        if (association.density >= this.HIGH_DENSITY_THRESHOLD) spacingMultiplier = this.HIGH_DENSITY_RADIUS_MULTIPLIER;
        else if (association.density <= this.LOW_DENSITY_THRESHOLD) spacingMultiplier = this.LOW_DENSITY_RADIUS_MULTIPLIER;
        const baseRadius = this.getBaseInstanceFreeRadius();
        const instanceFreeRadius = baseRadius * spacingMultiplier;
        const playerSafe = this.getPlayerSafeDistance();

        // Local cluster centers for this association only (kept small for performance)
        const clusterCenters: Vector3[] = [];
        
        let placed = 0;
        let attempts = 0;
        while (placed < association.density && attempts < MAX_ATTEMPTS * Math.max(1, association.density)) {
            let candidate: RandomPositionData;
            const useCluster = this.CLUSTERING_ENABLED && clusterCenters.length > 0 && Math.random() < this.CLUSTER_STRENGTH;
            if (useCluster) {
                candidate = this.getClusterBiasedPosition(positions, association.verticalOffset, instanceFreeRadius, clusterCenters);
            } else {
                candidate = this.getRandomPositionFarFromUsed(positions, association.verticalOffset, instanceFreeRadius);
            }
            
            attempts++;
            // Keep meshes away from player
            if (playerPosition && Vector3.Distance(candidate.liftedPosition, playerPosition) < playerSafe) {
                continue;
            }
            // Avoid overlap with existing instances
            if (this.isTooCloseToExisting(candidate.liftedPosition, instanceFreeRadius)) {
                continue;
            }

            const transitionMatrix = this.createTransformationMatrix(candidate, 1);
            this.busyPositions.set(candidate.liftedPosition, association.meshTemplate!.thinInstanceAdd(transitionMatrix));

            // Seed or expand clusters cheaply
            if (clusterCenters.length < 3 || Math.random() < 0.25) {
                clusterCenters.push(candidate.liftedPosition.clone());
                if (clusterCenters.length > 12) clusterCenters.shift();
            }
            
            placed++;
        }
    }
    
    public static getRandomPositionFarFromUsed(
        positions: Vector3[], 
        verticalOffset: number, 
        minDistanceBetweenPositions?: number
    ): RandomPositionData {
        const sphereRadius = this.sphere.scaling.x * 4;
        const desiredPhysicalDistance = minDistanceBetweenPositions || this.INSTANCE_FREE_RADIUS;
        const sphereCircumference = 2 * Math.PI * sphereRadius;
        const minIndexDistance = Math.max(1, Math.floor((desiredPhysicalDistance / sphereCircumference) * positions.length));
        
        let bestIndex = -1;
        let bestScore = -Infinity;
        const tryCount = 64;
        
        for (let i = 0; i < tryCount; i++) {
            const idx = Math.floor(Math.random() * positions.length);
            const score = this.distanceScoreToUsedIndices(idx);
            if (score > bestScore && !this.isIndexTooCloseToUsed(idx, minIndexDistance)) {
                bestScore = score;
                bestIndex = idx;
            }
        }
        
        // fallback if we didn't find a good index in sampling
        const randomIndex = bestIndex !== -1 ? bestIndex : Math.floor(Math.random() * positions.length);
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
    
        const liftedPosition = randomPosition.add(positionNormal.scale(verticalOffset));
    
        return {
            position: randomPosition,
            liftedPosition,
            rotationMatrix,
        };
    }

    // Returns a position sampled near existing cluster centers, falling back to random if none suitable
    private static getClusterBiasedPosition(
        positions: Vector3[],
        verticalOffset: number,
        minDistanceBetweenPositions: number,
        clusterCenters: Vector3[],
    ): RandomPositionData {
        const sphereRadius = this.sphere.scaling.x * 4;
        const sphereCircumference = 2 * Math.PI * sphereRadius;
        const minIndexDistance = Math.max(1, Math.floor((minDistanceBetweenPositions / sphereCircumference) * positions.length));
        const searchRadius = Math.max(minDistanceBetweenPositions, minDistanceBetweenPositions * this.CLUSTER_RADIUS_FACTOR);

        // Pick a random existing cluster center
        const center = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];

        // Try a limited number of random indices near the center
        const sampleCount = Math.min(this.CLUSTER_SAMPLE_CANDIDATES, positions.length);
        for (let i = 0; i < sampleCount; i++) {
            const idx = Math.floor(Math.random() * positions.length);
            const pos = positions[idx];
            if (Vector3.Distance(pos, center) > searchRadius) continue;
            if (this.isIndexTooCloseToUsed(idx, minIndexDistance)) continue;

            // Accept this index
            this.usedPositionIndices.add(idx);

            const positionNormal = pos.normalize();
            const rotationMatrix = Matrix.Identity();
            const up = Vector3.Up();
            const angle = Math.acos(Vector3.Dot(up, positionNormal));
            const axis = Vector3.Cross(up, positionNormal).normalize();
            if (angle !== 0) {
                Matrix.RotationAxisToRef(axis, angle, rotationMatrix);
            }
            const liftedPosition = pos.add(positionNormal.scale(verticalOffset));
            return {
                position: pos,
                liftedPosition,
                rotationMatrix,
            };
        }

        // Fallback to the default sampler if no suitable clustered candidate was found
        return this.getRandomPositionFarFromUsed(positions, verticalOffset, minDistanceBetweenPositions);
    }
    
    private static isIndexTooCloseToUsed(index: number, minDistance: number): boolean {
        for (const usedIndex of this.usedPositionIndices) {
            const directDistance = Math.abs(index - usedIndex);
            if (directDistance < minDistance) {
                return true;
            }
        }
        return false;
    }
    
    public static generateRandomPositionsOnSphere(sphere: Mesh, count: number): Vector3[] {
        const positions: Vector3[] = [];
        const radius = sphere.scaling.x * 4;
        
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            positions.push(new Vector3(x, y, z));
        }
        
        return positions;
    }
    
    public static clearInstances(materialIndex?: number): void {
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
        this.usedPositionIndices.clear();
        
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
        
        let totalPositionsNeeded = 0;
        
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== materialIndex) continue;
            
            if (association.isLandmark && association.meshTemplate) {
                totalPositionsNeeded += 1;
            } else if (association.density > 0 && association.meshTemplate) {
                totalPositionsNeeded += association.density;
            }
        }
        
        const MIN_POSITIONS = Math.max(totalPositionsNeeded * 8, 200);
        const randomPositions = this.generateRandomPositionsOnSphere(this.sphere, MIN_POSITIONS);
        
        this.usedPositionIndices.clear();
        
        this.materialAssociations.forEach(association => {
            if (association.materialIndex === materialIndex && association.meshTemplate) {
                association.meshTemplate.thinInstanceCount = 0;
                association.meshTemplate.setEnabled(true);
            }
        });
        
        // Place landmarks first
        let landmarkPlaced = false;
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== materialIndex || !association.isLandmark || landmarkPlaced) {
                continue;
            }
            
            if (association.meshTemplate != null) {
                this.addMainLandmark(association, randomPositions);
                landmarkPlaced = true;
            }
        }
        
        // Place other meshes
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
        this.usedPositionIndices.clear();
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
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        if (!positions) return;
        const indices = mesh.getIndices();
        if (!indices) return;
        const sphereRadius = sphere.scaling.x * 4;
    
        const updatedPositions = positions.slice();
        for (let i = 0; i < positions.length; i += 3) {
            const pos = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
            const normal = pos.normalize();
            const newPos = normal.scale(sphereRadius);
            updatedPositions[i] = newPos.x;
            updatedPositions[i + 1] = newPos.y;
            updatedPositions[i + 2] = newPos.z;
        }
        
        const vertexData = new VertexData();
        vertexData.positions = updatedPositions;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);
    }
    
    private static isTooCloseToExisting(position: Vector3, minDistance: number): boolean {
        for (const [pos] of this.busyPositions.entries()) {
            if (Vector3.Distance(pos, position) < minDistance) {
                return true;
            }
        }
        return false;
    }
    
    private static distanceScoreToUsedIndices(index: number): number {
        // Score based on distance to already used indices (prefer farther indices)
        if (this.usedPositionIndices.size === 0) return 1;
        let minDist = Infinity;
        for (const usedIndex of this.usedPositionIndices) {
            const d = Math.abs(index - usedIndex);
            if (d < minDist) minDist = d;
        }
        return minDist;
    }
}