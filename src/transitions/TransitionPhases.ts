import { Scene, Camera, Mesh } from '@babylonjs/core';
import { TransitionPhase } from './TransitionOrchestrator';
import { BiomeDataManager } from '../managers/BiomeDataManager';
import { BiomeEnvironmentApplier } from '../systems/BiomeEnvironmentApplier';
import { PlanetTransition } from './PlanetTransition';

export class ZoomInPhase implements TransitionPhase {
    name = 'zoom-in';
    
    constructor(private camera: Camera, private player: Mesh) {}
    
    async execute(): Promise<void> {
        // Future: Zoom in animation on player
        return Promise.resolve();
    }
}

export class CutscenePhase implements TransitionPhase {
    name = 'cutscene';
    
    async execute(): Promise<void> {
        // Future: Travel through planet animation
        return Promise.resolve();
    }
}

export class ZoomOutPhase implements TransitionPhase {
    name = 'zoom-out';
    
    constructor(private camera: Camera) {}
    
    async execute(): Promise<void> {
        // Future: Zoom out animation
        return Promise.resolve();
    }
}

export class BiomeEnvironmentPhase implements TransitionPhase {
    name = 'environment-change';
    
    constructor(
        private scene: Scene, 
        private biomeData: BiomeDataManager,
        private environmentApplier: BiomeEnvironmentApplier
    ) {}
    
    async execute(): Promise<void> {
        const nextBiome = this.biomeData.advanceToNext();
        await this.environmentApplier.apply(nextBiome);
    }
}

export class PlanetTransitionPhase implements TransitionPhase {
    name = 'planet-transition';
    
    constructor(private scene: Scene) {}
    
    async execute(): Promise<void> {
        // Use existing PlanetTransition system
        PlanetTransition.do(this.scene);
        
        // Wait for transition to complete
        return new Promise<void>((resolve) => {
            const observer = this.scene.onBeforeRenderObservable.add(() => {
                // Check if transition is complete (you may need to add this method to PlanetTransition)
                // For now, we'll use a simple timeout
                setTimeout(() => {
                    this.scene.onBeforeRenderObservable.remove(observer);
                    resolve();
                }, 1000);
            });
        });
    }
}