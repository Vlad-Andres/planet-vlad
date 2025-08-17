import { Camera, Mesh, FollowCamera } from '@babylonjs/core';
import { TransitionPhase } from './TransitionPhase';

export class ZoomInPhase implements TransitionPhase {
    name = 'zoom-in';
    
    constructor(private camera: Camera, private player: Mesh) {}
    
    async execute(): Promise<void> {
        return new Promise((resolve) => {
            
            if (!(this.camera instanceof FollowCamera)) {
                console.error('Camera is not a FollowCamera, cannot zoom');
                resolve();
                return;
            }
            
            const followCamera = this.camera as FollowCamera;
            
            // Store initial values
            const initialRadius = followCamera.radius;
            const initialHeightOffset = followCamera.heightOffset;
            const targetRadius = 2; // Zoom in closer
            const targetHeightOffset = 1;
            
            let animationFrame = 0;
            const totalFrames = 60; // 1 second at 60fps
            
            const animate = () => {
                animationFrame++;
                const progress = animationFrame / totalFrames;
                
                // Smooth easing function
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                // Interpolate values
                followCamera.radius = initialRadius + (targetRadius - initialRadius) * easedProgress;
                followCamera.heightOffset = initialHeightOffset + (targetHeightOffset - initialHeightOffset) * easedProgress;
                                
                if (animationFrame < totalFrames) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }
}