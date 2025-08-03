import { TransitionPhase } from './TransitionPhase';

export class CutscenePhase implements TransitionPhase {
    name = 'cutscene';
    
    async execute(): Promise<void> {
        console.log('Cutscene phase - currently skipped');
        // TODO: Implement cutscene logic
    }
}