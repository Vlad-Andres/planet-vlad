import { Scene } from '@babylonjs/core';
import { TransitionPhase } from './TransitionPhase';
import { PlanetTransition } from '../PlanetTransition';

export class PlanetTransitionPhase implements TransitionPhase {
    name = 'planet-transition';
    
    constructor(private scene: Scene) {}
    
    async execute(): Promise<void> {
        console.log('Starting planet transition phase');
        
        // Execute the planet transition
        PlanetTransition.do(this.scene);
        
        // Wait for transition to complete
        // Note: This is a basic implementation - you might want to add
        // proper completion detection based on your PlanetTransition logic
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Planet transition phase complete');
    }
}