"""
Blender Animation Retargeting Script
Automates the process of retargeting animations from source to target character.

Usage:
    blender --background --python export_animation.py -- \
        --character <character.fbx> \
        --animation <animation.fbx> \
        --output <output.fbx>
"""

import bpy
import sys
import os
import json
from mathutils import Vector

def clear_scene():
    """Remove all objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def import_fbx(filepath):
    """Import FBX file and return the armature object"""
    try:
        bpy.ops.import_scene.fbx(filepath=filepath)
        
        # Find the armature
        armature = None
        for obj in bpy.context.selected_objects:
            if obj.type == 'ARMATURE':
                armature = obj
                break
        
        if not armature:
            # Check all objects in scene
            for obj in bpy.data.objects:
                if obj.type == 'ARMATURE':
                    armature = obj
                    break
        
        return armature
    except Exception as e:
        print(f"ERROR: Failed to import FBX: {str(e)}")
        return None

def import_bvh(filepath):
    """Import BVH file and return the armature object"""
    try:
        bpy.ops.import_anim.bvh(filepath=filepath)
        
        # BVH creates an armature
        armature = None
        for obj in bpy.context.selected_objects:
            if obj.type == 'ARMATURE':
                armature = obj
                break
        
        return armature
    except Exception as e:
        print(f"ERROR: Failed to import BVH: {str(e)}")
        return None

def get_animation_data(armature):
    """Extract animation data from armature"""
    if not armature or not armature.animation_data:
        return None
    
    action = armature.animation_data.action
    if not action:
        return None
    
    return action

def create_bone_mapping(source_armature, target_armature):
    """
    Create automatic bone mapping between source and target armatures.
    Uses common naming conventions (Mixamo, etc.)
    """
    bone_map = {}
    
    source_bones = source_armature.data.bones
    target_bones = target_armature.data.bones
    
    # Common bone name mappings
    name_variations = {
        'hips': ['Hips', 'hips', 'pelvis', 'Pelvis', 'Root'],
        'spine': ['Spine', 'spine', 'Spine1'],
        'chest': ['Chest', 'chest', 'Spine2', 'UpperSpine'],
        'neck': ['Neck', 'neck', 'Neck1'],
        'head': ['Head', 'head', 'HeadTop_End'],
        
        # Left arm
        'l_shoulder': ['LeftShoulder', 'L_Shoulder', 'shoulder.L', 'Shoulder_L'],
        'l_arm': ['LeftArm', 'L_UpperArm', 'upper_arm.L', 'UpperArm_L'],
        'l_forearm': ['LeftForeArm', 'L_ForeArm', 'forearm.L', 'ForeArm_L'],
        'l_hand': ['LeftHand', 'L_Hand', 'hand.L', 'Hand_L'],
        
        # Right arm
        'r_shoulder': ['RightShoulder', 'R_Shoulder', 'shoulder.R', 'Shoulder_R'],
        'r_arm': ['RightArm', 'R_UpperArm', 'upper_arm.R', 'UpperArm_R'],
        'r_forearm': ['RightForeArm', 'R_ForeArm', 'forearm.R', 'ForeArm_R'],
        'r_hand': ['RightHand', 'R_Hand', 'hand.R', 'Hand_R'],
        
        # Left leg
        'l_upleg': ['LeftUpLeg', 'L_Thigh', 'thigh.L', 'Thigh_L'],
        'l_leg': ['LeftLeg', 'L_Shin', 'shin.L', 'Shin_L'],
        'l_foot': ['LeftFoot', 'L_Foot', 'foot.L', 'Foot_L'],
        
        # Right leg
        'r_upleg': ['RightUpLeg', 'R_Thigh', 'thigh.R', 'Thigh_R'],
        'r_leg': ['RightLeg', 'R_Shin', 'shin.R', 'Shin_R'],
        'r_foot': ['RightFoot', 'R_Foot', 'foot.R', 'Foot_R'],
    }
    
    # Try to match bones
    print("INFO: Starting bone mapping...")
    print(f"INFO: Source bones: {[b.name for b in source_bones]}")
    print(f"INFO: Target bones: {[b.name for b in target_bones]}")
    
    # helper for fuzzy match
    def fuzzy_match(name, candidates):
        name_lower = name.lower().replace("_", "").replace(".", "").replace(" ", "")
        best_match = None
        best_score = 0
        
        for cand in candidates:
            cand_lower = cand.name.lower().replace("_", "").replace(".", "").replace(" ", "")
            if name_lower in cand_lower or cand_lower in name_lower:
                # Simple score: length ratio
                score = len(name_lower) / len(cand_lower) if len(cand_lower) > len(name_lower) else len(cand_lower) / len(name_lower)
                if score > best_score:
                    best_score = score
                    best_match = cand.name
        
        return best_match if best_score > 0.6 else None

    # 1. Exact Name Match
    for bone in source_bones:
        if bone.name in target_bones:
            bone_map[bone.name] = bone.name

    # 2. Heuristic Match based on name variations
    for canonical_name, variations in name_variations.items():
        source_bone = None
        target_bone = None
        
        # Find source bone
        for variation in variations:
            # Check exact case
            if variation in source_bones:
                source_bone = variation
                break
            # Check case-insensitive
            for b in source_bones:
                if b.name.lower() == variation.lower():
                    source_bone = b.name
                    break
            if source_bone: break
        
        # Find target bone
        for variation in variations:
            if variation in target_bones:
                target_bone = variation
                break
            for b in target_bones:
                if b.name.lower() == variation.lower():
                    target_bone = b.name
                    break
            if target_bone: break
        
        if source_bone and target_bone:
            bone_map[source_bone] = target_bone

    # 3. Fuzzy Fallback if mapping is empty or sparse
    if len(bone_map) < 3:
        print("WARNING: Sparse mapping found. Attempting fuzzy matching...")
        for s_bone in source_bones:
            if s_bone.name not in bone_map:
                match = fuzzy_match(s_bone.name, target_bones)
                if match:
                    bone_map[s_bone.name] = match

    # 4. Fallback: If still empty, assume identically named bones are the intent (already covered by #1 but logging it)
    if not bone_map:
         print("WARNING: No intelligent mapping found. checking for direct name matches again.")
         for bone in source_bones:
            if bone.name in target_bones:
                bone_map[bone.name] = bone.name

    return bone_map

def retarget_animation(source_armature, target_armature, source_action):
    """
    Retarget animation from source to target armature.
    Creates a new action for the target armature.
    """
    # Debug: Print Blender Version and Action details
    print(f"INFO: Blender Version: {bpy.app.version}")
    print(f"INFO: Action Type: {type(source_action)}")
    
    # Blender 5.0+ uses layered actions - we need to extract fcurves differently
    if hasattr(source_action, 'is_action_layered') and source_action.is_action_layered:
        print("INFO: Detected Blender 5.x layered action - extracting animation data manually")
        
        # Create bone mapping first
        bone_map = create_bone_mapping(source_armature, target_armature)
        if not bone_map:
            print("ERROR: Could not create bone mapping")
            return None
        
        print(f"INFO: Mapped {len(bone_map)} bones")
        
        # Create new LEGACY action for target (important: new actions are legacy by default)
        new_action = bpy.data.actions.new(name=source_action.name)
        print(f"INFO: Created new action: {new_action.name}")
        
        # Method 1: Try to bake the animation to get fcurves
        # We'll apply the source action to source armature and bake it
        try:
            # Store original action
            original_action = source_armature.animation_data.action if source_armature.animation_data else None
            
            # Set source action
            if not source_armature.animation_data:
                source_armature.animation_data_create()
            source_armature.animation_data.action = source_action
            
            # Get frame range
            frame_start = int(source_action.frame_range[0]) if hasattr(source_action, 'frame_range') else 1
            frame_end = int(source_action.frame_range[1]) if hasattr(source_action, 'frame_range') else 250
            
            print(f"INFO: Baking animation from frame {frame_start} to {frame_end}")
            
            # Set target armature action
            if not target_armature.animation_data:
                target_armature.animation_data_create()
            target_armature.animation_data.action = new_action
            
            # Manually copy pose for each mapped bone at each frame
            for frame in range(frame_start, frame_end + 1):
                bpy.context.scene.frame_set(frame)
                
                # Copy pose for mapped bones
                for source_bone_name, target_bone_name in bone_map.items():
                    if source_bone_name in source_armature.pose.bones and target_bone_name in target_armature.pose.bones:
                        source_bone = source_armature.pose.bones[source_bone_name]
                        target_bone = target_armature.pose.bones[target_bone_name]
                        
                        # Copy transforms
                        target_bone.location = source_bone.location.copy()
                        target_bone.rotation_quaternion = source_bone.rotation_quaternion.copy()
                        target_bone.rotation_euler = source_bone.rotation_euler.copy()
                        target_bone.scale = source_bone.scale.copy()
                        
                        # Insert keyframes
                        target_bone.keyframe_insert(data_path="location", frame=frame)
                        target_bone.keyframe_insert(data_path="rotation_quaternion", frame=frame)
                        target_bone.keyframe_insert(data_path="rotation_euler", frame=frame)
                        target_bone.keyframe_insert(data_path="scale", frame=frame)
            
            # Restore original action
            if original_action:
                source_armature.animation_data.action = original_action
            
            print(f"INFO: Successfully baked {frame_end - frame_start + 1} frames")
            
            # QUALITY IMPROVEMENTS
            
            # 1. Set Scene Frame Range (Crucial for correct playback length)
            bpy.context.scene.frame_start = frame_start
            bpy.context.scene.frame_end = frame_end
            
            # 2. Apply Euler Filter and Interpolation (Safely)
            if hasattr(new_action, 'fcurves'):
                try:
                    for fc in new_action.fcurves:
                        # Linear interpolation for stability
                        for kp in fc.keyframe_points:
                            kp.interpolation = 'LINEAR'
                        
                        # Cyclic looping
                        mod = fc.modifiers.new('CYCLES')
                        mod.mode_after = 'REPEAT_OFFSET'
                        mod.mode_before = 'REPEAT_OFFSET'
                except Exception as e:
                    print(f"WARNING: Could not apply modifiers/interpolation: {e}")
            else:
                print("INFO: Skipping advanced curve modifiers (Blender 5.0 Action format)")

            return new_action
            
        except Exception as e:
            print(f"ERROR: Failed to bake animation: {e}")
            return None
    
    # Legacy path for Blender 4.x or legacy actions
    # Check if fcurves exists (API compatibility)
    if not hasattr(source_action, 'fcurves'):
        print(f"ERROR: Action object missing 'fcurves'. Available attributes: {dir(source_action)}")
        return None

    # Create bone mapping
    bone_map = create_bone_mapping(source_armature, target_armature)
    
    if not bone_map:
        print("ERROR: Could not create bone mapping")
        return None
    
    print(f"INFO: Mapped {len(bone_map)} bones")
    
    # Create new action for target
    new_action = bpy.data.actions.new(name=source_action.name)
    
    # Optimize: Iterate fcurves once instead of nested loop
    print(f"INFO: Processing {len(source_action.fcurves)} fcurves...")
    
    for fcurve in source_action.fcurves:
        # Check if this fcurve belongs to a mapped bone
        # data_path usually looks like: pose.bones["BoneName"].location
        
        # Fast string check
        matched_source_bone = None
        for source_bone in bone_map.keys():
            # precise check to avoid partial matches on similar names
            if f'"{source_bone}"' in fcurve.data_path or f"'{source_bone}'" in fcurve.data_path:
                matched_source_bone = source_bone
                break
        
        if matched_source_bone:
            target_bone = bone_map[matched_source_bone]
            
            # Create new data path
            new_data_path = fcurve.data_path.replace(f'"{matched_source_bone}"', f'"{target_bone}"')
            new_data_path = new_data_path.replace(f"'{matched_source_bone}'", f'"{target_bone}"') # normalize quotes
            
            try:
                new_fcurve = new_action.fcurves.new(
                    data_path=new_data_path,
                    index=fcurve.array_index
                )
                
                # Copy keyframes
                for keyframe in fcurve.keyframe_points:
                    new_fcurve.keyframe_points.insert(
                        keyframe.co[0],
                        keyframe.co[1]
                    ).interpolation = keyframe.interpolation
            except Exception as e:
                # print(f"WARNING: Failed to copy curve for {target_bone}: {e}")
                pass
    
    # Assign action to target armature
    if not target_armature.animation_data:
        target_armature.animation_data_create()
    
    target_armature.animation_data.action = new_action
    
    return new_action

def bake_animation(armature):
    """Bake animation to ensure all transformations are applied"""
    # Select armature
    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    
    # Get frame range
    if armature.animation_data and armature.animation_data.action:
        action = armature.animation_data.action
        frame_start = int(action.frame_range[0])
        frame_end = int(action.frame_range[1])
    else:
        frame_start = 1
        frame_end = 250
    
    # Bake animation
    try:
        bpy.ops.nla.bake(
            frame_start=frame_start,
            frame_end=frame_end,
            only_selected=False,
            visual_keying=True,
            clear_constraints=False,
            use_current_action=True,
            bake_types={'POSE'}
        )
        print(f"INFO: Baked animation from frame {frame_start} to {frame_end}")
    except Exception as e:
        print(f"WARNING: Bake failed, continuing anyway: {str(e)}")

def export_fbx(output_path, armature):
    """Export the character with animation to FBX"""
    try:
        # Select character and armature
        bpy.ops.object.select_all(action='DESELECT')
        
        # Select armature and all children
        armature.select_set(True)
        for obj in bpy.data.objects:
            if obj.parent == armature:
                obj.select_set(True)
        
        bpy.context.view_layer.objects.active = armature
        
        # Export FBX with full material support
        bpy.ops.export_scene.fbx(
            filepath=output_path,
            use_selection=True,
            # Include both armature and mesh with materials
            object_types={'ARMATURE', 'MESH'},
            use_mesh_modifiers=True,
            # Animation settings
            bake_anim=True,
            add_leaf_bones=False,
            bake_anim_use_all_bones=True,
            bake_anim_use_nla_strips=False,
            # Export ALL actions (as requested: add new animation, keep old ones)
            bake_anim_use_all_actions=True,
            # Material and texture settings (IMPORTANT for colors)
            path_mode='COPY',
            embed_textures=True,
            # Mesh settings - Preserve original geometry exactly
            mesh_smooth_type='OFF', # Don't add extra smoothing
            use_mesh_edges=True,
            use_tspace=True, # Tangent space for normal maps
            use_custom_props=True, # Keep custom properties
            # Bone axis - Standard for Game Engines/Mixamo
            primary_bone_axis='Y',
            secondary_bone_axis='X',
            # Armature settings
            armature_nodetype='NULL', # Better compatibility
            # Scale
            apply_scale_options='FBX_SCALE_ALL'
        )
        
        print(f"SUCCESS: Exported to {output_path}")
        return True
    except Exception as e:
        print(f"ERROR: Export failed: {str(e)}")
        return False

def main():
    """Main execution function"""
    # Parse command line arguments
    argv = sys.argv
    argv = argv[argv.index("--") + 1:]  # Get all args after --
    
    # Parse arguments
    args = {}
    i = 0
    while i < len(argv):
        if argv[i].startswith('--'):
            key = argv[i][2:]
            if i + 1 < len(argv):
                args[key] = argv[i + 1]
                i += 2
            else:
                i += 1
        else:
            i += 1
    
    # Validate required arguments
    required = ['character', 'animation', 'output']
    for req in required:
        if req not in args:
            print(f"ERROR: Missing required argument: --{req}")
            sys.exit(1)
    
    character_path = args['character']
    animation_path = args['animation']
    output_path = args['output']
    
    print(f"INFO: Character: {character_path}")
    print(f"INFO: Animation: {animation_path}")
    print(f"INFO: Output: {output_path}")
    
    # Clear scene
    clear_scene()
    
    # Import character (Check for existing armature)
    print("INFO: Importing character...")
    character_armature = import_fbx(character_path)
    
    # Import animation (Source)
    print("INFO: Importing animation source...")
    animation_extension = os.path.splitext(animation_path)[1].lower()
    if animation_extension == '.bvh':
        animation_armature = import_bvh(animation_path)
    else:
        animation_armature = import_fbx(animation_path)
        
    if not animation_armature:
        print("ERROR: Animation source has no armature/skeleton")
        sys.exit(3)
    animation_armature.name = "AnimationArmature_Source"
    
    # Get animation action (Extract before logic split)
    source_action = get_animation_data(animation_armature)
    if not source_action:
        print("ERROR: No animation data found in animation file")
        sys.exit(4)
    print(f"INFO: Found animation action: {source_action.name}")
    
    # ---------------------------------------------------------
    # SMART LOGIC: Check if target has armature
    # ---------------------------------------------------------
    if not character_armature:
        print("INFO: Target character has NO armature. Initiating Auto-Rig (Steal Skeleton)...")
        
        # 1. Find the mesh object
        target_mesh = None
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH' and obj.parent is None:
                target_mesh = obj
                break
        
        if not target_mesh:
            print("ERROR: No suitable mesh found for auto-rigging")
            sys.exit(2)
            
        print(f"INFO: Found target mesh: {target_mesh.name}")
        
        # 1.5 Cleanup Mesh (CRITICAL for Auto-Weighting)
        bpy.context.view_layer.objects.active = target_mesh
        bpy.ops.object.select_all(action='DESELECT')
        target_mesh.select_set(True)
        
        # Apply Transforms first
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        
        # Remove Doubles & Recalc Normals
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.001)
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # 2. Duplicate Source Armature
        bpy.ops.object.select_all(action='DESELECT')
        animation_armature.select_set(True)
        bpy.context.view_layer.objects.active = animation_armature
        
        new_armature = bpy.context.object
        new_armature.name = "AutoRigged_Armature"
        
        # 2.5 RESET POSE (CRITICAL for Binding)
        # If the source armature is in a pose (e.g. running), binding a T-pose mesh to it will fail.
        # We must reset the duplicate armature to Rest Pose.
        bpy.ops.object.mode_set(mode='POSE')
        bpy.ops.pose.transforms_clear()
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # 3. Parent Mesh to New Armature with Automatic Weights
        bpy.ops.object.select_all(action='DESELECT')
        target_mesh.select_set(True)
        new_armature.select_set(True)
        bpy.context.view_layer.objects.active = new_armature
        
        # Scale Check: If mesh is too small/large, the heat solver fails.
        # We try to ensure the armature + mesh are at a "reasonable" size (approx 2m)
        # Note: We duplicate and scale the armature to match the mesh if needed?
        # Actually it's safer to ensure the source animation armature determines the scale.
        # We will assume the User's mesh should match the Armature's scale.
        
        # Force the mesh to be parented
        print("INFO: Binding mesh to armature with Automatic Weights...")
        try:
            bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        except Exception as e:
            print(f"WARNING: Auto-weight failure: {e}. Falling back to envelope.")
            bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')
            
        character_armature = new_armature
        
        # Since we stole the skeleton, it already has the animation!
        if not character_armature.animation_data:
             character_armature.animation_data_create()
        character_armature.animation_data.action = source_action
        print(f"INFO: Assigned action {source_action.name} to new rig")

    else:
        print(f"INFO: Target character HAS armature: {character_armature.name}. Initiating Retargeting...")
        
        # Standard Retargeting Flow
        character_armature.name = "CharacterArmature"
    
        # Retarget animation
        print("INFO: Retargeting animation...")
        retargeted_action = retarget_animation(
            animation_armature,
            character_armature,
            source_action
        )
        
        if not retargeted_action:
            print("ERROR: Retargeting failed")
            sys.exit(5)
    
    # ---------------------------------------------------------
    
    # Bake animation
    print("INFO: Baking animation...")
    bake_animation(character_armature)
    
    # Ensure final action gets the source name (in case baking changed it)
    if character_armature.animation_data and character_armature.animation_data.action:
        # Sanitize name
        final_name = source_action.name
        # Remove any potential suffixes/prefixes if needed, but user asked for exact original
        character_armature.animation_data.action.name = final_name
        print(f"INFO: Final action name set to: {final_name}")
    
    # Export
    print("INFO: Exporting...")
    success = export_fbx(output_path, character_armature)
    
    # Remove animation armature (Cleanup after export to avoid StructRNA errors)
    try:
        if animation_armature:
            bpy.data.objects.remove(animation_armature, do_unlink=True)
    except:
        pass
    
    if success:
        print("SUCCESS: Export completed successfully")
        sys.exit(0)
    else:
        print("ERROR: Export failed")
        sys.exit(6)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR: Unhandled exception: {str(e)}")
        sys.exit(1)
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
