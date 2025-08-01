import { Scene, KeyboardEventTypes } from '@babylonjs/core';

export interface GameEvent {
    type: string;
    data?: any;
}

export class InputManager {
    private eventHandlers = new Map<string, ((event: GameEvent) => void)[]>();
    private scene: Scene;
    private keysPressed = new Set<string>();

    constructor(scene: Scene) {
        this.scene = scene;
        this.setupKeyboardListeners();
    }

    public on(eventType: string, handler: (event: GameEvent) => void): void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType)!.push(handler);
    }

    public emit(event: GameEvent): void {
        const handlers = this.eventHandlers.get(event.type);
        if (handlers) {
            handlers.forEach(handler => handler(event));
        }
    }

    private setupKeyboardListeners(): void {
        this.scene.onKeyboardObservable.add((kbInfo) => {
            const key = kbInfo.event.key.toLowerCase();
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
                this.keysPressed.add(key);
            } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
                this.keysPressed.delete(key);
            }
        });

        this.scene.onBeforeRenderObservable.add(() => {
            // Movement keys
            if (this.keysPressed.has('w')) {
                this.emit({ type: 'player-move-forward' });
            }
            if (this.keysPressed.has('s')) {
                this.emit({ type: 'player-move-backward' });
            }
            if (this.keysPressed.has('a')) {
                this.emit({ type: 'player-rotate-left' });
            }
            if (this.keysPressed.has('d')) {
                this.emit({ type: 'player-rotate-right' });
            }
            if (this.keysPressed.has('n')) {
                this.emit({ type: 'biome-transition-requested' });
            }
        });
    }
}