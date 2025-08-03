import { Vector3, Curve3 } from '@babylonjs/core';

export class JourneyPathCalculator {
    /**
     * Calculates a smooth path from the player position through the planet center
     * to the opposite side where the new biome will be
     */
    static calculateJourneyPath(
        playerPosition: Vector3,
        planetCenter: Vector3,
        planetRadius: number
    ): Curve3 {
        // 1. Calculate entry point (slightly below player)
        const playerDirection = playerPosition.subtract(planetCenter).normalize();
        const entryPoint = playerPosition.subtract(playerDirection.scale(0.5)); // 0.5 units below player
        
        // 2. Calculate planet center point
        const centerPoint = planetCenter.clone();
        
        // 3. Calculate exit point (opposite side of planet)
        const exitDirection = playerDirection.scale(-1); // Opposite direction
        const exitPoint = planetCenter.add(exitDirection.scale(planetRadius + 1)); // 1 unit above surface
        
        // 4. Create control points for smooth curve
        const controlPoint1 = Vector3.Lerp(entryPoint, centerPoint, 0.3);
        const controlPoint2 = Vector3.Lerp(centerPoint, exitPoint, 0.7);
        
        // 5. Create cubic bezier curve
        const pathPoints = [
            entryPoint,
            controlPoint1,
            controlPoint2,
            exitPoint
        ];
        
        // Generate smooth curve with enough points for smooth animation
        const curve = Curve3.CreateCubicBezier(
            pathPoints[0],
            pathPoints[1], 
            pathPoints[2],
            pathPoints[3],
            60 // 60 points for smooth movement
        );
        
        return curve;
    }
    
    /**
     * Gets a position along the journey path based on progress (0-1)
     */
    static getPositionAtProgress(curve: Curve3, progress: number): Vector3 {
        const clampedProgress = Math.max(0, Math.min(1, progress));
        const pointIndex = Math.floor(clampedProgress * (curve.getPoints().length - 1));
        return curve.getPoints()[pointIndex];
    }
    
    /**
     * Gets the direction the camera should look at a given progress point
     */
    static getDirectionAtProgress(curve: Curve3, progress: number): Vector3 {
        const points = curve.getPoints();
        const clampedProgress = Math.max(0, Math.min(1, progress));
        const pointIndex = Math.floor(clampedProgress * (points.length - 1));
        
        // Look towards the next point in the path
        const currentPoint = points[pointIndex];
        const nextPoint = points[Math.min(pointIndex + 1, points.length - 1)];
        
        return nextPoint.subtract(currentPoint).normalize();
    }
}