import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

/**
 * Advanced Retargeting Utility
 * Handles mapping animations from a Source Skeleton (e.g., Mixamo, CMU BVH) to a Target Skeleton (Your Character).
 */

// --- Standard Bone Names (Mixamo / Humanoid) ---
const COMMON_BONE_NAMES: { [key: string]: string[] } = {
    Hips: ["Hips", "Pelvis", "Root", "Hip"],
    Spine: ["Spine", "Spine1", "Spine_01"],
    Spine1: ["Spine1", "Spine2", "Spine_02", "Chest"],
    Spine2: ["Spine2", "Spine3", "Spine_03", "UpperChest"],
    Neck: ["Neck", "Neck1"],
    Head: ["Head"],
    LeftUpLeg: ["LeftUpLeg", "L_Hip", "Left_Thigh", "L_Thigh", "Thigh_L"],
    LeftLeg: ["LeftLeg", "L_Knee", "Left_Knee", "L_Calf", "Calf_L"],
    LeftFoot: ["LeftFoot", "L_Ankle", "Left_Ankle", "L_Foot", "Foot_L"],
    RightUpLeg: ["RightUpLeg", "R_Hip", "Right_Thigh", "R_Thigh", "Thigh_R"],
    RightLeg: ["RightLeg", "R_Knee", "Right_Knee", "R_Calf", "Calf_R"],
    RightFoot: ["RightFoot", "R_Ankle", "Right_Ankle", "R_Foot", "Foot_R"],
    LeftShoulder: ["LeftShoulder", "L_Clavicle", "Left_Clavicle", "Clavicle_L"],
    LeftArm: ["LeftArm", "L_Shoulder", "Left_Shoulder", "L_UpperArm", "UpperArm_L"],
    LeftForeArm: ["LeftForeArm", "L_Elbow", "Left_Elbow", "L_Forearm", "Forearm_L"],
    LeftHand: ["LeftHand", "L_Wrist", "Left_Wrist", "L_Hand", "Hand_L"],
    RightShoulder: ["RightShoulder", "R_Clavicle", "Right_Clavicle", "Clavicle_R"],
    RightArm: ["RightArm", "R_Shoulder", "Right_Shoulder", "R_UpperArm", "UpperArm_R"],
    RightForeArm: ["RightForeArm", "R_Elbow", "Right_Elbow", "R_Forearm", "Forearm_R"],
    RightHand: ["RightHand", "R_Wrist", "Right_Wrist", "R_Hand", "Hand_R"],
};

/**
 * Finds a bone in the skeleton by fuzzy name matching.
 */
function findBone(skeleton: THREE.Skeleton, nameOrAlias: string): THREE.Bone | undefined {
    // 1. Exact match
    let bone = skeleton.bones.find((b) => b.name === nameOrAlias);
    if (bone) return bone;

    // 2. Case insensitive
    bone = skeleton.bones.find((b) => b.name.toLowerCase() === nameOrAlias.toLowerCase());
    if (bone) return bone;

    // 3. Strip Namespaces (e.g. "mixamorig:Hips" -> "Hips")
    const cleanName = nameOrAlias.split(":").pop()!;
    bone = skeleton.bones.find((b) => b.name === cleanName || b.name.toLowerCase() === cleanName.toLowerCase());
    if (bone) return bone;

    return undefined;
}

/**
 * Creates a map of SourceBoneName -> TargetBone based on common names.
 */
function createBoneMap(targetSkeleton: THREE.Skeleton, sourceClip: THREE.AnimationClip): Map<string, THREE.Bone> {
    const map = new Map<string, THREE.Bone>();
    const tracks = sourceClip.tracks;

    // Extract unique bone names from tracks
    const trackBoneNames = new Set<string>();
    tracks.forEach((t) => {
        // Track name format: "BoneName.position" or ".bones[BoneName].position"
        const name = t.name.replace(/^\.bones\[([^\]]+)\]/, "$1").split(".")[0];
        trackBoneNames.add(name);
    });

    trackBoneNames.forEach((sourceName) => {
        // 1. Try Direct Discovery
        let targetBone = findBone(targetSkeleton, sourceName);

        // 2. Try Dictionary Lookup
        if (!targetBone) {
            // Check if sourceName acts as a key in our dictionary (e.g. "Hips")
            // Or if sourceName is one of the aliases in the values
            for (const [standardName, aliases] of Object.entries(COMMON_BONE_NAMES)) {
                if (sourceName === standardName || aliases.includes(sourceName) || aliases.some(a => sourceName.toLowerCase().includes(a.toLowerCase()))) {
                    // This source bone corresponds to 'standardName'
                    // Now try to find that standard bone in the Target Skeleton
                    // We assume Target might use one of the aliases too
                    const possibleTargetNames = [standardName, ...aliases];
                    for (const possibleTarget of possibleTargetNames) {
                        const found = findBone(targetSkeleton, possibleTarget);
                        if (found) {
                            targetBone = found;
                            break;
                        }
                    }
                }
                if (targetBone) break;
            }
        }

        if (targetBone) {
            map.set(sourceName, targetBone);
        }
    });

    return map;
}

/**
 * Retargets an AnimationClip to a Target Skeleton.
 * Handles Scaling (Hip Height) and Quaternion Mapping.
 */
export function retargetClip(
    targetSkeleton: THREE.Skeleton,
    sourceClip: THREE.AnimationClip,
    options: {
        name?: string;
        hipScale?: boolean;
    } = { hipScale: true }
): THREE.AnimationClip {
    const boneMap = createBoneMap(targetSkeleton, sourceClip);
    const newTracks: THREE.KeyframeTrack[] = [];

    // --- 1. Calculate Scale Ratio (Optional but recommended for BVH on different sized chars) ---
    // We assume the first bone mapped to "Hips" is the root for motion
    // Measure rest pose height of Hips in Target
    let scaleRatio = 1.0;

    // Simple heuristic: Find "Hips"
    const hipsBone = findBone(targetSkeleton, "Hips") || targetSkeleton.bones[0];
    if (options.hipScale && hipsBone && hipsBone.parent) {
        // Ideally we compare with Source, but we don't have Source Skeleton passed here, only Clip.
        // We can infer source scale from the first frame of the position track if available.
        // For now, we will trust the user to adjust scale slider if needed, 
        // OR we can normalize position based on the first frame y-value to target hip y-value.
        // Let's implement dynamic scaling if we find a position track for hips.
    }

    sourceClip.tracks.forEach((track) => {
        // Parse track name
        // Supports both "Bone.property" and ".bones[Bone].property"
        let rawBoneName = track.name.replace(/^\.bones\[([^\]]+)\]/, "$1");
        const lastDot = rawBoneName.lastIndexOf(".");
        const prop = rawBoneName.substring(lastDot + 1); // position, quaternion, scale
        const boneName = rawBoneName.substring(0, lastDot);

        const targetBone = boneMap.get(boneName);
        if (!targetBone) return;

        // Clone times and values
        const times = Float32Array.from(track.times);
        let values = Float32Array.from(track.values);

        // --- Processing ---
        if (prop === "position") {
            // usually only apply position to Hips/Root to avoid dismembering the mesh
            // If it's not Hips, we might want to ignore position (rotation only FK)
            // Unless it's a specialized rig. Mixamo usually dictates only Hips translate.
            const isHips = targetBone.name.toLowerCase().includes("hip") || targetBone.name.toLowerCase().includes("root") || targetBone === targetSkeleton.bones[0];

            if (!isHips) {
                return; // Skip non-root translation for FK retargeting
            }

            // --- Auto-Scaling Logic ---
            if (options.hipScale) {
                // 1. Estimate Source Height from the first keyframe of this track (assuming Y is up)
                const sourceY = track.values[1];

                // 2. Estimate Target Height (Target Hip REST position world/local height)
                const targetY = targetBone.position.y;

                // 3. Calculate Ratio
                // Only if both are non-zero and reasonable
                if (Math.abs(sourceY) > 0.1 && Math.abs(targetY) > 0.1) {
                    scaleRatio = Math.abs(targetY / sourceY);
                }
            }

            // Apply scale to all values
            if (scaleRatio !== 1.0) {
                for (let i = 0; i < values.length; i++) {
                    values[i] *= scaleRatio;
                }
            }
        }

        if (prop === "quaternion") {
            // Basic Re-targeting: Just mapping values. 
            // Advanced: Would need Delta-Rotation from Rest Poses.
            // For now, we assume T-Pose to T-Pose or near enough.
        }

        // Create new track with standard name
        const newTrackName = `${targetBone.name}.${prop}`;
        if (prop === "quaternion") {
            newTracks.push(new THREE.QuaternionKeyframeTrack(newTrackName, times as any, values as any));
        } else if (prop === "position") {
            newTracks.push(new THREE.VectorKeyframeTrack(newTrackName, times as any, values as any));
        } else if (prop === "scale") {
            // Generally ignore scale in animations unless intentional
            // newTracks.push(new THREE.VectorKeyframeTrack(newTrackName, times as any, values as any));
        }
    });

    return new THREE.AnimationClip(
        options.name || sourceClip.name,
        sourceClip.duration,
        newTracks
    );
}

/**
 * Helper to get a dummy skeleton from a BVH/GLTF for analysis if needed.
 */
export function analyzeSkeleton(root: THREE.Object3D) {
    const skeleton = SkeletonUtils.clone(root);
    // ... helpers
    return skeleton;
}
