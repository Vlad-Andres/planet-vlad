import { Camera, Mesh, FollowCamera } from '@babylonjs/core';
import { TransitionPhase } from './TransitionPhase';
import { BiomeManager } from '../../managers/BiomeManager';

export class TunnelJourneyPhase implements TransitionPhase {
    name = 'tunnel-journey';
    
    constructor(private camera: Camera, private player: Mesh, private planet: Mesh) {}
    
    async execute(): Promise<void> {
        return new Promise((resolve) => {
            if (!(this.camera instanceof FollowCamera)) {
                resolve();
                return;
            }
            
            const followCamera = this.camera as FollowCamera;
            this.closeEyesWithVideoEffect(followCamera).then(() => {
                resolve();
            });
        });
    }
    
    private closeEyesWithVideoEffect(followCamera: FollowCamera): Promise<void> {
        return new Promise((resolve) => {
            const originalFov = followCamera.fov;
            const scene = followCamera.getScene();
            
            // Create video element
            const video = document.createElement('video');
            video.src = '/planet-vlad/videos/travel.mp4';
            video.loop = false;
            video.muted = true;
            video.style.position = 'fixed';
            video.style.top = '0';
            video.style.left = '0';
            video.style.width = '100vw';
            video.style.height = '100vh';
            video.style.objectFit = 'cover';
            video.style.zIndex = '1000';
            video.style.display = 'none';
            document.body.appendChild(video);
            
            let frame = 0;
            const closeFrames = 30;      // 1s to close eyes (faster)
            const blackFrames = 5;      // 0.25s black screen (shorter)
            const videoFrames = 60;     // 2s video duration (reduced from 4s)
            const openFrames = 30;       // 1s to open eyes (faster)
            const totalFrames = closeFrames + blackFrames + videoFrames + openFrames;
            
            let videoStarted = false;
            let environmentChanged = false;
            
            // Smooth easing function for natural eye movement
            const easeInOutCubic = (t: number): number => {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            };
            
            const animate = () => {
                frame++;
                
                if (frame <= closeFrames) {
                    // Phase 1: Close eyes smoothly by reducing FOV
                    const rawProgress = frame / closeFrames;
                    const smoothProgress = easeInOutCubic(rawProgress);
                    followCamera.fov = originalFov * (1 - smoothProgress);
                    
                } else if (frame <= closeFrames + blackFrames) {
                    // Phase 2: Eyes completely closed (FOV = 0)
                    followCamera.fov = 0;
                    
                } else if (frame <= closeFrames + blackFrames + videoFrames) {
                    // Phase 3: Show video while eyes are closed
                    followCamera.fov = 0; // Keep eyes closed
                    
                    if (!videoStarted) {
                        video.style.display = 'block';
                        video.play();
                        videoStarted = true;
                    }
                    
                    // Change environment halfway through the video
                    if (!environmentChanged && frame >= closeFrames + blackFrames + (videoFrames / 2)) {
                        BiomeManager.goToNextBiome(scene);
                        environmentChanged = true;
                    }
                    
                } else {
                    // Phase 4: Hide video and open eyes by restoring FOV
                    if (videoStarted) {
                        video.style.display = 'none';
                        video.pause();
                        videoStarted = false;
                    }
                    
                    const rawProgress = (frame - closeFrames - blackFrames - videoFrames) / openFrames;
                    const smoothProgress = easeInOutCubic(rawProgress);
                    followCamera.fov = originalFov * smoothProgress;
                }
                
                if (frame < totalFrames) {
                    requestAnimationFrame(animate);
                } else {
                    // Restore original FOV
                    followCamera.fov = originalFov;
                    
                    // Clean up video element
                    if (document.body.contains(video)) {
                        document.body.removeChild(video);
                    }
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }
}