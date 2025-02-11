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
    randomOffset: number; // Random offset range from vertex position
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
        // sphere.material = Materials.getMultiMaterial()
        sphere.material = this.getMultiMaterial(sphere.getScene())
        PlanetTransition.sphere = sphere
        PlanetTransition.debug = debug
        // this.transitToMaterial(1)
    }

    // Add method to register meshes associated with materials
    public static registerMaterialMeshAssociation(
        materialIndex: number,
        meshTemplate: Mesh,
        density: number = 1,
        randomOffset: number = 0.1
    ): void {
        this.materialAssociations.push({
            materialIndex,
            meshTemplate,
            instances: [],
            density,
            randomOffset
        });
        console.log(this.materialAssociations)
    }

    private static createMeshInstance(
        template: Mesh,
        position: Vector3,
        normal: Vector3,
        scene: Scene,
        randomOffset: number
    ): InstancedMesh {
        // Add random offset to position
        const offsetX = (Math.random() - 0.5) * randomOffset;
        const offsetZ = (Math.random() - 0.5) * randomOffset;
        const finalPosition = position.add(new Vector3(offsetX, 0, offsetZ));

        // Create rotation matrix to align mesh with surface normal
        const rotationMatrix = Matrix.Identity();
        const up = Vector3.Up();
        const angle = Math.acos(Vector3.Dot(up, normal));
        const axis = Vector3.Cross(up, normal).normalize();
        
        if (angle !== 0) {
            Matrix.RotationAxisToRef(axis, angle, rotationMatrix);
        }

        // Create instance and set its position/rotation
        const instance = template.createInstance(`instance_${Date.now()}_${Math.random()}`);
        instance.position = finalPosition;
        
        // Correct way to convert rotation matrix to quaternion
        instance.rotationQuaternion = Quaternion.FromRotationMatrix(rotationMatrix);

        // Scale based on distance from sphere center (perspective effect)
        const distanceFromCenter = Vector3.Distance(Vector3.Zero(), finalPosition);
        const scale = 0.02 * distanceFromCenter; // Adjust multiplier as needed
        instance.scaling = new Vector3(scale, scale, scale);

        return instance;
    }

    private getMultiMaterial(scene: Scene): MultiMaterial {
        const multiMaterial = new MultiMaterial("multiMaterial", scene);
        for (let i = 0; i < Materials.getMaterialsCount(); i++) {
            multiMaterial.subMaterials.push(Materials.get(i))
        }

        return multiMaterial
    }

    private static processHiddenIndices(sphere: Mesh, scene: Scene, fromIndices: IndicesArray, processedFaces: number[] = []): {
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
        const material1Vertices: Vector3[] = [];
        const material1Normals: Vector3[] = [];
    
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
                this.highlightFace(scene, sphere, i);
                processedFaces.push(i);
                nonVisibleIndices.push(vertexIndex0, vertexIndex1, vertexIndex2);

                // Store vertices and normals for material 1
                const normal = new Vector3(
                    normals[vertexIndex0 * 3],
                    normals[vertexIndex0 * 3 + 1],
                    normals[vertexIndex0 * 3 + 2]
                ).normalize();
                
                material1Vertices.push(...positions);
                material1Normals.push(normal, normal, normal);
            } else {
                visibleIndices.push(vertexIndex0, vertexIndex1, vertexIndex2);
            }
        }

        // Create a single mesh instance for material 1 if we have vertices
        if (material1Vertices.length > 0 && this.materialAssociations.length > 0) {
            const association = this.materialAssociations.find(a => a.materialIndex === 1);
            if (association) {
                // Calculate average position and normal for the mesh
                const avgPosition = material1Vertices.reduce((acc, pos) => acc.add(pos), Vector3.Zero())
                    .scale(1 / material1Vertices.length);
                const avgNormal = material1Normals.reduce((acc, norm) => acc.add(norm), Vector3.Zero())
                    .normalize();

                const instance = this.createMeshInstance(
                    association.meshTemplate,
                    avgPosition,
                    avgNormal,
                    scene,
                    association.randomOffset
                );
                association.instances = [instance]; // Replace any existing instances
            }
        }
        
        this.currentlyHiding = false;
        return { hidden: nonVisibleIndices, visible: visibleIndices, faces: processedFaces };
    }

    private static processHiddenIndices2(sphere: Mesh, scene: Scene, fromIndices: IndicesArray, processedFaces: number[] = []): {
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
        const sphere = scene.getMeshByName('planet') as Mesh;

        this.processHiddenIndices(sphere, scene, [])

        this.transitionRunning = true
    }

    public static transitHiddenFaces(scene: Scene): void {
        const sphere = PlanetTransition.sphere!
        const indices = sphere.getIndices()!
        const totalFaces = indices.length / 3;
        // let processedIndices: number[] = []
        let visibleIndices = indices
        let resultOfProcessing = this.processHiddenIndices(sphere, scene, indices, this.processedFaces)
        // processedIndices.push(...resultOfProcessing.hidden)
        this.processedFaces = resultOfProcessing.faces

        visibleIndices = resultOfProcessing.visible
        // console.log("Visible indices: ", visibleIndices.length, "Total faces: ", totalFaces, "Processed faces: ", this.processedFaces.length, )
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

        new SubMesh(
            1,  // material index
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