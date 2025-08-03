import { Camera, Mesh, FollowCamera } from '@babylonjs/core';
import { TransitionPhase } from './TransitionPhase';

export class ZoomOutPhase implements TransitionPhase {
    name = 'zoom-out';
    
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
            const targetRadius = 10; // Zoom out to normal distance
            const targetHeightOffset = 5;
            
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
                    console.log('Zoom out complete');
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }
}