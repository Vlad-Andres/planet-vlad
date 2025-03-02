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
} from '@babylonjs/core'
import { Materials } from './Materials';
import { FurMaterial } from '@babylonjs/materials';

interface MaterialMeshAssociation {
    materialIndex: number
    meshTemplate: Mesh | null
    instances: InstancedMesh[]
    density: number
    verticalOffset: number
}

interface RandomVertexData {
    vertex: Vector3
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

    public static getCurrentLandmark(): Mesh | undefined {
        return this.currentLandmark;
    }

    constructor(sphere: Mesh, debug: boolean) {
        const multiMaterial = Materials.getMultiMaterial();
        sphere.material = Materials.getActiveMaterial();
        // sphere.material.wireframe= true
        
        // We'll let the Materials class handle the fur material creation
        // through its materialCallback system instead of creating it here
        
        PlanetTransition.sphere = sphere;
        PlanetTransition.debug = debug;
    }

    public static registerMaterialMeshAssociation(
        materialIndex: number,
        meshTemplate: Mesh,
        density: number = 1,
        verticalOffset: number = 2
    ): void {
        this.materialAssociations.push({
            materialIndex,
            meshTemplate,
            instances: [],
            density,
            verticalOffset
        });
    }

    public static registerMaterialMainLandmark(
        materialIndex: number,
        meshTemplate: Mesh,
        verticalOffset: number = 2
    ): void {
        const density = 0
        this.materialAssociations.push({
            materialIndex,
            meshTemplate,
            instances: [],
            density,
            verticalOffset
        })
    }

    private static processHiddenIndices(
        sphere: Mesh,
        scene: Scene,
        fromIndices: IndicesArray,
        processedFaces: number[] = []
        ): {
        visible: number[],
        faces: number[]
    } {
        this.currentlyHiding = true;
        const totalFaces = fromIndices.length / 3;
        const indices = fromIndices;
        const vertices = sphere.getVerticesData(VertexBuffer.PositionKind)!;
        const visibleIndices: number[] = [];
        const nonVisibleIndicess: number[] = [];
        const visibleFaces: number[] = []

        let nonVisibleVertices: Vector3[] = [];
        const nextMaterial = Materials.getNextActiveMaterial()
        for (let i = 0; i < totalFaces; i++) {
            const vertexIndex0 = indices[i * 3];
            const vertexIndex1 = indices[i * 3 + 1];
            const vertexIndex2 = indices[i * 3 + 2];
    
            const vertex0 = new Vector3(
                vertices[vertexIndex0 * 3],
                vertices[vertexIndex0 * 3 + 1],
                vertices[vertexIndex0 * 3 + 2]
            );
    
            const vertex1 = new Vector3(
                vertices[vertexIndex1 * 3],
                vertices[vertexIndex1 * 3 + 1],
                vertices[vertexIndex1 * 3 + 2]
            );
    
            const vertex2 = new Vector3(
                vertices[vertexIndex2 * 3],
                vertices[vertexIndex2 * 3 + 1],
                vertices[vertexIndex2 * 3 + 2]
            );
    
            const positions = [vertex0, vertex1, vertex2];
            const isVisible = this.isFaceFacingCamera(scene.activeCamera! as ArcRotateCamera, positions);
            if (!isVisible) {
                nonVisibleVertices.push(vertex0);
                nonVisibleIndicess.push(vertexIndex0, vertexIndex1, vertexIndex2);
                if (!processedFaces.includes(i)) {
                    this.changeFace(scene, sphere, i, positions, nextMaterial);
                    processedFaces.push(i);
                }
            } else {
                visibleIndices.push(vertexIndex0, vertexIndex1, vertexIndex2);
                visibleFaces.push(i)
            }
        }

        if (nonVisibleVertices.length > 0 && this.materialAssociations.length > 0) {
            // First pass: Add landmarks only
            for (const association of this.materialAssociations) {
                if (association.materialIndex !== nextMaterial) {
                    continue;
                }
                
                if (association.density === 0 && association.meshTemplate != null) {
                    this.addMainLandmark(association, nonVisibleVertices);
                }
            }

            // Second pass: Add other meshes
            for (const association of this.materialAssociations) {
                if (association.materialIndex !== nextMaterial) {
                    continue;
                }
                
                if (association.density !== 0) {
                    this.addThinInstancesForAssociation(association, nonVisibleVertices);
                }
            }
        }
        
        this.currentlyHiding = false;
        return { visible: visibleIndices, faces: processedFaces };
    }

    private static oldFacesVisible(faces: number[]): boolean {
        let oldFacesVisible = 0
        for (const face of faces) {
            if (this.facesProcessedBefore.includes(face)) {
                oldFacesVisible++
            }
        }
        return false
    }

    private static addMainLandmark(
        association: MaterialMeshAssociation,
        materialVertices: Vector3[],
    ): void {
        // Maximum number of attempts to find a valid position
        const MAX_ATTEMPTS = 50;
        let attempts = 0;
        let vertex;
        
        // Get player position from the scene
        const scene = this.sphere.getScene();
        const player = scene.getMeshByName('player') as Mesh;
        const playerPosition = player ? player.position : null;
        const MIN_PLAYER_DISTANCE = 10; // Minimum distance from player
        
        // Keep trying to find a valid position until we succeed or run out of attempts
        do {
            vertex = this.getRandomIndex(materialVertices, association.verticalOffset, 16);
            attempts++;
            
            // Check if position is too close to player
            const isTooCloseToPlayer = playerPosition && 
                Vector3.Distance(vertex.liftedPosition, playerPosition) < MIN_PLAYER_DISTANCE;
            
            // If we've tried too many times, adjust the spacing requirements
            if (attempts > MAX_ATTEMPTS / 2) {
                vertex = this.getRandomIndex(materialVertices, association.verticalOffset, 8); // Try with smaller spacing
            }
        } while ((vertex.isTooClose || (playerPosition && Vector3.Distance(vertex.liftedPosition, playerPosition) < MIN_PLAYER_DISTANCE)) && attempts < MAX_ATTEMPTS);
        
        // If we still couldn't find a position, force placement at the last attempted position
        if (vertex.isTooClose) {
            console.warn('Could not find optimal landmark position, forcing placement');
        }
        
        const scale = 1;
        const scaleMatrix = Matrix.Scaling(scale, scale, scale);
        const transitionMatrix = scaleMatrix
            .multiply(vertex.rotationMatrix)
            .multiply(Matrix.Translation(
                vertex.liftedPosition.x,
                vertex.liftedPosition.y,
                vertex.liftedPosition.z
            ));
    
        const meshTemplate = association.meshTemplate;
        if (meshTemplate) {
            meshTemplate.setEnabled(true);
            this.busyPositions.set(vertex.liftedPosition, meshTemplate.thinInstanceAdd(transitionMatrix));
            this.oldLandmark = meshTemplate;
            this.currentLandmark = meshTemplate;
            association.meshTemplate = null;
        }
    }

    private static getRandomIndex(
        vertices: Vector3[], 
        verticalOffset: number, 
        tooCloseMargin = this.INSTANCE_FREE_RADIUS
    ): RandomVertexData {
        const randomIndex = Math.floor(Math.random() * vertices.length);
        const randomVertex = vertices[randomIndex];
        const vertexNormal = randomVertex.subtract(Vector3.Zero()).normalize();
        const rotationMatrix = Matrix.Identity();
        const up = Vector3.Up();
        const angle = Math.acos(Vector3.Dot(up, vertexNormal));
        const axis = Vector3.Cross(up, vertexNormal).normalize();
        
        if (angle !== 0) {
            Matrix.RotationAxisToRef(axis, angle, rotationMatrix);
        }
    
        // Calculate lifted position using vertex normal instead of direction to center
        const surfaceOffset = verticalOffset;
        const liftedPosition = randomVertex.add(vertexNormal.scale(surfaceOffset));

        const isTooClose = Array.from(this.busyPositions.keys()).some(existingPos =>
            Vector3.Distance(existingPos, liftedPosition) < tooCloseMargin
        );
    
        return {
            vertex: randomVertex,
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
        materialVertices: Vector3[],
    ): void {
        let i = 0
        while(i< association.density) {
            const vertexData = this.getRandomIndex(materialVertices, association.verticalOffset)

            if (vertexData.isTooClose) {
                i+= 0.5
                continue;
            }
            i++;

            const scale = 1;
            const scaleMatrix = Matrix.Scaling(scale, scale, scale);
            const transitionMatrix = scaleMatrix
                .multiply(vertexData.rotationMatrix)
                .multiply(Matrix.Translation(
                    vertexData.liftedPosition.x,
                    vertexData.liftedPosition.y,
                    vertexData.liftedPosition.z
                ));

            this.busyPositions.set(vertexData.vertex, association.meshTemplate!.thinInstanceAdd(transitionMatrix));
        }
    }

    private static addAllThinInstancesForAssociation(
        association: MaterialMeshAssociation,
        vertices: Vector3[],
    ): void {
        for (let i = 0; i < 10; i++) {
            this.addThinInstancesForAssociation(association, vertices);
        }
    }

    public static start(scene: Scene): void {
        const sphere = scene.getMeshByName('planet') as Mesh;
        
        // Reset all mesh templates to their initial state
        this.materialAssociations.forEach(association => {
            if (association.meshTemplate) {
                association.meshTemplate.thinInstanceCount = 0;
                association.meshTemplate.setEnabled(true);
            }
        });
        
        this.removeThinInstancesFromPreviousMaterial([]);
        this.processHiddenIndices(sphere, scene, [], []);
        this.transitionRunning = true;
    }

    public static imediatelySpawnAll(scene: Scene) {
        console.log('initial transtition')
        const sphere = scene.getMeshByName('planet') as Mesh;

        // Set material index to 0 (grass biome) before spawning
        // This ensures we start with the grass biome (index 0 in BiomeManager)
        Materials.changeActiveMaterial(0);
        
        // Reset all mesh templates to their initial state
        this.materialAssociations.forEach(association => {
            if (association.meshTemplate) {
                association.meshTemplate.thinInstanceCount = 0;
                association.meshTemplate.setEnabled(true);
            }
        });

        const vertices = this.sphere.getVerticesData(VertexBuffer.PositionKind)!;
        const materialVertices: Vector3[] = [];
        for (let i = 0; i < vertices.length; i += 3) {
            const vertex = new Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
            materialVertices.push(vertex);
        }

        // First pass: Add landmarks only
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== 0) {
                continue;
            }
            console.log('here')
            if (association.density === 0 && association.meshTemplate != null) {
                this.addMainLandmark(association, materialVertices);
            }
        }

        // Second pass: Add other meshes
        for (const association of this.materialAssociations) {
            if (association.materialIndex !== 0) {
                continue;
            }
            
            if (association.density !== 0) {
                this.addAllThinInstancesForAssociation(association, materialVertices);
            }
        }

        this.transitionRunning = true;
        this.facesProcessedBefore = this.processedFaces;
        this.transitionRunning = false;
        // this.resetVariables();
    }

    public static transitHiddenFaces(scene: Scene): void {
        const sphere = this.sphere;
        const indices = sphere.getIndices()!;
        const totalFaces = indices.length / 3;
        
        let resultOfProcessing = this.processHiddenIndices(sphere, scene, indices, this.processedFaces);
        this.processedFaces = resultOfProcessing.faces;
        if (this.processedFaces.length === totalFaces) {
            console.log("Transition complete");
            this.facesProcessedBefore = this.processedFaces;
            this.resetVariables();
            Materials.changeActiveMaterial(); // Move this after resetVariables
        }
    }

    private static changeFace(
        scene: Scene,
        sphere: Mesh,
        faceIndex: number,
        positions: Vector3[],
        materialIndex: number
    ): void {
        const indices = sphere.getIndices()!;
        const vertices = sphere.getVerticesData(VertexBuffer.PositionKind)!;
        
        if (!indices || !vertices) return;
        
        const i = faceIndex * 3;
        const nextMaterialIndex = materialIndex;
        const currentMaterialIndex = Materials.getActiveMaterialIndex();
        
        // Create new submesh with the next material
        new SubMesh(
            nextMaterialIndex,
            0,
            sphere.getTotalVertices(),
            i,
            3,
            sphere
        );

        // Only remove fur material if we're transitioning from grass (material 0)
        if (currentMaterialIndex === 0 && nextMaterialIndex !== 0) {
            sphere.material = Materials.getMultiMaterial();
        }
    
        if (this.debug) {
            MeshBuilder.CreateLines("highlight", {
                points: [...positions, positions[0]],
                colors: [
                    new Color4(1, 1, 0, 1),
                    new Color4(1, 0, 1, 1),
                    new Color4(0, 1, 0, 1),
                    new Color4(0, 0, 1, 1)
                ]
            }, scene);
        }
    }
    

    private static isFaceFacingCamera(camera: ArcRotateCamera, positions: Vector3[]): boolean {
        const edge1 = positions[1].subtract(positions[0]);
        const edge2 = positions[2].subtract(positions[0]);
        const faceNormal = Vector3.Cross(edge1, edge2).normalize();
    
        let visibleVertices = 0;
        for (const position of positions) {
            const vertexToCamera = camera.position.subtract(position).normalize();
            const vertexDotProduct = Vector3.Dot(faceNormal, vertexToCamera);
            if (vertexDotProduct < -0.1) { // Using a small threshold to ensure better visibility detection
                visibleVertices++;
            }
        }
    
        return visibleVertices > 0;
    }

    private static resetVariables(materialIndex? :number): void {
        this.transitionRunning = false;
        this.processedFaces = [];
        this.facesProcessedBefore = [];
        
        if (this.sphere) {
            const nextMaterialIndex =  Materials.getNextActiveMaterial();
            
            this.sphere.subMeshes.forEach(submesh => {
                submesh.dispose();
            });
            this.sphere.subMeshes = [];
            
            new SubMesh(
                nextMaterialIndex,
                0,
                this.sphere.getTotalVertices(),
                0,
                this.sphere.getTotalIndices(),
                this.sphere
            );
            
            this.sphere.material = Materials.getMultiMaterial();
        }
        
        if (this.debug && this.sphere) {
            const scene = this.sphere.getScene();
            scene.meshes
                .filter(mesh => mesh.name.startsWith("highlight"))
                .forEach(mesh => mesh.dispose());
        }
        
        this.busyPositions.clear();
    }
    
    

    public static dispose(): void {
        this.removeThinInstancesFromPreviousMaterial([]);
        
        if (this.sphere) {
            this.sphere.subMeshes.forEach(submesh => {
                submesh.dispose();
            });
            this.sphere.subMeshes = [];
        }
        
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
