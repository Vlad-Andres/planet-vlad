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
    IndicesArray
} from 'babylonjs'
import { Materials } from './Materials';
/**
 * Class to run a transition from a current material to another one.
 * The new material should also be associated with some additional meshes
 */
export class PlanetTransition {
    private currentIndex: number = 0
    public static transitionRunning: boolean = false
    public static currentlyHiding: boolean = false
    public static processedFaces: number[] = []


    constructor(sphere: Mesh) {
        sphere.material = Materials.getMultiMaterial()

        // this.transitToMaterial(1)
    }

    private static processHiddenIndices(sphere: Mesh, scene: Scene, fromIndices: IndicesArray, processedFaces: number[] = []): {
        hidden: number[],
        visible: number[],
        faces: number[]
    } {
        this.currentlyHiding = true
        const totalFaces = fromIndices.length / 3;
        const indices = fromIndices;
        const vertices = sphere.getVerticesData(VertexBuffer.PositionKind)!;
        const nonVisibleIndices: number[] = [];
        const visibleIndices: number[] = [];
    
        for (let i = 0; i < totalFaces; i++) {
            const vertexIndex0 = indices[i * 3];     // Index of the first vertex
            const vertexIndex1 = indices[i * 3 + 1]; // Index of the second vertex
            const vertexIndex2 = indices[i * 3 + 2]; // Index of the third vertex
    
            const vertex0 = [
                vertices[vertexIndex0 * 3],     // x-coordinate of vertex 0
                vertices[vertexIndex0 * 3 + 1], // y-coordinate of vertex 0
                vertices[vertexIndex0 * 3 + 2]  // z-coordinate of vertex 0
            ];
    
            const vertex1 = [
                vertices[vertexIndex1 * 3],     // x-coordinate of vertex 1
                vertices[vertexIndex1 * 3 + 1], // y-coordinate of vertex 1
                vertices[vertexIndex1 * 3 + 2]  // z-coordinate of vertex 1
            ];
    
            const vertex2 = [
                vertices[vertexIndex2 * 3],     // x-coordinate of vertex 2
                vertices[vertexIndex2 * 3 + 1], // y-coordinate of vertex 2
                vertices[vertexIndex2 * 3 + 2]  // z-coordinate of vertex 2
            ];
    
            const positions = [
                new Vector3(vertex0[0], vertex0[1], vertex0[2]), // Vertex 0
                new Vector3(vertex1[0], vertex1[1], vertex1[2]), // Vertex 1
                new Vector3(vertex2[0], vertex2[1], vertex2[2])  // Vertex 2
            ];
    
            const isVisible = this.isFaceFacingCamera(scene.activeCamera! as ArcRotateCamera, positions);
            
            if (!isVisible && !processedFaces.includes(i)) {
                this.highlightFace(scene, sphere, i);
                processedFaces.push(i)
                nonVisibleIndices.push(vertexIndex0, vertexIndex1, vertexIndex2);
            } else {
                visibleIndices.push(vertexIndex0, vertexIndex1, vertexIndex2);
            }
        }
        this.currentlyHiding = false
        return { hidden: nonVisibleIndices, visible: visibleIndices, faces: processedFaces };
    }
    
    public static start(materialIndex: number, scene: Scene): void {
        const sphere = scene.getMeshByName("planet") as Mesh;

        this.processHiddenIndices(sphere, scene, [])

        this.transitionRunning = true
        this.transitHiddenFaces(scene)

        // const interval = setInterval(() => {
            
        // }, 1000); // Execute every 1 second

        // return true
    }

    public static transitHiddenFaces(scene: Scene): void {
        const sphere = scene.getMeshByName("planet") as Mesh;
        const indices = sphere.getIndices()!
        const totalFaces = indices.length / 3;
        // let processedIndices: number[] = []
        let visibleIndices = indices
        let resultOfProcessing = this.processHiddenIndices(sphere, scene, indices, this.processedFaces)
        // processedIndices.push(...resultOfProcessing.hidden)
        this.processedFaces = resultOfProcessing.faces

        visibleIndices = resultOfProcessing.visible
        console.log("Visible indices: ", visibleIndices.length, "Total faces: ", totalFaces, "Processed faces: ", this.processedFaces.length, )
        // Stop the interval when the array is empty
        if (this.processedFaces.length === totalFaces) {
            console.log("Array is empty. Stopping...");
            this.transitionRunning = false
        }
    }

    private static highlightFace(scene: Scene, sphere: Mesh, faceIndex: number): void {
        const indices = sphere.getIndices()!
        const vertices = sphere.getVerticesData(VertexBuffer.PositionKind)!
        
        if (!indices || !vertices) return;
        
        const i = faceIndex * 3;
        const positions = [
            new Vector3(vertices[indices[i] * 3], vertices[indices[i] * 3 + 1], vertices[indices[i] * 3 + 2]),
            new Vector3(vertices[indices[i + 1] * 3], vertices[indices[i + 1] * 3 + 1], vertices[indices[i + 1] * 3 + 2]),
            new Vector3(vertices[indices[i + 2] * 3], vertices[indices[i + 2] * 3 + 1], vertices[indices[i + 2] * 3 + 2])
        ];

        // Create submesh for the face
        // TODO: Replace this by using groups of ascending continuous indices
        new SubMesh(
            1,  // material index
            0,  // vertex start
            sphere.getTotalVertices(),  // vertex count
            i,  // index start
            3,  // index count
            sphere
        );

        // Create submesh for the remaining faces
        
        const redColor = new Color4(1, 0, 0, 1);

        // Create highlight lines
        const lines = MeshBuilder.CreateLines("highlight", {
            points: [...positions, positions[0]],
            colors: [
                new Color4(1, 0, 0, 1),
                new Color4(1, 0, 0, 1),
                new Color4(1, 0, 0, 1),
                new Color4(1, 0, 0, 1)
            ]
        }, scene);
    }
    
    // Helper function to calculate the face normal
    private isFaceInFrustum(camera: ArcRotateCamera, positions: Vector3[]): boolean {
        // Get the frustum planes from the camera
        const frustumPlanes = Frustum.GetPlanes(camera.getViewMatrix().multiply(camera.getProjectionMatrix()));
    
        // Check if all vertices of the face are within the frustum
        return positions.every(pos => 
            Frustum.IsPointInFrustum(pos, frustumPlanes)
        );
    }

    private static isFaceFacingCamera(camera: ArcRotateCamera, positions: Vector3[]): boolean {
        // Calculate the face normal
        const edge1 = positions[1].subtract(positions[0]);
        const edge2 = positions[2].subtract(positions[0]);
        const faceNormal = Vector3.Cross(edge1, edge2).normalize();
    
        // Calculate the camera direction (from face to camera)
        const faceCenter = positions.reduce((acc, pos) => acc.add(pos), new Vector3(0, 0, 0)).scaleInPlace(1 / 3);
        const cameraDirection = camera.position.subtract(faceCenter).normalize();
    
        // Check if the face is facing the camera
        const dotProduct = Vector3.Dot(faceNormal, cameraDirection);
        return dotProduct < 0;
    }

    private getAscendingSubGroupsFromArray(indices: number[]): number[][] {
        const sortedArr = [...new Set(indices)].sort((a, b) => a - b); // Remove duplicates and sort
        const groups: number[][] = [];
        let currentGroup: number[] = [];

        for (let i = 0; i < sortedArr.length; i++) {
            if (currentGroup.length === 0 || sortedArr[i] === currentGroup[currentGroup.length - 1] + 1) {
                currentGroup.push(sortedArr[i]);
            } else {
                groups.push(currentGroup);
                currentGroup = [sortedArr[i]];
            }
        }
    
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
    
        return groups;
    }

    /**
     * Groups an array of indices into contiguous ascending sequences.
     */
    private groupAscendingSequences(indices: number[]): number[][] {
        const groups: number[][] = [];
        let currentGroup: number[] = [];

        for (let i = 0; i < indices.length; i += 3) {
            if (currentGroup.length === 0) {
                currentGroup.push(indices[i], indices[i + 1], indices[i + 2]);
            } else {
                // Check if this face's indices are contiguous and ascending
                const lastIndex = currentGroup[currentGroup.length - 1];
                if (indices[i] > lastIndex && indices[i + 1] > indices[i] && indices[i + 2] > indices[i + 1]) {
                    currentGroup.push(indices[i], indices[i + 1], indices[i + 2]);
                } else {
                    groups.push([...currentGroup]);
                    currentGroup = [indices[i], indices[i + 1], indices[i + 2]];
                }
            }
        }

        // Push the final group
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }
}