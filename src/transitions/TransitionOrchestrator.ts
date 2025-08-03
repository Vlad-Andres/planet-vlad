import { Scene } from '@babylonjs/core';
import { BiomeDataManager } from '../managers/BiomeDataManager';
import { CooldownManager } from '../systems/CooldownManager';

export interface TransitionPhase {
    name: string;
    execute(): Promise<void>;
}

export class TransitionOrchestrator {
    private phases: TransitionPhase[] = [];
    private isTransitioning = false;
    private cooldownManager: CooldownManager;

    constructor(private scene: Scene, private biomeData: BiomeDataManager) {
        this.cooldownManager = new CooldownManager(4000);
    }

    public addPhase(phase: TransitionPhase): void {
        this.phases.push(phase);
    }

    public clearPhases(): void {
        this.phases = [];
    }

    public async executeTransition(): Promise<boolean> {
        if (this.isTransitioning || !this.cooldownManager.canExecute()) {
            return false;
        }

        this.isTransitioning = true;
        this.cooldownManager.markExecution();

        try {
            for (const phase of this.phases) {
                await phase.execute();
            }
            return true;
        } finally {
            this.isTransitioning = false;
        }
    }

    public isCurrentlyTransitioning(): boolean {
        return this.isTransitioning;
    }

    public getCooldownRemaining(): number {
        return this.cooldownManager.getRemainingCooldown();
    }
}