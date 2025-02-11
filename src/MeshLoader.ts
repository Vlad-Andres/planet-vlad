import { 
    Scene, 
    SceneLoader, 
    AbstractMesh, 
    Vector3, 
    Mesh,
    AssetContainer,
    LoadAssetContainerAsync
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";


interface TreeModel {
    name: string;
    path: string;
    file: string;
    scale: number;
    rotationY?: number;
}

export class MeshLoader {
    private static treeModels: TreeModel[] = [
        {
            name: "winter-tree1",
            path: "./models/trees/",
            file: "winter-tree1.glb",
            scale: 0.8,
            rotationY: Math.PI / 2
        },
        // {
        //     name: "oak1",
        //     path: "/models/trees/",
        //     file: "oak_tree.glb",
        //     scale: 1.0
        // },
        // Add more tree models as needed
    ];

    private static loadedMeshes: Map<string, AbstractMesh> = new Map();
    private static containers: AssetContainer[] = [];

    public static async loadTreeModels(scene: Scene): Promise<void> {
        // registerBuiltInLoaders();
        try {
            const loadPromises = this.treeModels.map(model => 
                this.loadModel(scene, model)
            );
            
            await Promise.all(loadPromises);
            console.log("All tree models loaded successfully");
        } catch (error) {
            console.error("Error loading tree models:", error);
        }
    }

    private static async loadModel(scene: Scene, model: TreeModel): Promise<void> {
        try {
            const container = await LoadAssetContainerAsync(
                model.path + model.file,
                scene
            );

            // Store the container for cleanup if needed
            this.containers.push(container);

            // Get the root mesh
            const rootMesh = container.meshes[0];
            
            // Apply transformations
            rootMesh.scaling = new Vector3(model.scale, model.scale, model.scale);
            if (model.rotationY) {
                rootMesh.rotation.y = model.rotationY;
            }

            // Optimize the mesh for instancing
            rootMesh.setEnabled(false);
            this.optimizeMesh(rootMesh);

            // Store the mesh for later use
            this.loadedMeshes.set(model.name, rootMesh);

        } catch (error) {
            console.error(`Error loading model ${model.file}:`, error);
        }
    }

    private static optimizeMesh(mesh: AbstractMesh): void {
        // Freeze transformations for better performance
        mesh.freezeWorldMatrix();
        
        // Disable unnecessary features
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;

        // If the mesh has children, optimize them too
        mesh.getChildMeshes().forEach(child => {
            this.optimizeMesh(child);
        });
    }

    public static getTreeMesh(name: string): AbstractMesh | undefined {
        return this.loadedMeshes.get(name);
    }

    public static getRandomTreeMesh(): AbstractMesh {
        const meshes = Array.from(this.loadedMeshes.values());
        const randomIndex = Math.floor(Math.random() * meshes.length);
        return meshes[randomIndex];
    }

    public static cleanup(): void {
        // Dispose all containers and their assets
        this.containers.forEach(container => {
            container.dispose();
        });
        this.containers = [];
        this.loadedMeshes.clear();
    }
}