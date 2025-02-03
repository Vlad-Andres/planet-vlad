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
} from 'babylonjs'
import { Materials } from './Materials';
export class PlayerMovement {
    player!: Mesh;
    playerHeading!: Vector3;  // NEW: player's current tangent heading
    planet!: Mesh;

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
        let ref = new Vector3(0, 1, 0);
        if (Math.abs(Vector3.Dot(ref, up)) > 0.99) {
            ref = new Vector3(1, 0, 0);
        }
        // Set the initial heading as the cross product (which lies in the tangent plane)
        this.playerHeading = Vector3.Cross(up, ref).normalize();
    }

    // Assume playerHeading is already defined and normalized.
    private setupControls(scene: Scene): void {
        const moveSpeed = 0.1;      // arc length (in world units) per key press
        const rotationSpeed = 0.05; // for rotating the heading with A/D keys

        // Use key events to accumulate movement commands.
        scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type !== KeyboardEventTypes.KEYDOWN) return;
            const key = kbInfo.event.key.toLowerCase();

            if (key === 'w') {
                // Move forward along the current heading.
                this.movePlayerArc(moveSpeed);
            } else if (key === 's') {
                // Move backward (negative arc length).
                this.movePlayerArc(-moveSpeed);
            } else if (key === 'a') {
                // Rotate the heading left around the player's radial axis by a fixed angle.
                this.rotatePlayerHeading(rotationSpeed);
            } else if (key === 'd') {
                // Rotate the heading right (negative rotation).
                this.rotatePlayerHeading(-rotationSpeed);
            }
        });
    }

    // Moves the player by rotating its position on the sphere by an angle d = s / R.
    private movePlayerArc(s: number): void {
        const planetRadius = this.planet.scaling.x * 4; // your planet's radius
        // d is the rotation angle in radians (arc length divided by radius)
        const d = s / planetRadius;

        // Compute the radial vector from the planet center to the player.
        const p = this.player.position.subtract(this.planet.position); // length should be ~planetRadius
        // Compute the rotation axis: cross(p, heading) ensures rotation in the direction of the heading.
        const axis = Vector3.Cross(p, this.playerHeading).normalize();

        // Create a rotation matrix to rotate by angle d about the axis.
        const rotMatrix = Matrix.RotationAxis(axis, d);

        // Rotate the radial vector.
        const newP = Vector3.TransformCoordinates(p, rotMatrix);
        // Update the player position:
        this.player.position = this.planet.position.add(newP);

        // Also rotate the player's heading so it stays tangent.
        this.playerHeading = Vector3.TransformCoordinates(this.playerHeading, rotMatrix).normalize();
    }

    // Rotates the player's heading vector without moving the position.
    // The rotation is about the player's local up (radial) axis.
    private rotatePlayerHeading(angle: number): void {
        // Compute the radial "up" vector at the player.
        const up = this.player.position.subtract(this.planet.position).normalize();
        // Rotate the heading around the up vector.
        const rotMatrix = Matrix.RotationAxis(up, angle);
        this.playerHeading = Vector3.TransformCoordinates(this.playerHeading, rotMatrix).normalize();
    }
}