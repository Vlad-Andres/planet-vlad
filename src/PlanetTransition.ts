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
    Ray
} from 'babylonjs'
import { Materials } from './Materials';
export class PlanetTransition {
    private scene: Scene
    private sphere: Mesh
    private currentIndex: number = 0
    private engine: Engine

    constructor(sphere: Mesh) {
        this.sphere = sphere
        this.scene = this.sphere.getScene()
        this.engine = this.scene.getEngine()

        // Apply initial material
        this.sphere.material = Materials.get(0)
        this.sphere.material.alpha = 0.5
        
        // Start the transition after a delay
        const totalFaces = this.sphere.getIndices()!.length/3
        const positions = this.sphere.getPositionData()!
        const indices = this.sphere.getIndices()!
        const vertices = this.sphere.getVerticesData(VertexBuffer.PositionKind)!

        for (let i = 0; i < totalFaces; i++) {
            setTimeout(() => {
                const positions = [
                    new Vector3(vertices[indices[i] * 3], vertices[indices[i] * 3 + 1], vertices[indices[i] * 3 + 2]),
                    new Vector3(vertices[indices[i + 1] * 3], vertices[indices[i + 1] * 3 + 1], vertices[indices[i + 1] * 3 + 2]),
                    new Vector3(vertices[indices[i + 2] * 3], vertices[indices[i + 2] * 3 + 1], vertices[indices[i + 2] * 3 + 2])
                ];
                const isVisible = this.isFaceVisible(this.scene.activeCamera! as ArcRotateCamera, positions)
                console.log(
                    'faceIndex: ' + i,
                    'visible: ' + isVisible    
                )
                if (isVisible) {
                    this.highlightFace(i);
                }
            }, i * 100);
        }
        

        // setTimeout(() => {
            // this.startTransition()
        // }, 200)

        // this.scene.registerBeforeRender(() => {
        //     sphere.rotation.y -= 0.002
        //     sphere.rotation.z -= 0.001
        // })
    }

    private highlightFace(faceIndex: number): void {
        const indices = this.sphere.getIndices()!
        const vertices = this.sphere.getVerticesData(VertexBuffer.PositionKind)!
        const sphere = this.sphere!
        sphere
        
        if (!indices || !vertices) return;
        
        const i = faceIndex * 3;
        const positions = [
            new Vector3(vertices[indices[i] * 3], vertices[indices[i] * 3 + 1], vertices[indices[i] * 3 + 2]),
            new Vector3(vertices[indices[i + 1] * 3], vertices[indices[i + 1] * 3 + 1], vertices[indices[i + 1] * 3 + 2]),
            new Vector3(vertices[indices[i + 2] * 3], vertices[indices[i + 2] * 3 + 1], vertices[indices[i + 2] * 3 + 2])
        ];

        // Create submesh for the face
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
        }, this.scene);
        
        // Remove highlight after 2 seconds
        // setTimeout(() => lines.dispose(), 2000);
    }

    changeMaterialSmoothly(): void {
        console.log('initiated transition..')
        const sphere = this.sphere;
        if (!sphere) return;

        // Set up materials for visible and non-visible parts
        const material0 = Materials.get(0);
        const material1 = Materials.get(1);
        const multiMaterial = new MultiMaterial("multi", this.scene)
        multiMaterial.subMaterials.push(material0) // material for visible faces
        multiMaterial.subMaterials.push(material1) // material for non-visible faces
        sphere.material = multiMaterial

        const camera = this.scene.activeCamera! as ArcRotateCamera
        const spherePosition = sphere.position
        const cameraDirection = camera.position.subtract(spherePosition).normalize()!

        // Calculate visible and hidden vertices
        const vertices = sphere.getVerticesData(VertexBuffer.PositionKind)!
        const indices = sphere.getIndices()!
        const normals = sphere.getVerticesData(VertexBuffer.NormalKind)!
        
        const visibleIndices: number[] = [];
        const hiddenIndices: number[] = [];

        // Update submeshes based on camera position
        sphere.subMeshes = [];

        // Get sphere's world matrix to account for its rotation
        const sphereWorldMatrix = sphere.getWorldMatrix();

        // Process triangles in groups of 3 vertices
        const threshold = -0.2; // Adjusted threshold for better separation
        for (let i = 0; i < indices.length; i += 3) {
            const idx1 = indices[i] * 3;
            const idx2 = indices[i + 1] * 3;
            const idx3 = indices[i + 2] * 3;
            
            // Get vertex positions in world space
            const pos1 = Vector3.TransformCoordinates(
                new Vector3(vertices[idx1], vertices[idx1 + 1], vertices[idx1 + 2]),
                sphereWorldMatrix
            );
            const pos2 = Vector3.TransformCoordinates(
                new Vector3(vertices[idx2], vertices[idx2 + 1], vertices[idx2 + 2]),
                sphereWorldMatrix
            );
            const pos3 = Vector3.TransformCoordinates(
                new Vector3(vertices[idx3], vertices[idx3 + 1], vertices[idx3 + 2]),
                sphereWorldMatrix
            );
            
            // Calculate face normal using cross product of edges
            const edge1 = pos2.subtract(pos1);
            const edge2 = pos3.subtract(pos1);
            const faceNormal = Vector3.Cross(edge1, edge2).normalize();
            
            // Calculate dot product with camera direction
            const dot = Vector3.Dot(faceNormal, cameraDirection);
            
            // Assign triangle based on whether it faces the camera
            if (dot > threshold) {
                visibleIndices.push(indices[i], indices[i + 1], indices[i + 2]);
            } else {
                hiddenIndices.push(indices[i], indices[i + 1], indices[i + 2]);
            }
        }

        // Create submeshes for visible and hidden parts
        const verticesCount = sphere.getTotalVertices();

        if (visibleIndices.length > 0) {
            new SubMesh(
                0,  // material index
                0,  // vertex start
                verticesCount,  // vertex count
                visibleIndices[0],  // index start
                visibleIndices.length,  // index count
                sphere
            );
        }
        
        if (hiddenIndices.length > 0) {
            new SubMesh(
                1,  // material index
                0,  // vertex start
                verticesCount,  // vertex count
                hiddenIndices[0],  // index start
                hiddenIndices.length,  // index count
                sphere
            );
        }

        // Schedule next update
        setTimeout(() => {
            this.changeMaterialSmoothly();
        }, 16);
    }

    isFaceVisible(camera: ArcRotateCamera, positions: Vector3[]): boolean {
        // Transform face vertices to world space
        const worldMatrix = this.sphere.getWorldMatrix();
        const worldPositions = positions.map(pos => 
            Vector3.TransformCoordinates(pos, worldMatrix)
        );
    
        // Get frustum planes from the camera's view-projection matrix
        const viewProjectionMatrix = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
        const frustumPlanes = Frustum.GetPlanes(viewProjectionMatrix);
    
        // Check if all vertices are within the frustum
        const isInFrustum = worldPositions.every(pos => 
            Frustum.IsPointInFrustum(pos, frustumPlanes)
        );
    
        if (!isInFrustum) {
            return false; // Face is outside the camera's frustum
        }
    
        // Check if the face is facing the camera
        const faceNormal = this.calculateFaceNormal(worldPositions);
        const cameraDirection = camera.position.subtract(this.sphere.position).normalize();
        const dotProduct = Vector3.Dot(faceNormal, cameraDirection);
    
        // Face is visible if it's within the frustum and facing the camera
        return dotProduct > 0;
    }
    
    // Helper function to calculate the face normal
    private calculateFaceNormal(positions: Vector3[]): Vector3 {
        const edge1 = positions[1].subtract(positions[0]);
        const edge2 = positions[2].subtract(positions[0]);
        const normal = Vector3.Cross(edge1, edge2).normalize();
        return normal;
    }
}