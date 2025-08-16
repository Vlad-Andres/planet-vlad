import { Camera, Mesh, FollowCamera, PostProcess, Effect, Vector3, Scene } from '@babylonjs/core';
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
            this.closeEyesWithEyelidEffect(followCamera).then(() => {
                resolve();
            });
        });
    }
    
    private closeEyesWithEyelidEffect(followCamera: FollowCamera): Promise<void> {
        return new Promise((resolve) => {
            const scene = followCamera.getScene() as Scene;

            // Register enhanced shader with blur effect
            if (!Effect.ShadersStore["eyelidCloseFragmentShader"]) {
                Effect.ShadersStore["eyelidCloseFragmentShader"] = `
                precision highp float;
                varying vec2 vUV;
                uniform sampler2D textureSampler;
                uniform float openHeight;  // half-height of the visible slit (can be negative to force full close)
                uniform float softness;    // softness width of eyelid edge
                uniform float centerY;     // vertical center of the slit
                uniform float curvature;   // 0.0 flat eyelids, 1.0 strong curvature
                uniform float blurStrength; // blur intensity (0.0 no blur, 1.0 max blur)
                uniform vec2 resolution;   // screen resolution for blur sampling

                void main(void) {
                    vec4 color = vec4(0.0);
                    
                    // Apply blur when blurStrength > 0
                    if (blurStrength > 0.01) {
                        float blur = blurStrength * 0.008; // blur radius
                        int samples = 9;
                        float weight = 1.0 / float(samples);
                        
                        // Simple box blur
                        for (int x = -1; x <= 1; x++) {
                            for (int y = -1; y <= 1; y++) {
                                vec2 offset = vec2(float(x), float(y)) * blur;
                                color += texture2D(textureSampler, vUV + offset) * weight;
                            }
                        }
                    } else {
                        color = texture2D(textureSampler, vUV);
                    }
                    
                    // Horizontal distance from center (0..1)
                    float x = abs(vUV.x - 0.5) * 2.0;
                    // Curved eyelid: reduce opening more toward edges
                    float curveFactor = clamp(1.0 - curvature * x * x, 0.0, 1.0);
                    // allow negative to fully close
                    float localOpen = openHeight * curveFactor;
                    // Distance from current pixel to slit center along Y
                    float d = abs(vUV.y - centerY);
                    // Edge factor: 0 inside slit (fully visible), 1 outside (fully black)
                    float edge = smoothstep(localOpen, localOpen + softness, d);
                    // If localOpen is sufficiently negative, force full black
                    edge = (localOpen <= -0.05) ? 1.0 : edge;
                    vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
                    gl_FragColor = mix(color, black, edge);
                }
                `;
            }

            const eyelid = new PostProcess(
                "EyelidClose",
                "eyelidClose",
                ["openHeight", "softness", "centerY", "curvature", "blurStrength", "resolution"],
                null,
                1.0,
                followCamera
            );

            // Initial values
            let openHeight = 0.5;     // fully open (entire screen visible)
            let blurStrength = 0.0;   // no blur initially
            const minOpen = -0.35;    // overshoot negative to ensure full black at center
            const maxOpen = 0.5;      // fully open
            const softness = 0.08;    // slightly crisper close
            const centerY = 0.5;      // close to camera center
            const curvature = 0.45;   // eyelid curvature intensity

            // Camera drunk effect variables
            const originalPosition = followCamera.position.clone();
            let cameraWobble = 0.0;
            let cameraRotation = 0.0;

            // Timing
            let frame = 0;
            const closeFrames = 50; // ~0.85s - slower for drunk effect
            const holdFrames = 15;  // longer hold for sleep effect
            const openFrames = 60;  // ~1.0s - slower wake up
            const totalFrames = closeFrames + holdFrames + openFrames;

            let switched = false;

            const easeInOutCubic = (t: number): number => {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            };

            const easeOutQuart = (t: number): number => {
                return 1 - Math.pow(1 - t, 4);
            };

            eyelid.onApply = (effect: Effect) => {
                effect.setFloat("openHeight", openHeight);
                effect.setFloat("softness", softness);
                effect.setFloat("centerY", centerY);
                effect.setFloat("curvature", curvature);
                effect.setFloat("blurStrength", blurStrength);
                effect.setFloat2("resolution", scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight());
            };

            const ensureRotation = () => {
                (followCamera as any).rotation = (followCamera as any).rotation || new Vector3();
            };

            const animate = () => {
                frame++;
                
                if (frame <= closeFrames) {
                    // Closing eyes - getting drowsy
                    const raw = frame / closeFrames;
                    const eased = easeInOutCubic(raw);
                    openHeight = maxOpen + (minOpen - maxOpen) * eased;
                    
                    // Increase blur as eyes close
                    blurStrength = eased * 0.8;
                    
                    // Camera drunk wobble - getting stronger
                    cameraWobble = eased * 0.15;
                    cameraRotation = Math.sin(frame * 0.1) * eased * 0.02;
                    
                    // Apply camera movement
                    const wobbleOffset = new Vector3(
                        Math.sin(frame * 0.08) * cameraWobble,
                        Math.cos(frame * 0.06) * cameraWobble * 0.5,
                        Math.sin(frame * 0.12) * cameraWobble * 0.3
                    );
                    followCamera.position = originalPosition.add(wobbleOffset);
                    ensureRotation();
                    (followCamera as any).rotation.z = cameraRotation;
                    
                } else if (frame <= closeFrames + holdFrames) {
                    // Fully asleep
                    openHeight = minOpen;
                    blurStrength = 0.9;
                    cameraWobble = 0.05; // minimal movement while asleep
                    
                    if (!switched) {
                        BiomeManager.goToNextBiome(scene);
                        switched = true;
                    }
                    
                } else {
                    // Waking up - opening eyes
                    const raw = (frame - closeFrames - holdFrames) / openFrames;
                    const eyeEased = easeOutQuart(raw); // slower eye opening
                    const blurEased = easeInOutCubic(raw); // faster blur clearing
                    
                    openHeight = minOpen + (maxOpen - minOpen) * eyeEased;
                    
                    // Clear blur gradually but faster than eye opening
                    blurStrength = 0.9 * (1 - blurEased);
                    
                    // Camera stabilizing from drunk state
                    cameraWobble = 0.15 * (1 - easeInOutCubic(raw));
                    cameraRotation = Math.sin(frame * 0.08) * (1 - easeInOutCubic(raw)) * 0.015;
                    
                    // Apply camera movement
                    if (cameraWobble > 0.01) {
                        const wobbleOffset = new Vector3(
                            Math.sin(frame * 0.08) * cameraWobble,
                            Math.cos(frame * 0.06) * cameraWobble * 0.5,
                            Math.sin(frame * 0.12) * cameraWobble * 0.3
                        );
                        followCamera.position = originalPosition.add(wobbleOffset);
                        ensureRotation();
                        (followCamera as any).rotation.z = cameraRotation;
                    } else {
                        // Restore original position
                        followCamera.position = originalPosition;
                        ensureRotation();
                        (followCamera as any).rotation.z = 0;
                    }
                }

                if (frame < totalFrames) {
                    requestAnimationFrame(animate);
                } else {
                    // Final cleanup - ensure camera is fully restored
                    followCamera.position = originalPosition;
                    ensureRotation();
                    (followCamera as any).rotation.z = 0;
                    eyelid.dispose();
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }
}