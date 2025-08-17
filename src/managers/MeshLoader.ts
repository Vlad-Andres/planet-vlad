import { 
    Scene, 
    SceneLoader, 
    AbstractMesh, 
    Vector3, 
    Mesh,
    AssetContainer,
    VertexBuffer,
    Quaternion
} from '@babylonjs/core';
import '@babylonjs/loaders';

interface ModelConfig {
    path: string;
    file: string;
    scale: number;
    rotationY?: number;
    flipFaces?: boolean;
}

export class MeshLoader {
    private static models: Record<string, ModelConfig> = {
        // Trees
        tree1: { path: "./models/trees/", file: "tree1.glb", scale: 0.25, rotationY: Math.PI / 2 },
        bigTree: { path: "./models/trees/", file: "big-tree.glb", scale: 2, rotationY: Math.PI / 2, flipFaces: true },
        treeSimple: { path: "./models/trees/", file: "tree-simple.glb", scale: 0.006, rotationY: Math.PI / 2, flipFaces: true },
        brad: { path: "./models/trees/", file: "Snowy Trees.glb", scale: 2, rotationY: Math.PI / 2 },
        
        // Buildings
        house: { path: "./models/buildings/", file: "house.glb", scale: 0.1, rotationY: Math.PI / 2, flipFaces: true },
        largeBuilding: { path: "./models/buildings/", file: "large.glb", scale: 1, rotationY: Math.PI / 2 },
        largeBuilding2: { path: "./models/buildings/", file: "large2.glb", scale: 1, rotationY: Math.PI / 2 },
        skyscraper: { path: "./models/buildings/", file: "Skyscraper.glb", scale: 0.4, rotationY: Math.PI / 2 },
        arch: { path: "./models/buildings/", file: "Archway.glb", scale: 0.2, rotationY: Math.PI / 2 },
        statue: { path: "./models/buildings/", file: "Statue.glb", scale: 1, rotationY: Math.PI / 2 },
        townHouse: { path: "./models/buildings/", file: "Town House.glb", scale: 0.3, rotationY: Math.PI / 2 },
        chimney: { path: "./models/buildings/", file: "Chimney.glb", scale: 0.004, rotationY: Math.PI / 2, flipFaces: true },
        buildingRed: { path: "./models/buildings/", file: "Building Red.glb", scale: 0.6, rotationY: Math.PI / 2 },
        books: { path: "./models/buildings/", file: "Book Stack.glb", scale: 1, rotationY: Math.PI / 2 },
        mount: { path: "./models/buildings/", file: "Mount Fuji.glb", scale: 0.4, rotationY: Math.PI / 2 },
        volcano: { path: "./models/buildings/", file: "Volcano.glb", scale: 2, rotationY: Math.PI / 2, flipFaces: true },
        
        // Environment
        grass: { path: "./models/small/", file: "grass.glb", scale: 0.015, rotationY: Math.PI / 2 },
        seagull: { path: "./models/small/", file: "Seagull.glb", scale: 0.02, rotationY: Math.random() * Math.PI / 2, flipFaces: true }
    };

    private static loadedMeshes: Map<string, AbstractMesh> = new Map();
    private static totalModels: number = 0;
    private static loadedModelsCount: number = 0;
    private static loadingStatus: string = '';
    private static loadingProgressCallbacks: ((progress: number, status: string) => void)[] = [];

    public static registerLoadingCallback(callback: (progress: number, status: string) => void): void {
        this.loadingProgressCallbacks.push(callback);
    }

    private static updateLoadingProgress(status: string): void {
        this.loadingStatus = status;
        this.loadedModelsCount++;
        const progress = (this.loadedModelsCount / this.totalModels) * 100;
        
        this.loadingProgressCallbacks.forEach(callback => callback(progress, status));
    }

    public static async loadModels(scene: Scene): Promise<void> {
        this.totalModels = Object.keys(this.models).length;
        this.loadedModelsCount = 0;
        
        const loadPromises = Object.entries(this.models).map(([name, config]) => 
            this.loadModel(scene, name, config)
        );
        
        await Promise.all(loadPromises);
    }

    private static async loadModel(scene: Scene, name: string, config: ModelConfig): Promise<void> {
        try {
            const result = await SceneLoader.ImportMeshAsync('', config.path, config.file, scene);
            const parent = result.meshes[0];
    
            const mergedMesh = Mesh.MergeMeshes(parent.getChildMeshes(), true, true, undefined, false, true);
            if (!mergedMesh) {
                throw new Error(`Error merging model ${config.file}`);
            }

            mergedMesh.rotationQuaternion = Quaternion.FromEulerAngles(0, 0, 0);
            mergedMesh.computeWorldMatrix(true);
            mergedMesh.bakeCurrentTransformIntoVertices();
    
            mergedMesh.name = name;
            mergedMesh.scaling.scaleInPlace(config.scale);
            if (config.rotationY !== undefined) {
                mergedMesh.rotation.y = config.rotationY;
                mergedMesh.rotation.x = config.rotationY;
            }
            if (config.flipFaces) {
                mergedMesh.flipFaces(true);
            }

            mergedMesh.setParent(null);
            parent.dispose();
            this.loadedMeshes.set(name, mergedMesh);
            this.optimizeMesh(mergedMesh);
            
            this.updateLoadingProgress(`Loaded ${name}`);
    
        } catch (error) {
            console.error(`Error loading model ${config.file}:`, error);
            this.updateLoadingProgress(`Error loading ${name}`);
        }
    }

    private static optimizeMesh(mesh: AbstractMesh): void {
        mesh.freezeWorldMatrix();
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.getChildMeshes().forEach(child => {
            this.optimizeMesh(child);
        });
    }

    public static getMesh(name: string): AbstractMesh | undefined {
        return this.loadedMeshes.get(name);
    }

    public static getRandomTreeMesh(): AbstractMesh {
        const meshes = Array.from(this.loadedMeshes.values());
        const randomIndex = Math.floor(Math.random() * meshes.length);
        return meshes[randomIndex];
    }
}