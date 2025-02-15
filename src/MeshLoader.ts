import { 
    Scene, 
    SceneLoader, 
    AbstractMesh, 
    Vector3, 
    Mesh,
    AssetContainer,
    VertexBuffer,
} from '@babylonjs/core';
import '@babylonjs/loaders';


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
        {
            name: "winter-tree2",
            path: "./models/trees/",
            file: "winter-tree2.glb",
            scale: 0.8,
            rotationY: Math.PI / 2
        },
        {
            name: "winter-tree3",
            path: "./models/trees/",
            file: "winter-tree3.glb",
            scale: 0.8,
            rotationY: Math.PI / 2
        },
        {
            name: "winter-tree4",
            path: "./models/trees/",
            file: "winter-tree4.glb",
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
    // private static containers: AssetContainer[] = [];

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
            const result = await SceneLoader.ImportMeshAsync('', model.path, model.file, scene);
            const parent = result.meshes[0];
            const newModel = parent.getChildMeshes()[0];
            newModel.name = model.name;
            newModel.scaling.scaleInPlace(model.scale);
            if (model.rotationY !== undefined) {
                newModel.rotation.y = model.rotationY;
            }
            newModel.setParent(null);
            parent.dispose();
            this.loadedMeshes.set(model.name, newModel);
            this.optimizeMesh(newModel);
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

}