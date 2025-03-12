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
    name: string;
    path: string;
    file: string;
    scale: number;
    rotationY?: number;
    flipFaces?: boolean;
}

export class MeshLoader {
    private static models = {
        trees: {
            tree1: {
                path: "./models/trees/",
                file: "tree1.glb",
                scale: 0.25,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            bigTree: {
                path: "./models/trees/",
                file: "big-tree.glb",
                scale: 2,
                rotationY: Math.PI / 2,
                flipFaces: true
            },
            treeSimple: {
                path: "./models/trees/",
                file: "tree-simple.glb",
                scale: 0.006,
                rotationY: Math.PI / 2,
                flipFaces: true
            },
            brad: {
                path: "./models/trees/",
                file: "Snowy Trees.glb",
                scale: 2,
                rotationY: Math.PI / 2,
                flipFaces: false
            }
        },
        buildings: {
            house: {
                path: "./models/buildings/",
                file: "house.glb",
                scale: 0.1,
                rotationY: Math.PI / 2,
                flipFaces: true
            },
            largeBuilding: {
                path: "./models/buildings/",
                file: "large.glb",
                scale: 1,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            largeBuilding2: {
                path: "./models/buildings/",
                file: "large2.glb",
                scale: 1,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            skyscraper: {
                path: "./models/buildings/",
                file: "Skyscraper.glb",
                scale: 0.4,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            arch: {
                path: "./models/buildings/",
                file: "Archway.glb",
                scale: 0.2,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            statue: {
                path: "./models/buildings/",
                file: "Statue.glb",
                scale: 1,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            townHouse: {
                path: "./models/buildings/",
                file: "Town House.glb",
                scale: 0.3,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            chimney: {
                path: "./models/buildings/",
                file: "Chimney.glb",
                scale: 0.004,
                rotationY: Math.PI / 2,
                flipFaces: true
            },
            buildingRed: {
                path: "./models/buildings/",
                file: "Building Red.glb",
                scale: 0.6,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            books: {
                path: "./models/buildings/",
                file: "Book Stack.glb",
                scale: 1,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            mount: {
                path: "./models/buildings/",
                file: "Mount Fuji.glb",
                scale: 0.4,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            volcano: {
                path: "./models/buildings/",
                file: "Volcano.glb",
                scale: 2,
                rotationY: Math.PI / 2,
                flipFaces: true
            },
        },
        environment: {
            grass: {
                path: "./models/small/",
                file: "grass.glb",
                scale: 0.015,
                rotationY: Math.PI / 2,
                flipFaces: false
            },
            seagull: {
                path: "./models/small/",
                file: "Seagull.glb",
                scale: 0.02,
                rotationY: Math.random() * Math.PI / 2,
                flipFaces: true
            }
        }
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
        
        for (const callback of this.loadingProgressCallbacks) {
            callback(progress, status);
        }
    }

    public static async loadModels(scene: Scene): Promise<void> {
        try {
            // Count total models to load for progress tracking
            this.totalModels = 
                Object.keys(this.models.trees).length + 
                Object.keys(this.models.buildings).length + 
                Object.keys(this.models.environment).length;
            
            this.loadedModelsCount = 0;
            
            await Promise.all([
                this.loadTreeModels(scene),
                this.loadBuildingModels(scene),
                this.loadEnvironmentModels(scene)
            ]);
            console.log("All models loaded successfully");
        } catch (error) {
            console.error("Error loading models:", error);
        }
    }

    private static async loadTreeModels(scene: Scene): Promise<void> {
        try {
            const treeModels = Object.entries(this.models.trees).map(([name, model]) => ({
                name,
                ...model
            }));

            const loadPromises = treeModels.map(model => 
                this.loadModel(scene, model)
            );
            
            await Promise.all(loadPromises);
            console.log("All tree models loaded successfully");
        } catch (error) {
            console.error("Error loading tree models:", error);
            throw error; // Propagate error for proper handling in loadModels
        }
    }

    private static async loadBuildingModels(scene: Scene): Promise<void> {
        try {
            const buildingModels = Object.entries(this.models.buildings).map(([name, model]) => ({
                name,
                ...model
            }));
            const loadPromises = buildingModels.map(model =>
                this.loadModel(scene, model)
            );
            await Promise.all(loadPromises);
            console.log("All building models loaded successfully");
        } catch (error) {
            console.error("Error loading building models:", error);
            throw error; // Propagate error for proper handling in loadModels
        }
    }

    private static async loadEnvironmentModels(scene: Scene): Promise<void> {
        try {
            const environmentModels = Object.entries(this.models.environment).map(([name, model]) => ({
                name,
                ...model
            }));
            const loadPromises = environmentModels.map(model =>
                this.loadModel(scene, model)
            );
            await Promise.all(loadPromises);
            console.log("All environment models loaded successfully");
        } catch (error) {
            console.error("Error loading environment models:", error);
            throw error; // Propagate error for proper handling in loadModels
        }
    }

    private static async loadModel(scene: Scene, model: ModelConfig): Promise<void> {
        try {
            this.loadingStatus = `Loading ${model.name}...`;
            const result = await SceneLoader.ImportMeshAsync('', model.path, model.file, scene);
            const parent = result.meshes[0];
    
            const mergedMesh = Mesh.MergeMeshes(parent.getChildMeshes(), true, true, undefined, false, true);
            if (!mergedMesh) {
                throw new Error(`Error merging model ${model.file}`);
            }

            mergedMesh.rotationQuaternion = Quaternion.FromEulerAngles(0, 0, 0);
            mergedMesh.computeWorldMatrix(true);
            mergedMesh.bakeCurrentTransformIntoVertices();
    
            mergedMesh.name = model.name;
            mergedMesh.scaling.scaleInPlace(model.scale);
            if (model.rotationY !== undefined) {
                mergedMesh.rotation.y = model.rotationY;
                mergedMesh.rotation.x = model.rotationY;

            }
            if (model.flipFaces) {
                mergedMesh.flipFaces(true);
            }

            mergedMesh.setParent(null);
            parent.dispose();
            this.loadedMeshes.set(model.name, mergedMesh);
            this.optimizeMesh(mergedMesh);
            
            // Update loading progress
            this.updateLoadingProgress(`Loaded ${model.name}`);
    
        } catch (error) {
            console.error(`Error loading model ${model.file}:`, error);
            this.updateLoadingProgress(`Error loading ${model.name}`);
            throw error; // Propagate error for proper handling
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