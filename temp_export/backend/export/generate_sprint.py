import bpy
import sys
import os
import math
from mathutils import Vector, Euler

def import_model(filepath):
    try:
        ext = os.path.splitext(filepath)[1].lower()
        if ext == '.fbx':
            bpy.ops.import_scene.fbx(filepath=filepath)
        elif ext == '.gltf' or ext == '.glb':
            bpy.ops.import_scene.gltf(filepath=filepath)
        else:
            print(f"ERROR: Unsupported format {ext}")
            return None
            
        armature = None
        for obj in bpy.context.selected_objects:
            if obj.type == 'ARMATURE':
                armature = obj
                break
        return armature
    except Exception as e:
        print(f"ERROR: Import failed: {e}")
        return None

def find_bones(armature):
    # Mapping similar to export_animation.py
    bones = armature.pose.bones
    mapping = {}
    
    def find(names):
        for name in names:
            for b in bones:
                if name.lower() in b.name.lower():
                    return b
        return None

    mapping['hips'] = find(['Hips', 'Root', 'Pelvis'])
    mapping['spine'] = find(['Spine'])
    mapping['chest'] = find(['Chest', 'Spine1', 'Spine2'])
    
    mapping['thigh_l'] = find(['LeftUpLeg', 'L_Thigh', 'Thigh_L', 'UpLeg.L'])
    mapping['shin_l'] = find(['LeftLeg', 'L_SHin', 'Shin_L', 'Leg.L'])
    mapping['foot_l'] = find(['LeftFoot', 'L_Foot', 'Foot_L'])
    
    mapping['thigh_r'] = find(['RightUpLeg', 'R_Thigh', 'Thigh_R', 'UpLeg.R'])
    mapping['shin_r'] = find(['RightLeg', 'R_SHin', 'Shin_R', 'Leg.R'])
    mapping['foot_r'] = find(['RightFoot', 'R_Foot', 'Foot_R'])
    
    mapping['arm_l'] = find(['LeftArm', 'L_UpperArm', 'Arm_L'])
    mapping['forearm_l'] = find(['LeftForeArm', 'L_ForeArm', 'ForeArm_L'])
    
    mapping['arm_r'] = find(['RightArm', 'R_UpperArm', 'Arm_R'])
    mapping['forearm_r'] = find(['RightForeArm', 'R_ForeArm', 'ForeArm_R'])
    
    return mapping

def generate_sprint_action(armature):
    action = bpy.data.actions.new("Sprint_Pro")
    if not armature.animation_data:
        armature.animation_data_create()
    armature.animation_data.action = action
    
    bone_map = find_bones(armature)
    
    # Sprint Parameters
    duration = 18 # frames for one cycle
    fps = 24
    
    def rad(deg): return math.radians(deg)
    
    print("INFO: Generating Keyframes...")
    
    for frame in range(0, duration + 1):
        phase = (frame / duration) * 2 * math.pi
        
        # Hips (Bobbing Up/Down)
        if bone_map['hips']:
            hips = bone_map['hips']
            hips.rotation_mode = 'XYZ'
            hips.location.z = math.sin(phase * 2) * 0.05
            hips.location.y = math.sin(phase) * 0.05
            hips.keyframe_insert("location", frame=frame)
            
        # Spine (Counter-rotation)
        if bone_map['spine']:
            bone_map['spine'].rotation_mode = 'XYZ'
            bone_map['spine'].rotation_euler.z = math.sin(phase) * 0.1
            bone_map['spine'].keyframe_insert("rotation_euler", frame=frame)

        # Legs (Running Cycle)
        # Left Leg
        if bone_map['thigh_l']:
            b = bone_map['thigh_l']
            b.rotation_mode = 'XYZ'
            b.rotation_euler.x = rad(40) * math.sin(phase) + rad(10)
            b.keyframe_insert("rotation_euler", frame=frame)
            
        if bone_map['shin_l']:
            b = bone_map['shin_l']
            b.rotation_mode = 'XYZ'
            # Knee bends only backward (positive X usually)
            bend = math.sin(phase)
            b.rotation_euler.x = rad(60) + rad(50) * bend
            b.keyframe_insert("rotation_euler", frame=frame)
            
        # Right Leg (Phase offset pi)
        if bone_map['thigh_r']:
            b = bone_map['thigh_r']
            b.rotation_mode = 'XYZ'
            b.rotation_euler.x = rad(40) * math.sin(phase + math.pi) + rad(10)
            b.keyframe_insert("rotation_euler", frame=frame)

        if bone_map['shin_r']:
            b = bone_map['shin_r']
            b.rotation_mode = 'XYZ'
            bend = math.sin(phase + math.pi)
            b.rotation_euler.x = rad(60) + rad(50) * bend
            b.keyframe_insert("rotation_euler", frame=frame)
            
        # Arms (Counter-swing to legs)
        # Left Arm (matches Right Leg phase)
        if bone_map['arm_l']:
            b = bone_map['arm_l']
            b.rotation_mode = 'XYZ'
            b.rotation_euler.x = rad(50) * math.sin(phase + math.pi)
            b.rotation_euler.z = rad(-20) # A-pose correction
            b.keyframe_insert("rotation_euler", frame=frame)
            
        if bone_map['forearm_l']:
            b = bone_map['forearm_l']
            b.rotation_mode = 'XYZ'
            b.rotation_euler.x = rad(80) # Bent elbow
            b.keyframe_insert("rotation_euler", frame=frame)

        # Right Arm (matches Left Leg phase)
        if bone_map['arm_r']:
            b = bone_map['arm_r']
            b.rotation_mode = 'XYZ'
            b.rotation_euler.x = rad(50) * math.sin(phase)
            b.rotation_euler.z = rad(20)
            b.keyframe_insert("rotation_euler", frame=frame)

        if bone_map['forearm_r']:
            b = bone_map['forearm_r']
            b.rotation_mode = 'XYZ'
            b.rotation_euler.x = rad(80)
            b.keyframe_insert("rotation_euler", frame=frame)
            
    # Apply Cyclic Modifiers
    if hasattr(action, 'fcurves'):
        try:
            for fc in action.fcurves:
                mod = fc.modifiers.new('CYCLES')
                mod.mode_after = 'REPEAT_OFFSET'
                mod.mode_before = 'REPEAT_OFFSET'
        except Exception as e:
            print(f"WARNING: Could not apply cyclic modifiers: {e}")
    else:
        print("INFO: Skipping cyclic modifiers (Blender 5.0 Action format)")
        
    return action

def export_fbx(output_path):
    bpy.ops.export_scene.fbx(
        filepath=output_path,
        use_selection=False,
        mesh_smooth_type='OFF',
        add_leaf_bones=False,
        primary_bone_axis='Y',
        secondary_bone_axis='X',
        bake_anim=True,
        bake_anim_use_all_actions=True, # Keep other animations
        path_mode='COPY',
        embed_textures=True
    )

def main():
    argv = sys.argv
    try:
        idx = argv.index("--")
        argv = argv[idx + 1:]
        input_path = argv[0]
        output_path = argv[1]
    except:
        print("Usage: blender -P generate_sprint.py -- <input> <output>")
        sys.exit(1)
        
    print(f"INFO: Importing {input_path}")
    # Clear and Import
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
    armature = import_model(input_path)
    if not armature:
        print("ERROR: No armature found")
        sys.exit(1)
        
    print("INFO: Generating Sprint Animation...")
    generate_sprint_action(armature)
    
    print(f"INFO: Exporting to {output_path}")
    export_fbx(output_path)
    print("SUCCESS")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
