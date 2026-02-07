'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Landmark3D, JointStress, PoseLandmark } from '@/types';

export interface Avatar3DProps {
    landmarks: Landmark3D[] | null;
    jointStresses: JointStress[];
    width?: number;
    height?: number;
}

// Skeleton connections
const SKELETON_CONNECTIONS: [PoseLandmark, PoseLandmark][] = [
    // Torso
    [PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER],
    [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_HIP],
    [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_HIP],
    [PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP],
    // Left arm
    [PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_ELBOW],
    [PoseLandmark.LEFT_ELBOW, PoseLandmark.LEFT_WRIST],
    // Right arm
    [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_ELBOW],
    [PoseLandmark.RIGHT_ELBOW, PoseLandmark.RIGHT_WRIST],
    // Left leg
    [PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_KNEE],
    [PoseLandmark.LEFT_KNEE, PoseLandmark.LEFT_ANKLE],
    // Right leg
    [PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_KNEE],
    [PoseLandmark.RIGHT_KNEE, PoseLandmark.RIGHT_ANKLE],
    // Neck
    [PoseLandmark.LEFT_SHOULDER, PoseLandmark.NOSE],
    [PoseLandmark.RIGHT_SHOULDER, PoseLandmark.NOSE],
];

// Main joint indices
const MAIN_JOINTS = [
    PoseLandmark.NOSE,
    PoseLandmark.LEFT_SHOULDER, PoseLandmark.RIGHT_SHOULDER,
    PoseLandmark.LEFT_ELBOW, PoseLandmark.RIGHT_ELBOW,
    PoseLandmark.LEFT_WRIST, PoseLandmark.RIGHT_WRIST,
    PoseLandmark.LEFT_HIP, PoseLandmark.RIGHT_HIP,
    PoseLandmark.LEFT_KNEE, PoseLandmark.RIGHT_KNEE,
    PoseLandmark.LEFT_ANKLE, PoseLandmark.RIGHT_ANKLE,
];

const STRESS_COLORS = {
    good: 0x00ff88,
    warning: 0xffaa00,
    bad: 0xff3333,
    default: 0x00ffff,
};

export default function Avatar3D({
    landmarks,
    jointStresses,
    width = 400,
    height = 400,
}: Avatar3DProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const jointMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
    const boneMeshesRef = useRef<THREE.Line[]>([]);
    const animationFrameRef = useRef<number>();

    // Get stress color for a joint
    const getJointColor = useMemo(() => {
        const stressMap = new Map<number, string>();
        jointStresses.forEach(stress => {
            stressMap.set(stress.jointId, stress.stressLevel);
        });

        return (jointId: number): number => {
            const level = stressMap.get(jointId);
            if (level) {
                return STRESS_COLORS[level as keyof typeof STRESS_COLORS];
            }
            return STRESS_COLORS.default;
        };
    }, [jointStresses]);

    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a1a);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 0, 3);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // Grid helper
        const gridHelper = new THREE.GridHelper(4, 20, 0x333366, 0x222244);
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.position.z = -0.5;
        scene.add(gridHelper);

        // Create joint spheres
        MAIN_JOINTS.forEach(jointId => {
            const geometry = new THREE.SphereGeometry(0.05, 8, 8); // Reduced detail
            const material = new THREE.MeshPhongMaterial({
                color: STRESS_COLORS.default,
                emissive: STRESS_COLORS.default,
                emissiveIntensity: 0.3,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.visible = false;
            scene.add(mesh);
            jointMeshesRef.current.set(jointId, mesh);
        });

        // Create bone lines
        SKELETON_CONNECTIONS.forEach(() => {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const material = new THREE.LineBasicMaterial({
                color: 0x00ffff,
                linewidth: 2,
                transparent: true,
                opacity: 0.8,
            });

            const line = new THREE.Line(geometry, material);
            line.visible = false;
            scene.add(line);
            boneMeshesRef.current.push(line);
        });

        // Animation loop
        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);

            // Slowly rotate the view
            if (scene) {
                scene.rotation.y = Math.sin(Date.now() * 0.0005) * 0.2;
            }

            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            renderer.dispose();
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, [width, height]);

    // Update avatar with new landmarks
    useEffect(() => {
        if (!landmarks || !sceneRef.current) return;

        // Update joint positions and colors
        MAIN_JOINTS.forEach(jointId => {
            const mesh = jointMeshesRef.current.get(jointId);
            const landmark = landmarks[jointId];

            if (mesh && landmark && (landmark.visibility ?? 1) > 0.5) {
                // Convert normalized coordinates to 3D space
                // Flip X for mirror effect, center the coordinates
                mesh.position.set(
                    -(landmark.x - 0.5) * 2,
                    -(landmark.y - 0.5) * 2,
                    landmark.z * 2
                );
                mesh.visible = true;

                // Update color based on stress
                const color = getJointColor(jointId);
                (mesh.material as THREE.MeshPhongMaterial).color.setHex(color);
                (mesh.material as THREE.MeshPhongMaterial).emissive.setHex(color);
            } else if (mesh) {
                mesh.visible = false;
            }
        });

        // Update bone connections
        SKELETON_CONNECTIONS.forEach((connection, index) => {
            const [startId, endId] = connection;
            const startLandmark = landmarks[startId];
            const endLandmark = landmarks[endId];
            const line = boneMeshesRef.current[index];

            if (line && startLandmark && endLandmark &&
                (startLandmark.visibility ?? 1) > 0.5 &&
                (endLandmark.visibility ?? 1) > 0.5) {

                const positions = line.geometry.attributes.position.array as Float32Array;

                positions[0] = -(startLandmark.x - 0.5) * 2;
                positions[1] = -(startLandmark.y - 0.5) * 2;
                positions[2] = startLandmark.z * 2;

                positions[3] = -(endLandmark.x - 0.5) * 2;
                positions[4] = -(endLandmark.y - 0.5) * 2;
                positions[5] = endLandmark.z * 2;

                line.geometry.attributes.position.needsUpdate = true;
                line.visible = true;
            } else if (line) {
                line.visible = false;
            }
        });
    }, [landmarks, getJointColor]);

    return (
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
            <div ref={containerRef} style={{ width, height }} />

            {/* Label */}
            <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-cyan-400 text-sm font-medium">
                3D Digital Twin
            </div>

            {/* Legend */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00ff88' }} />
                    <span>Good Form</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffaa00' }} />
                    <span>Warning</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff3333' }} />
                    <span>Bad Form</span>
                </div>
            </div>

            {/* No pose detected overlay */}
            {!landmarks && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <p className="text-slate-400 text-sm">Waiting for pose detection...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
