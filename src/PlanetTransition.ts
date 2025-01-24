import {
    Scene,
    Engine,
    Vector3,
    Vector2,
    HemisphericLight,
    MeshBuilder,
    FreeCamera,
    StandardMaterial,
    Color3,
    Texture,
    Material,
    PBRMaterial,
    ArcRotateCamera,
    VertexBuffer,
    SubMesh,
    Mesh,
    MultiMaterial
} from 'babylonjs'
import { Materials } from './Materials';
export class PlanetTransition {
    private scene: Scene
    private sphere: Mesh
    private currentIndex: number = 0
    private engine: Engine
    private transitionInProgress: boolean = false

    constructor(sphere: Mesh) {
        this.sphere = sphere
        this.scene = this.sphere.getScene()
        this.engine = this.scene.getEngine()

        // Apply initial material
        this.sphere.material = Materials.get(0)
        
        // Start the transition after a delay
        setTimeout(() => {
            this.startTransition()
        }, 200)

        // Add rotation animation
        this.scene.registerBeforeRender(() => {
            sphere.rotation.y -= 0.002
            sphere.rotation.z -= 0.001
        })
    }

    startTransition(): void {
        if (this.transitionInProgress) return;
        
        this.transitionInProgress = true;
        this.currentIndex = (this.currentIndex + 1) % Materials.getMaterialsCount();
        
        // Start the material transition
        this.changeMaterialSmoothly();
        
        // Reset transition flag after completion
        setTimeout(() => {
            this.transitionInProgress = false;
            this.sphere.material = Materials.get(this.currentIndex);
            
            // Schedule next transition
            setTimeout(() => {
                this.startTransition();
            }, 3000);
        }, 1000);
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

    isPointVisible(camera: ArcRotateCamera, point: Vector3): boolean {
        const viewport = this.engine.getRenderingCanvasClientRect()!;
        const projectedPoint = Vector3.Project(
            point,
            camera.getWorldMatrix(),
            this.scene.getTransformMatrix(),
            camera.viewport.toGlobal(viewport.width, viewport.height)
        );

        // Check if the point is within the visible range
        return (
            projectedPoint.x >= 0 &&
            projectedPoint.x <= viewport.width &&
            projectedPoint.y >= 0 &&
            projectedPoint.y <= viewport.height
        );
    }
}