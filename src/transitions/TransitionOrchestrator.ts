import { Scene } from '@babylonjs/core';
import { BiomeDataManager } from '../managers/BiomeDataManager';
import { CooldownManager } from '../systems/CooldownManager';
import { TransitionPhase } from './phases/TransitionPhase';

export class TransitionOrchestrator {
    private phases: TransitionPhase[] = [];
    private isRunning = false;

    addPhase(phase: TransitionPhase): void {
        this.phases.push(phase);
        console.log(`Added phase: ${phase.name}`);
    }

    clearPhases(): void {
        this.phases = [];
        console.log('Cleared all phases');
    }

    async executeTransition(): Promise<void> {
        if (this.isRunning) {
            console.log('Transition already running, skipping');
            return;
        }

        this.isRunning = true;
        console.log(`Starting transition with ${this.phases.length} phases`);

        try {
            for (const phase of this.phases) {
                console.log(`Executing phase: ${phase.name}`);
                await phase.execute();
                console.log(`Phase completed: ${phase.name}`);
            }
            console.log('All transition phases completed');
        } catch (error) {
            console.error('Error during transition:', error);
        } finally {
            this.isRunning = false;
        }
    }
}