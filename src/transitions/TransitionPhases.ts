import { Scene, Camera, Mesh, FollowCamera, Vector3, Animation, EasingFunction, CubicEase } from '@babylonjs/core';
import { TransitionPhase } from './TransitionOrchestrator';
import { BiomeDataManager } from '../managers/BiomeDataManager';
import { BiomeEnvironmentApplier } from '../systems/BiomeEnvironmentApplier';
import { PlanetTransition } from './PlanetTransition';
import { BiomeManager } from '../managers/BiomeManager';

export class ZoomInPhase implements TransitionPhase {
    name = 'zoom-in';
    
    constructor(private camera: Camera, private player: Mesh) {}
    
    async execute(): Promise<void> {
        return new Promise((resolve) => {
            console.log('Zooming in');
            const followCamera = this.camera as FollowCamera;
            if (!followCamera) {
                resolve();
                return;
            }

            const originalRadius = followCamera.radius;
            const originalHeight = followCamera.heightOffset;
            const zoomDistance = 2; // Very close to player
            const zoomHeight = 0.5; // Lower height
            
            let animationFrame = 0;
            const totalFrames = 60; // 1 second at 60fps
            
            const animateZoom = () => {
                animationFrame++;
                const progress = animationFrame / totalFrames;
                
                // Use easing function for smooth animation
                const easedProgress = this.easeInOut(progress);
                
                // Interpolate radius and height
                followCamera.radius = originalRadius + (zoomDistance - originalRadius) * easedProgress;
                followCamera.heightOffset = originalHeight + (zoomHeight - originalHeight) * easedProgress;
                
                if (animationFrame < totalFrames) {
                    requestAnimationFrame(animateZoom);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animateZoom);
        });
    }
    
    private easeInOut(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
}

export class CutscenePhase implements TransitionPhase {
    name = 'cutscene';
    
    async execute(): Promise<void> {
        // Skip cutscene for now - biome transition happens while zoomed in
        return Promise.resolve();
    }
}

export class ZoomOutPhase implements TransitionPhase {
    name = 'zoom-out';
    
    constructor(private camera: Camera) {}
    
    async execute(): Promise<void> {
        return new Promise((resolve) => {
            console.log('Zooming out');
            const followCamera = this.camera as FollowCamera;
            if (!followCamera) {
                resolve();
                return;
            }

            const currentRadius = followCamera.radius;
            const currentHeight = followCamera.heightOffset;
            const originalRadius = 12; // Original camera distance
            const originalHeight = 4; // Original height offset
            
            let animationFrame = 0;
            const totalFrames = 60; // 1 second at 60fps
            
            const animateZoom = () => {
                animationFrame++;
                const progress = animationFrame / totalFrames;
                
                // Use easing function for smooth animation
                const easedProgress = this.easeInOut(progress);
                
                // Interpolate radius and height back to original
                followCamera.radius = currentRadius + (originalRadius - currentRadius) * easedProgress;
                followCamera.heightOffset = currentHeight + (originalHeight - currentHeight) * easedProgress;
                
                if (animationFrame < totalFrames) {
                    requestAnimationFrame(animateZoom);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animateZoom);
        });
    }
    
    private easeInOut(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
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
        // Let BiomeManager handle cooldown, narrative, sound, and planet material transition
        BiomeManager.goToNextBiome(this.scene);
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
                // Check if transition is complete by monitoring material change
                let checkCount = 0;
                const maxChecks = 60; // ~1 second at 60fps
                
                const checkTransition = () => {
                    checkCount++;
                    
                    // Simple check - could be enhanced with actual transition completion detection
                    if (checkCount > maxChecks) {
                        this.scene.onBeforeRenderObservable.remove(observer);
                        resolve();
                    } else {
                        setTimeout(checkTransition, 16); // Check every frame
                    }
                };
                
                checkTransition();
            });
        });
    }
}