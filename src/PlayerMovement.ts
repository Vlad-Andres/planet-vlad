import {
    Scene,
    Engine,
    Vector3,
    Vector2,
    HemisphericLight,
    MeshBuilder,
    FreeCamera,
    Color3,
    Color4,
    PBRMaterial,
    KeyboardEventTypes,
    Mesh,
    ArcRotateCamera,
    Matrix,
    FollowCamera,
} from '@babylonjs/core'
import { Materials } from './Materials';
import { PlanetTransition } from './PlanetTransition';
import { BiomeManager } from './BiomeManager';
export class PlayerMovement {
    player!: Mesh;
    playerHeading!: Vector3;  // NEW: player's current tangent heading
    planet!: Mesh;
    private moveDirection = Vector3.Zero();
    private readonly MOVE_SPEED = 0.07;
    private keysPressed: Set<string> = new Set();
    static playerUP: Vector3 = Vector3.Zero();
    private lastActionTime: number = 0;  // Track last action time
    private readonly ACTION_DELAY: number = 500;  // Delay in milliseconds
    private currentBiomIndex: number = 0;
    private readonly LANDMARK_PROXIMITY_THRESHOLD = 4; // Distance threshold for landmark interaction
    // Biome-specific landmark proximity thresholds
    private readonly BIOME_THRESHOLDS = [
        34, // First biome (Childhood in Moldova) threshold
        20, // Second biome (Moving to the Big City) threshold
        1, // Third biome (The Netherlands) threshold
        2,3  // Fourth biome (Iceland) threshold
    ];
    private readonly VERTICAL_OFFSET_FACTOR = 0.15; // Factor to adjust threshold based on vertical offset


    constructor(planet: Mesh, scene: Scene) {
        this.planet = planet
        this.createPlayer(scene)
        this.setupControls(scene)
    }

    private createPlayer(scene: Scene): void {
        // Create player
        this.player = MeshBuilder.CreateSphere('player', { diameter: 1, segments: 16 }, scene);
        // Position player on planet's surface
        this.player.position = new Vector3(0, this.planet.scaling.y * 4.2, 0);

        // Compute player's "up" vector from planet center
        const up = this.player.position.subtract(this.planet.position).normalize();
        // Choose a reference vector that's not collinear with 'up' (for example, global Y)
        const ref = Math.abs(Vector3.Dot(Vector3.Up(), up)) > 0.99 ? Vector3.Right() : Vector3.Up();

        // Set the initial heading as the cross product (which lies in the tangent plane)
        this.playerHeading = Vector3.Cross(up, ref).normalize();
    }

    private runTransitionIfApplicable(scene: Scene): void {
        const currentTime = Date.now();

        if (currentTime - this.lastActionTime < this.ACTION_DELAY) {
            return; // Skip if not enough time has passed
        }
        if (PlanetTransition.transitionRunning && !PlanetTransition.currentlyHiding) {
            console.log('running')
            this.lastActionTime = currentTime;
            PlanetTransition.transitHiddenFaces(scene)
        }
    }

    // Assume playerHeading is already defined and normalized.
    private checkLandmarkProximity(): void {
        if (PlanetTransition.transitionRunning) return;

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
        console.log(currentBiomeIndex)
        // Get the base threshold for the current biome
        const baseThreshold = this.BIOME_THRESHOLDS[this.currentBiomIndex] || 15;
        
        const distance = Vector3.Distance(this.player.position, instancePosition);
        console.log(`Distance to landmark: ${distance}, Threshold: ${baseThreshold}`);
        
        if (distance < baseThreshold && BiomeManager.startBiomeTransition(this.player.getScene())) {
            this.currentBiomIndex++;
        }
    }

    private setupControls(scene: Scene): void {
        scene.onKeyboardObservable.add((kbInfo) => {
            this.runTransitionIfApplicable(scene)
            const key = kbInfo.event.key.toLowerCase();
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
                this.keysPressed.add(key);
            } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
                this.keysPressed.delete(key);
            }
        });

        scene.onBeforeRenderObservable.add(() => {
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
            if (this.keysPressed.has('n') && !PlanetTransition.transitionRunning) {
                // Use BiomeManager instead of directly calling PlanetTransition
                BiomeManager.startBiomeTransition(scene);
            }
        });
    }

    private movePlayerArc(speed: number): void {
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

    private rotatePlayerHeading(angle: number): void {
        const up = this.player.position.subtract(this.planet.position).normalize();
        PlayerMovement.playerUP = up
        const rotationMatrix = Matrix.RotationAxis(up, angle);
        this.playerHeading = Vector3.TransformCoordinates(this.playerHeading, rotationMatrix).normalize();
    }

    public getCurrentHeading(): Vector3 {
        return this.playerHeading
    }
}