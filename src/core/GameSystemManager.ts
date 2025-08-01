import { Scene } from '@babylonjs/core';
import { InputManager } from '../systems/InputManager';
import { TransitionOrchestrator } from '../transitions/TransitionOrchestrator';
import { BiomeDataManager } from '../managers/BiomeDataManager';
import { BiomeEnvironmentApplier } from '../systems/BiomeEnvironmentApplier';
import { ZoomInPhase, CutscenePhase, BiomeEnvironmentPhase, ZoomOutPhase, PlanetTransitionPhase } from '../transitions/TransitionPhases';

export class GameSystemManager {
    private inputManager: InputManager;
    private transitionOrchestrator: TransitionOrchestrator;
    private biomeDataManager: BiomeDataManager;
    private environmentApplier: BiomeEnvironmentApplier;

    constructor(private scene: Scene) {
        this.biomeDataManager = new BiomeDataManager();
        this.environmentApplier = new BiomeEnvironmentApplier(scene);
        this.transitionOrchestrator = new TransitionOrchestrator(scene, this.biomeDataManager);
        this.inputManager = new InputManager(scene);
        
        this.setupTransitionPhases();
        this.setupEventHandlers();
    }

    private setupTransitionPhases(): void {
        // Add phases in order for future animation system
        // this.transitionOrchestrator.addPhase(new ZoomInPhase(this.scene.activeCamera!, playerMesh));
        // this.transitionOrchestrator.addPhase(new CutscenePhase());
        this.transitionOrchestrator.addPhase(new PlanetTransitionPhase(this.scene));
        this.transitionOrchestrator.addPhase(new BiomeEnvironmentPhase(this.scene, this.biomeDataManager, this.environmentApplier));
        // this.transitionOrchestrator.addPhase(new ZoomOutPhase(this.scene.activeCamera!));
    }

    private setupEventHandlers(): void {
        this.inputManager.on('biome-transition-requested', async () => {
            await this.transitionOrchestrator.executeTransition();
        });
        
        // Add other event handlers as needed
        this.inputManager.on('player-move-forward', () => {
            // Handle player movement - delegate to PlayerMovement class
        });
        
        this.inputManager.on('player-move-backward', () => {
            // Handle player movement - delegate to PlayerMovement class
        });
        
        this.inputManager.on('player-rotate-left', () => {
            // Handle player rotation - delegate to PlayerMovement class
        });
        
        this.inputManager.on('player-rotate-right', () => {
            // Handle player rotation - delegate to PlayerMovement class
        });
    }

    public getBiomeDataManager(): BiomeDataManager {
        return this.biomeDataManager;
    }

    public getInputManager(): InputManager {
        return this.inputManager;
    }
}