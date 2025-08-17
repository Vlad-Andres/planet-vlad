import { Mesh, Scene } from '@babylonjs/core';
import { InputManager } from '../systems/InputManager';
import { TransitionOrchestrator } from '../transitions/TransitionOrchestrator';
import { BiomeDataManager } from '../managers/BiomeDataManager';
import { BiomeEnvironmentApplier } from '../systems/BiomeEnvironmentApplier';
import { PlayerMovement } from '../systems/PlayerMovement';
import { ZoomInPhase, ZoomOutPhase, TunnelJourneyPhase, BiomeEnvironmentPhase } from '../transitions/phases';

export class GameSystemManager {
    private inputManager: InputManager;
    private transitionOrchestrator: TransitionOrchestrator;
    private biomeDataManager: BiomeDataManager;
    private environmentApplier: BiomeEnvironmentApplier;
    private playerMovement?: PlayerMovement;

    constructor(private scene: Scene) {
        this.biomeDataManager = new BiomeDataManager();
        this.environmentApplier = new BiomeEnvironmentApplier(scene);
        this.transitionOrchestrator = new TransitionOrchestrator();
        this.inputManager = new InputManager(scene);
        
        this.setupEventHandlers();
    }

    public setPlayerMovement(pm: PlayerMovement): void { 
        this.playerMovement = pm;
        // Setup transition phases after player is set
        this.setupTransitionPhases();
    }

    private setupTransitionPhases(): void {
        // Get required meshes from scene
        const playerMesh = this.scene.getMeshByName('player') as Mesh;
        const planetMesh = this.scene.getMeshByName('planet') as Mesh;
        
        if (!playerMesh || !planetMesh) {
            console.error('Required meshes not found in scene');
            return;
        }

        if (!this.scene.activeCamera) {
            console.error('No active camera found in scene');
            return;
        }

        // Clear any existing phases first
        this.transitionOrchestrator.clearPhases();
    
        // Add phases in the correct order:
        // 1. Zoom in to the player
        this.transitionOrchestrator.addPhase(new ZoomInPhase(this.scene.activeCamera!, playerMesh));
        
        // 2. Journey through the planet (moves both camera and player)
        this.transitionOrchestrator.addPhase(new TunnelJourneyPhase(this.scene.activeCamera!, playerMesh, planetMesh));
        // this.transitionOrchestrator.addPhase(new BiomeEnvironmentPhase(this.scene, this.biomeDataManager, this.environmentApplier));

        // 3. Zoom out when on the other side
        this.transitionOrchestrator.addPhase(new ZoomOutPhase(this.scene.activeCamera!, playerMesh));
        
        // 4. Change biome environment
    
        console.log('Transition phases setup complete');
    }

    private setupEventHandlers(): void {
        this.inputManager.on('biome-transition-requested', async () => {
            console.log('Biome transition requested');
            // Disable input during the entire transition animation
            this.inputManager.disable();
            try {
                await this.transitionOrchestrator.executeTransition();
            } finally {
                // Re-enable input after transitions complete or on error
                this.inputManager.enable();
            }
        });
        this.inputManager.on('player-move-forward', () => this.playerMovement?.moveForward());
        this.inputManager.on('player-move-backward', () => this.playerMovement?.moveBackward());
        this.inputManager.on('player-rotate-left', () => this.playerMovement?.rotateLeft());
        this.inputManager.on('player-rotate-right', () => this.playerMovement?.rotateRight());
    }

    public getBiomeDataManager(): BiomeDataManager {
        return this.biomeDataManager;
    }

    public getInputManager(): InputManager {
        return this.inputManager;
    }
}