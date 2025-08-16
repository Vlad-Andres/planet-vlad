import { Camera, Mesh, FollowCamera, PostProcess, Effect } from '@babylonjs/core';
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
            const scene = followCamera.getScene();

            // Register shader only once (eyelid-style vertical mask)
            if (!Effect.ShadersStore["eyelidCloseFragmentShader"]) {
                Effect.ShadersStore["eyelidCloseFragmentShader"] = `
                precision highp float;
                varying vec2 vUV;
                uniform sampler2D textureSampler;
                uniform float openHeight;  // half-height of the visible slit (can be negative to force full close)
                uniform float softness;    // softness width of eyelid edge
                uniform float centerY;     // vertical center of the slit
                uniform float curvature;   // 0.0 flat eyelids, 1.0 strong curvature

                void main(void) {
                    vec4 color = texture2D(textureSampler, vUV);
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
                ["openHeight", "softness", "centerY", "curvature"],
                null,
                1.0,
                followCamera
            );

            // Initial values
            let openHeight = 0.5;     // fully open (entire screen visible)
            const minOpen = -0.25;    // overshoot negative to ensure full black at center
            const maxOpen = 0.5;      // fully open
            const softness = 0.08;    // slightly crisper close
            const centerY = 0.5;      // close to camera center
            const curvature = 0.45;   // eyelid curvature intensity

            // Timing
            let frame = 0;
            const closeFrames = 40; // ~0.65s
            const holdFrames = 10;  // brief hold
            const openFrames = 40;  // ~0.65s
            const totalFrames = closeFrames + holdFrames + openFrames;

            let switched = false;

            const easeInOutCubic = (t: number): number => {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            };

            eyelid.onApply = (effect: Effect) => {
                effect.setFloat("openHeight", openHeight);
                effect.setFloat("softness", softness);
                effect.setFloat("centerY", centerY);
                effect.setFloat("curvature", curvature);
            };

            const animate = () => {
                frame++;
                if (frame <= closeFrames) {
                    const raw = frame / closeFrames;
                    const eased = easeInOutCubic(raw);
                    openHeight = maxOpen + (minOpen - maxOpen) * eased; // close
                } else if (frame <= closeFrames + holdFrames) {
                    openHeight = minOpen;
                    if (!switched) {
                        BiomeManager.goToNextBiome(scene);
                        switched = true;
                    }
                } else {
                    const raw = (frame - closeFrames - holdFrames) / openFrames;
                    const eased = easeInOutCubic(raw);
                    openHeight = minOpen + (maxOpen - minOpen) * eased; // open
                }

                if (frame < totalFrames) {
                    requestAnimationFrame(animate);
                } else {
                    // Cleanup
                    eyelid.dispose();
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }
}