import { Scene } from '@babylonjs/core';
import { TransitionPhase } from './TransitionPhase';
import { BiomeDataManager } from '../../managers/BiomeDataManager';
import { BiomeEnvironmentApplier } from '../../systems/BiomeEnvironmentApplier';
import { BiomeManager } from '../../managers/BiomeManager';

export class BiomeEnvironmentPhase implements TransitionPhase {
    name = 'biome-environment';
    
    constructor(
        private scene: Scene,
        private biomeDataManager: BiomeDataManager,
        private environmentApplier: BiomeEnvironmentApplier
    ) {}
    
    async execute(): Promise<void> {
        // Use BiomeManager to handle the biome transition
        // This includes cooldown, narrative, sound, and planet material transition
        const success = BiomeManager.goToNextBiome(this.scene);
    }
}