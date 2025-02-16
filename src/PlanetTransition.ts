import {
    Scene,
    Engine,
    Vector3,
    Vector2,
    HemisphericLight,
    MeshBuilder,
    FreeCamera,
    StandardMaterial,
    Color4,
    Texture,
    Material,
    PBRMaterial,
    ArcRotateCamera,
    VertexBuffer,
    SubMesh,
    Mesh,
    MultiMaterial,
    Frustum,
    Matrix,
    Ray,
    VertexData,
    IndicesArray,
    InstancedMesh,
    Quaternion,
    Color3
} from '@babylonjs/core'
import { Materials } from './Materials';

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

/**
 * Class to run a transition from a current material to another one.
 * The new material should also be associated with some additional meshes
 */
export class PlanetTransition {
    private static transitingToIndex: number = 0
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


    constructor(sphere: Mesh, debug: boolean) {
        sphere.material = Materials.getMultiMaterial()
        // sphere.material = this.getMultiMaterial(sphere.getScene())
        PlanetTransition.sphere = sphere
        PlanetTransition.debug = debug
        // this.transitToMaterial(1)
    }

    // Add method to register meshes associated with materials
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

    /**
     * Changes the material of the hidden faces and adds meshes to the faces not visible to the camera
     * @param sphere 
     * @param scene 
     * @param fromIndices 
     * @param processedFaces 
     * @param materialIndex 
     * @returns 
     */
    private static processHiddenIndices(
        sphere: Mesh,
        scene: Scene,
        fromIndices: IndicesArray,
        processedFaces: number[] = [],
        materialIndex: number = 1
    ): {
        visible: number[],
        faces: number[]
    } {
        this.currentlyHiding = true;
        const totalFaces = fromIndices.length / 3;
        const indices = fromIndices;
        const vertices = sphere.getVerticesData(VertexBuffer.PositionKind)!;
        // const normals = sphere.getVerticesData(VertexBuffer.NormalKind)!;
        const visibleIndices: number[] = [];
        const nonVisibleIndicess: number[] = [];
        const visibleFaces: number[] = []

        let nonVisibleVertices: Vector3[] = [];
        // const nextMaterialNormals: Vector3[] = [];
    
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
                    this.changeFace(scene, sphere, i, materialIndex, positions);
                    processedFaces.push(i);
                }
            } else {
                visibleIndices.push(vertexIndex0, vertexIndex1, vertexIndex2);
                visibleFaces.push(i)
            }
        }

        // Create a single mesh instance for material 1 if we have vertices
        if (nonVisibleVertices.length > 0 && this.materialAssociations.length > 0) {
            for (const association of this.materialAssociations) {
                if (association.materialIndex !== materialIndex) {
                    continue;
                }
                
                if (association.density !== 0) {
                    this.addThinInstancesForAssociation(association, nonVisibleVertices);
                } else if (association.meshTemplate != null) {
                    this.addMainLandmark(association, nonVisibleVertices);
                }
            }
            console.log('Old faces visible -> ' + this.oldFacesVisible(visibleFaces))
            // Remove the vertices from the nextMaterialVertices array
        }
        console.log(visibleIndices.length)
        
        this.currentlyHiding = false;
        return { visible: visibleIndices, faces: processedFaces };
    }

    private static oldFacesVisible(faces: number[]): boolean {
        // Check if the face has old material
        let oldFacesVisible = 0
        for (const face of faces) {
            if (this.facesProcessedBefore.includes(face)) {
                oldFacesVisible++
            }
        }
        console.log('old faces visible = -> = ' + oldFacesVisible)
        return false
    }

    /**
     * Adds the main landmark, this is the unique mesh associated with the material and it's density is 0
     * When it's added it's template gets removed so no to add it again
     * @param association 
     * @param materialVertices 
     * @returns 
     */
    private static addMainLandmark(
        association: MaterialMeshAssociation,
        materialVertices: Vector3[],
    ): void {
        const vertex = this.getRandomIndex(materialVertices, association.verticalOffset, 16)

        if (vertex.isTooClose) {
            console.log('Skipped')
            return
        }

        // Add a scale factor
        const scale = 1; // Adjust this value to control the size
        const scaleMatrix = Matrix.Scaling(scale, scale, scale);
        const transitionMatrix = scaleMatrix
            .multiply(vertex.rotationMatrix)
            .multiply(Matrix.Translation(
                vertex.liftedPosition.x,
                vertex.liftedPosition.y,
                vertex.liftedPosition.z
            ));
        console.log('vertical' + association.verticalOffset)
        this.busyPositions.set(vertex.liftedPosition, association.meshTemplate!.thinInstanceAdd(transitionMatrix));
        this.oldLandmark = association.meshTemplate ?? undefined
        association.meshTemplate = null
    }

    /**
     * Helper function that gets the random index from the given set of vertices
     * @param vertices 
     * @param verticalOffset 
     * @param tooCloseMargin 
     * @returns a metadata object with the needed fields to process the index
     */
    private static getRandomIndex(vertices: Vector3[], verticalOffset: number, tooCloseMargin = this.INSTANCE_FREE_RADIUS): RandomVertexData {
        const randomIndex = Math.floor(Math.random() * vertices.length);
        const randomVertex = vertices[randomIndex];
        const vertexNormal = randomVertex.subtract(Vector3.Zero()).normalize();
        // Create rotation matrix to align with surface normal
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
        // const liftedPosition = randomVertexPosition

        // Check if position is too close to an existing one
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

    /**
     * Removes the instances from the previous material
     * @param visibleVertices - vertices to process (usually hidden ones)
     */
    private static removeThinInstancesFromPreviousMaterial(visibleVertices: Vector3[]): void {
        for(const association of this.materialAssociations) {
            if (association !== this.materialAssociations[this.transitingToIndex]) {
                continue
            }
            association.meshTemplate?.dispose(true)
            this.oldLandmark?.dispose(true)
            this.oldLandmark = undefined
            // const populatedVertices = this.busyPositions.keys
        }
    }

    /**
     * Adds matterial associated meshes according to the associated density
     * @param association - Association of the material and the mesh
     * @param materialVertices - vertices to process (usually hidden ones)
     */
    private static addThinInstancesForAssociation(
        association: MaterialMeshAssociation,
        materialVertices: Vector3[],
        ): void {
        for (let i = 1; i <= association.density; i++) {
            // Get a random vertex position and its normal
            const vertexData = this.getRandomIndex(materialVertices, association.verticalOffset)
            // console.log(this.isFaceFacingCamera(this.sphere._scene.activeCamera! as ArcRotateCamera, vertex))
            if (vertexData.isTooClose ) {
                // console.log(materialVertices[0])
                // console.log(vertex.liftedPosition)
                // // console.log('Skipped')
                continue
            }

            // Add a scale factor
            const scale = 1; // Adjust this value to control the size
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

    public static start(materialIndex: number, scene: Scene): void {
        const sphere = scene.getMeshByName('planet') as Mesh;
        this.removeThinInstancesFromPreviousMaterial([])
        this.transitingToIndex = materialIndex
        this.processHiddenIndices(sphere, scene, [], [], materialIndex)

        this.transitionRunning = true
    }

    public static transitHiddenFaces(scene: Scene): void {
        const sphere = PlanetTransition.sphere!
        const indices = sphere.getIndices()!
        const totalFaces = indices.length / 3;
        // let visibleIndices = indices
        let resultOfProcessing = this.processHiddenIndices(sphere, scene, indices, this.processedFaces, this.transitingToIndex)
        this.processedFaces = resultOfProcessing.faces

        // visibleIndices = resultOfProcessing.visible

        // Stop the interval when the array is empty
        if (this.processedFaces.length === totalFaces) {
            console.log("Array is empty. Stopping...");
            this.facesProcessedBefore = this.processedFaces
            this.processedFaces = []
            this.transitionRunning = false
        }
    }

    private static changeFace(scene: Scene, sphere: Mesh, faceIndex: number, materialIndex: number, positions: Vector3[]): void {
        const indices = sphere.getIndices()!
        const vertices = sphere.getVerticesData(VertexBuffer.PositionKind)!
        
        if (!indices || !vertices) return;
        
        const i = faceIndex * 3;

        new SubMesh(
            materialIndex,  // material index
            0,  // vertex start
            sphere.getTotalVertices(),  // vertex count
            i,  // index start
            3,  // index count
            sphere
        );

        // Create submesh for the remaining faces
        if (this.debug) {
            // Create highlight lines
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
        // Calculate the face normal
        const edge1 = positions[1].subtract(positions[0]);
        const edge2 = positions[2].subtract(positions[0]);
        const faceNormal = Vector3.Cross(edge1, edge2).normalize();
    
        // Calculate visibility for each vertex
        let visibleVertices = 0;
        for (const position of positions) {
            const vertexToCamera = camera.position.subtract(position).normalize();
            const vertexDotProduct = Vector3.Dot(faceNormal, vertexToCamera);
            if (vertexDotProduct < -0.1) { // Using a small threshold to ensure better visibility detection
                visibleVertices++;
            }
        }
    
        // Face is considered visible if any of its vertices are visible
        return visibleVertices > 0;
    }
}