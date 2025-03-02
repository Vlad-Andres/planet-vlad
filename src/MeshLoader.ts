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
                flipFaces: false
            },
            treeSimple: {
                path: "./models/trees/",
                file: "tree-simple.glb",
                scale: 0.006,
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
        },
        environment: {
            grass: {
                path: "./models/small/",
                file: "grass.glb",
                scale: 0.015,
                rotationY: Math.PI / 2,
                flipFaces: false
            }
        }
    };

    private static loadedMeshes: Map<string, AbstractMesh> = new Map();

    public static async loadModels(scene: Scene): Promise<void> {
        try {
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
            }
            if (model.flipFaces) {
                mergedMesh.flipFaces(true);
            }

            mergedMesh.setParent(null);
            parent.dispose();
            this.loadedMeshes.set(model.name, mergedMesh);
            this.optimizeMesh(mergedMesh);
    
        } catch (error) {
            console.error(`Error loading model ${model.file}:`, error);
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