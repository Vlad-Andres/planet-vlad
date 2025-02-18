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
export class PlayerMovement {
    player!: Mesh;
    playerHeading!: Vector3;  // NEW: player's current tangent heading
    planet!: Mesh;
    private moveDirection = Vector3.Zero();
    private readonly MOVE_SPEED = 0.05;
    private keysPressed: Set<string> = new Set();
    static playerUP: Vector3 = Vector3.Zero();
    private lastActionTime: number = 0;  // Track last action time
    private readonly ACTION_DELAY: number = 500;  // Delay in milliseconds
    private materialIndex: number = 0;


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
                this.rotatePlayerHeading(0.05);
            }
            if (this.keysPressed.has('d')) {
                this.rotatePlayerHeading(-0.05);
            }
            if (this.keysPressed.has('n') && !PlanetTransition.transitionRunning) {
                PlanetTransition.start(scene)
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