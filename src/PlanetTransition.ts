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
    Quaternion
} from '@babylonjs/core'
import { Materials } from './Materials';

interface MaterialMeshAssociation {
    materialIndex: number;
    meshTemplate: Mesh;
    instances: InstancedMesh[];
    density: number; // How many instances per face
    verticalOffset: number; // Random offset range from vertex position
}

/**
 * Class to run a transition from a current material to another one.
 * The new material should also be associated with some additional meshes
 */
export class PlanetTransition {
    private currentIndex: number = 0
    public static transitionRunning: boolean = false
    public static currentlyHiding: boolean = false
    public static processedFaces: number[] = []
    public static sphere: Mesh
    public static debug: boolean = false
    private static materialAssociations: MaterialMeshAssociation[] = [];


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

    private static processHiddenIndices(
        sphere: Mesh,
        scene: Scene,
        fromIndices: IndicesArray,
        processedFaces: number[] = [],
        materialIndex: number = 1
    ): {
        hidden: number[],
        visible: number[],
        faces: number[]
    } {
        this.currentlyHiding = true;
        const totalFaces = fromIndices.length / 3;
        const indices = fromIndices;
        const vertices = sphere.getVerticesData(VertexBuffer.PositionKind)!;
        const normals = sphere.getVerticesData(VertexBuffer.NormalKind)!;
        const nonVisibleIndices: number[] = [];
        const visibleIndices: number[] = [];
        const nextMaterialVertices: Vector3[] = [];
        const nextMaterialNormals: Vector3[] = [];
    
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
            
            if (!isVisible && !processedFaces.includes(i)) {
                this.highlightFace(scene, sphere, i, materialIndex);
                processedFaces.push(i);
                nonVisibleIndices.push(vertexIndex0, vertexIndex1, vertexIndex2);

                // Store vertices and normals for material 1
                const normal = new Vector3(
                    normals[vertexIndex0 * 3],
                    normals[vertexIndex0 * 3 + 1],
                    normals[vertexIndex0 * 3 + 2]
                ).normalize();
                
                nextMaterialVertices.push(...positions);
                nextMaterialNormals.push(normal, normal, normal);
            } else {
                visibleIndices.push(vertexIndex0, vertexIndex1, vertexIndex2);
            }
        }

        // Create a single mesh instance for material 1 if we have vertices
        if (nextMaterialVertices.length > 0 && this.materialAssociations.length > 0) {
            this.materialAssociations.forEach(association => {
                console.log(association)
                if (association.materialIndex === materialIndex) {
                    this.addThinInstancesForAssociation(association, nextMaterialVertices, scene);
                }
            });
        }
        
        this.currentlyHiding = false;
        return { hidden: nonVisibleIndices, visible: visibleIndices, faces: processedFaces };
    }

    private static addThinInstancesForAssociation(
        association: MaterialMeshAssociation,
        materialVertices: Vector3[],
        scene: Scene
        ): void {
        for (let i = 1; i <= association.density; i++) {
            console.log(i);
            // Get a random vertex position and its normal
            const randomIndex = Math.floor(Math.random() * materialVertices.length);
            const randomVertexPosition = materialVertices[randomIndex];
            const vertexNormal = randomVertexPosition.subtract(Vector3.Zero()).normalize();

            // Create rotation matrix to align with surface normal
            const rotationMatrix = Matrix.Identity();
            const up = Vector3.Up();
            const angle = Math.acos(Vector3.Dot(up, vertexNormal));
            const axis = Vector3.Cross(up, vertexNormal).normalize();
            
            if (angle !== 0) {
                Matrix.RotationAxisToRef(axis, angle, rotationMatrix);
            }

            // Combine transformations: rotate -> translate -> lift
            const surfaceOffset = association.verticalOffset; // Adjust this value to control how far above the surface
            const liftedPosition = randomVertexPosition.add(vertexNormal.scale(surfaceOffset));
            const transitionMatrix = rotationMatrix
                .multiply(Matrix.Translation(liftedPosition.x, liftedPosition.y, liftedPosition.z));

            association.meshTemplate.thinInstanceAdd(transitionMatrix);
        }
    }

    public static start(materialIndex: number, scene: Scene): void {
        const sphere = scene.getMeshByName('planet') as Mesh;

        this.processHiddenIndices(sphere, scene, [], [], materialIndex)

        this.transitionRunning = true
    }

    public static transitHiddenFaces(scene: Scene): void {
        const sphere = PlanetTransition.sphere!
        const indices = sphere.getIndices()!
        const totalFaces = indices.length / 3;
        let visibleIndices = indices
        let resultOfProcessing = this.processHiddenIndices(sphere, scene, indices, this.processedFaces)
        this.processedFaces = resultOfProcessing.faces

        visibleIndices = resultOfProcessing.visible

        // Stop the interval when the array is empty
        if (this.processedFaces.length === totalFaces) {
            console.log("Array is empty. Stopping...");
            this.transitionRunning = false
        }
    }

    private static highlightFace(scene: Scene, sphere: Mesh, faceIndex: number, materialIndex: number): void {
        const indices = sphere.getIndices()!
        const vertices = sphere.getVerticesData(VertexBuffer.PositionKind)!
        
        if (!indices || !vertices) return;
        
        const i = faceIndex * 3;
        const positions = [
            new Vector3(vertices[indices[i] * 3], vertices[indices[i] * 3 + 1], vertices[indices[i] * 3 + 2]),
            new Vector3(vertices[indices[i + 1] * 3], vertices[indices[i + 1] * 3 + 1], vertices[indices[i + 1] * 3 + 2]),
            new Vector3(vertices[indices[i + 2] * 3], vertices[indices[i + 2] * 3 + 1], vertices[indices[i + 2] * 3 + 2])
        ];

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