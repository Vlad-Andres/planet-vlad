export interface TransitionPhase {
    name: string;
    execute(): Promise<void>;
}