export class CooldownManager {
    private lastExecutionTime: number = 0;
    private cooldownPeriod: number;

    constructor(cooldownMs: number) {
        this.cooldownPeriod = cooldownMs;
    }

    public canExecute(): boolean {
        const currentTime = Date.now();
        const timeSinceLastExecution = currentTime - this.lastExecutionTime;
        return timeSinceLastExecution >= this.cooldownPeriod;
    }

    public markExecution(): void {
        this.lastExecutionTime = Date.now();
    }

    public getRemainingCooldown(): number {
        const currentTime = Date.now();
        const timeSinceLastExecution = currentTime - this.lastExecutionTime;
        const remaining = this.cooldownPeriod - timeSinceLastExecution;
        return Math.max(0, remaining);
    }
}