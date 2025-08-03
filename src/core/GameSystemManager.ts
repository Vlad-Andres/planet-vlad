import { Mesh, Scene } from '@babylonjs/core';
import { InputManager } from '../systems/InputManager';
import { TransitionOrchestrator } from '../transitions/TransitionOrchestrator';
import { BiomeDataManager } from '../managers/BiomeDataManager';
import { BiomeEnvironmentApplier } from '../systems/BiomeEnvironmentApplier';
import { ZoomInPhase, CutscenePhase, BiomeEnvironmentPhase, ZoomOutPhase } from '../transitions/TransitionPhases';
import { PlayerMovement } from '../systems/PlayerMovement';

export class GameSystemManager {
    private inputManager: InputManager;
    private transitionOrchestrator: TransitionOrchestrator;
    private biomeDataManager: BiomeDataManager;
    private environmentApplier: BiomeEnvironmentApplier;
    private playerMovement?: PlayerMovement;

    constructor(private scene: Scene) {
        this.biomeDataManager = new BiomeDataManager();
        this.environmentApplier = new BiomeEnvironmentApplier(scene);
        this.transitionOrchestrator = new TransitionOrchestrator(scene, this.biomeDataManager);
        this.inputManager = new InputManager(scene);
        
        this.setupEventHandlers();
    }

    public setPlayerMovement(pm: PlayerMovement): void { 
        this.playerMovement = pm;
        // Setup transition phases after player is set
        this.setupTransitionPhases();
    }

    private setupTransitionPhases(): void {
        // Get player mesh from scene
        const playerMesh = this.scene.getMeshByName('player') as Mesh;
        console.log('Setting up transition phases, player mesh:', playerMesh);
        
        if (!playerMesh) {
            console.error('Player mesh not found in scene');
            return;
        }

        if (!this.scene.activeCamera) {
            console.error('No active camera found in scene');
            return;
        }

        console.log('Camera type:', this.scene.activeCamera.getClassName());
        console.log('Camera:', this.scene.activeCamera);

        // Clear any existing phases first
        this.transitionOrchestrator.clearPhases();

        // Add phases in sequence: zoom in -> biome transition -> zoom out
        this.transitionOrchestrator.addPhase(new ZoomInPhase(this.scene.activeCamera!, playerMesh));
        this.transitionOrchestrator.addPhase(new BiomeEnvironmentPhase(this.scene, this.biomeDataManager, this.environmentApplier));
        this.transitionOrchestrator.addPhase(new ZoomOutPhase(this.scene.activeCamera!));
        
        console.log('Transition phases setup complete');
    }

    private setupEventHandlers(): void {
        this.inputManager.on('biome-transition-requested', async () => {
            console.log('Biome transition requested');
            await this.transitionOrchestrator.executeTransition();
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