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
    private static readonly INSTANCE_FREE_RADIUS = 5;
    
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
        const MIN_PLAYER_DISTANCE = 10;
        
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
        
        const transitionMatrix = this.createTransformationMatrix(positionData, 1);
        const meshTemplate = association.meshTemplate!;
        
        this.conformMeshToSphere(meshTemplate, this.sphere);
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
        for (let i = 0; i < association.density; i++) {            
            const positionData = this.getRandomPositionFarFromUsed(positions, association.verticalOffset);
            const transitionMatrix = this.createTransformationMatrix(positionData, 1);
            this.busyPositions.set(positionData.liftedPosition, association.meshTemplate!.thinInstanceAdd(transitionMatrix));
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
        
        let randomIndex: number;
        let attempts = 0;
        const MAX_ATTEMPTS = 100;
        
        do {
            randomIndex = Math.floor(Math.random() * positions.length);
            attempts++;
            
            if (attempts > MAX_ATTEMPTS) break;
        } while (this.isIndexTooCloseToUsed(randomIndex, minIndexDistance) && attempts < MAX_ATTEMPTS);
        
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
    
    private static isIndexTooCloseToUsed(index: number, minDistance: number): boolean {
        for (const usedIndex of this.usedPositionIndices) {
            const directDistance = Math.abs(index - usedIndex);
            const wraparoundDistance = Math.min(directDistance, this.usedPositionIndices.size - directDistance);
            
            if (wraparoundDistance < minDistance) {
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
        const sphereRadius = sphere.scaling.x * 4;
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        
        if (positions) {
            const worldMatrix = mesh.getWorldMatrix();
            
            for (let i = 0; i < positions.length; i += 3) {
                let vertex = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
                vertex = Vector3.TransformCoordinates(vertex, worldMatrix);
                const distanceFromCenter = vertex.length();
                
                if (distanceFromCenter < sphereRadius + 2) {
                    const normalizedVertex = vertex.normalize();
                    const projectedVertex = normalizedVertex.scale(sphereRadius);
                    const inverseWorldMatrix = worldMatrix.clone().invert();
                    const localVertex = Vector3.TransformCoordinates(projectedVertex, inverseWorldMatrix);
                    
                    positions[i] = localVertex.x;
                    positions[i + 1] = localVertex.y;
                    positions[i + 2] = localVertex.z;
                }
            }
            
            mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
            
            const indices = mesh.getIndices();
            if (indices) {
                VertexData.ComputeNormals(positions, indices, mesh.getVerticesData(VertexBuffer.NormalKind));
                mesh.updateVerticesData(VertexBuffer.NormalKind, mesh.getVerticesData(VertexBuffer.NormalKind)!);
            }
        }
    }
}