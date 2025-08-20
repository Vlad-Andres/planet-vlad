import {
    Scene,
    Vector3,
    KeyboardEventTypes,
    Mesh,
    Matrix,
    SceneLoader,
    AbstractMesh,
    Quaternion
} from '@babylonjs/core'
import '@babylonjs/loaders';
import { PlanetTransition } from '../transitions/PlanetTransition';
import { BiomeManager } from '../managers/BiomeManager';

export class PlayerMovement {
    player: AbstractMesh | null = null;
    playerHeading!: Vector3;
    planet!: Mesh;
    private readonly MOVE_SPEED = 0.07;
    private keysPressed: Set<string> = new Set();
    static playerUP: Vector3 = Vector3.Zero();
    private lastActionTime: number = 0;
    private readonly ACTION_DELAY: number = 500;
    private currentBiomIndex: number = 0;
    private readonly BIOME_THRESHOLDS = [34, 20, 1, 2.3];
    private scene!: Scene;
    // Expose a ready promise to signal when the player mesh is loaded
    public readonly ready: Promise<void>;
    private resolveReady!: () => void;

    constructor(planet: Mesh, scene: Scene, enableInternalControls: boolean = true) {
        this.planet = planet;
        this.scene = scene;
        this.ready = new Promise<void>((resolve) => { this.resolveReady = resolve; });
        this.createPlayer(scene);
        if (enableInternalControls) {
            this.setupControls(scene);
        }
    }

    // public wrappers used by GameSystemManager
    public moveForward(): void { this.movePlayerArc(this.MOVE_SPEED); }
    public moveBackward(): void { this.movePlayerArc(-this.MOVE_SPEED); }
    public rotateLeft(): void { this.rotatePlayerHeading(0.1); }
    public rotateRight(): void { this.rotatePlayerHeading(-0.1); }

    private createPlayer(scene: Scene): void {
        // Load the boy.glb model and use it directly as the player mesh
        SceneLoader.ImportMeshAsync('', './models/characters/', 'boy.glb', scene)
            .then(result => {
                const mesh = result.meshes[0];
                if (!mesh) return;
                this.player = mesh;
                this.player.name = 'player';
                if (!this.player.rotationQuaternion) {
                    this.player.rotationQuaternion = Quaternion.Identity();
                }
                // Position player on planet's surface (keep existing logic)
                this.player.position = new Vector3(0, this.planet.scaling.y * 4.2, 0);
                // Compute player's "up" vector from planet center
                const up = this.player.position.subtract(this.planet.position).normalize();
                const ref = Math.abs(Vector3.Dot(Vector3.Up(), up)) > 0.99 ? Vector3.Right() : Vector3.Up();
                // Set the initial heading as the cross product (which lies in the tangent plane)
                this.playerHeading = Vector3.Cross(up, ref).normalize();
                // Per-frame: align model's up to the camera's up vector
                this.scene.onBeforeRenderObservable.add(() => this.alignModelUpToCamera());
                // Signal that the player is ready
                this.resolveReady();
            })
            .catch(err => {
                console.error('Failed to load boy.glb as player:', err);
            });
    }

    private runTransitionIfApplicable(scene: Scene): void {
        const currentTime = Date.now();

        if (currentTime - this.lastActionTime < this.ACTION_DELAY) {
            return; // Skip if not enough time has passed
        }
        this.lastActionTime = currentTime;
        PlanetTransition.do(scene)
    }

    // Assume playerHeading is already defined and normalized.
    private checkLandmarkProximity(): void {
        const landmark = PlanetTransition.getCurrentLandmark();
        if (!landmark) return;

        // Get the thin instance's world matrix
        const thinInstanceWorldMatrices = landmark.thinInstanceGetWorldMatrices();
        if (thinInstanceWorldMatrices.length === 0) return;

        // Get the position from the world matrix of the first (and only) instance
        const instancePosition = new Vector3(
            thinInstanceWorldMatrices[0].m[12],
            thinInstanceWorldMatrices[0].m[13],
            thinInstanceWorldMatrices[0].m[14]
        );

        // Get current biome index
        const currentBiomeIndex = BiomeManager.getCurrentBiomeIndex();
        // Get the base threshold for the current biome
        const baseThreshold = this.BIOME_THRESHOLDS[this.currentBiomIndex] || 15;
        
        const distance = Vector3.Distance(this.player!.position, instancePosition);
        // console.log(`Distance to landmark: ${distance}, Threshold: ${baseThreshold}`);
        
        // tODO: Problem here
        
        // if (distance < baseThreshold && BiomeManager.startBiomeTransition(this.player.getScene())) {
        //     this.currentBiomIndex++;
        // }
    }
    // OLD way, disabled, now TransitionPhase takes care of it
    private setupControls(scene: Scene): void {
        scene.onKeyboardObservable.add((kbInfo) => {
            // this.runTransitionIfApplicable(scene)
            const key = kbInfo.event.key.toLowerCase();
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
                this.keysPressed.add(key);
            } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
                this.keysPressed.delete(key);
            }
        });

        scene.onBeforeRenderObservable.add(() => {
            if (!this.player) return;
            if (this.keysPressed.has('w')) {
                this.movePlayerArc(this.MOVE_SPEED);
            }
            if (this.keysPressed.has('s')) {
                this.movePlayerArc(-this.MOVE_SPEED);
            }
            if (this.keysPressed.has('a')) {
                this.rotatePlayerHeading(0.1);
            }
            if (this.keysPressed.has('d')) {
                this.rotatePlayerHeading(-0.1);
            }
            if (this.keysPressed.has('n')) {
                // Use BiomeManager instead of directly calling PlanetTransition
                BiomeManager.goToNextBiome(scene);
            }
        });
    }

    private movePlayerArc(speed: number): void {
        if (!this.player) return;
        const planetRadius = this.planet.scaling.x * 4;
        const angle = speed / planetRadius;
        
        const radialAxis = this.player.position.subtract(this.planet.position).normalize();
        const rotationAxis = Vector3.Cross(radialAxis, this.playerHeading).normalize();
        const rotationMatrix = Matrix.RotationAxis(rotationAxis, angle);
        
        const currentPosition = this.player.position.subtract(this.planet.position);
        const newPosition = Vector3.TransformCoordinates(currentPosition, rotationMatrix);
        
        this.player.position = this.planet.position.add(newPosition);
        this.playerHeading = Vector3.TransformCoordinates(this.playerHeading, rotationMatrix).normalize();

        // Check for landmark proximity after movement
        this.checkLandmarkProximity();
    }

    private alignModelUpToCamera(): void {
        if (!this.player) return;
        const cam = this.scene.activeCamera as any;
        if (!cam || !cam.upVector) return;
        const targetUp = cam.upVector.normalize();
        // Compute current world up of the player (transform local Y by world matrix)
        const currentUp = Vector3.TransformNormal(Vector3.Up(), this.player.getWorldMatrix()).normalize();
        const dot = Vector3.Dot(currentUp, targetUp);
        if (dot > 0.999) return; // Already aligned
        if (dot < -0.999) {
            // Opposite direction: rotate 180 degrees around any axis orthogonal to currentUp
            const ortho = Math.abs(currentUp.x) < 0.9 ? Vector3.Right() : Vector3.Up();
            const axis = Vector3.Cross(currentUp, ortho).normalize();
            const q180 = Quaternion.RotationAxis(axis, Math.PI);
            this.player.rotationQuaternion = q180.multiply(this.player.rotationQuaternion!);
            return;
        }
        const axis = Vector3.Cross(currentUp, targetUp);
        const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
        const q = Quaternion.RotationAxis(axis.normalize(), angle);
        this.player.rotationQuaternion = q.multiply(this.player.rotationQuaternion!);
    }

    private rotatePlayerHeading(angle: number): void {
        if (!this.player) return;
        const up = this.player.position.subtract(this.planet.position).normalize();
        PlayerMovement.playerUP = up
        const rotationMatrix = Matrix.RotationAxis(up, angle);
        this.playerHeading = Vector3.TransformCoordinates(this.playerHeading, rotationMatrix).normalize();
    }

    public getCurrentHeading(): Vector3 {
        return this.playerHeading
    }
}