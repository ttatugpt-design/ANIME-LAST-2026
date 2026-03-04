import bpy
import sys
import os
import math
from mathutils import Vector, Matrix

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def import_model(filepath):
    try:
        ext = os.path.splitext(filepath)[1].lower()
        if ext == '.fbx':
            bpy.ops.import_scene.fbx(filepath=filepath)
        elif ext == '.obj':
            bpy.ops.import_scene.obj(filepath=filepath)
        elif ext == '.gltf' or ext == '.glb':
            bpy.ops.import_scene.gltf(filepath=filepath)
        else:
            print(f"ERROR: Unsupported format {ext}")
            return None
            
        # Join meshes if multiple
        meshes = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']
        if not meshes:
            print("ERROR: No mesh found")
            return None
            
        bpy.context.view_layer.objects.active = meshes[0]
        if len(meshes) > 1:
            bpy.ops.object.join()
            
        return bpy.context.object
    except Exception as e:
        print(f"ERROR: Import failed: {e}")
        return None

def apply_transforms(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def create_humanoid_rig(mesh_obj):
    # Calculate bounds to size the rig
    bbox = [mesh_obj.matrix_world @ Vector(corner) for corner in mesh_obj.bound_box]
    min_z = min([v.z for v in bbox])
    max_z = max([v.z for v in bbox])
    height = max_z - min_z
    center = sum(bbox, Vector()) / 8.0
    
    print(f"INFO: Mesh height: {height}")
    
    # Creaate Armature
    bpy.ops.object.armature_add(enter_editmode=True, location=(center.x, center.y, min_z))
    armature = bpy.context.object
    armature.name = "AutoRig_Armature"
    
    amt = armature.data
    
    # Remove default bone
    bpy.ops.armature.select_all(action='SELECT')
    bpy.ops.armature.delete()
    
    # Helper to add bone
    def add_bone(name, head, tail, parent=None):
        bone = amt.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent:
            bone.parent = parent
        return bone

    # Coordinates relative to height
    z_foot = min_z + height * 0.05
    z_knee = min_z + height * 0.25
    z_hips = min_z + height * 0.5
    z_spine = min_z + height * 0.6
    z_chest = min_z + height * 0.75
    z_neck = min_z + height * 0.85
    z_head = min_z + height * 0.95
    z_top = max_z
    
    # Widths
    shoulder_width = height * 0.15
    hip_width = height * 0.08
    
    # Create Spine Chain
    hips = add_bone("Hips", Vector((0, 0, z_hips)), Vector((0, 0, z_spine)))
    spine = add_bone("Spine", Vector((0, 0, z_spine)), Vector((0, 0, z_chest)), hips)
    chest = add_bone("Chest", Vector((0, 0, z_chest)), Vector((0, 0, z_neck)), spine)
    neck = add_bone("Neck", Vector((0, 0, z_neck)), Vector((0, 0, z_head)), chest)
    head = add_bone("Head", Vector((0, 0, z_head)), Vector((0, 0, z_top)), neck)
    
    # Legs
    def create_leg(side, x_mult):
        upleg = add_bone(f"{side}UpLeg", Vector((x_mult * hip_width, 0, z_hips)), Vector((x_mult * hip_width, 0, z_knee)), hips)
        leg = add_bone(f"{side}Leg", Vector((x_mult * hip_width, 0, z_knee)), Vector((x_mult * hip_width, 0, z_foot)), upleg)
        foot = add_bone(f"{side}Foot", Vector((x_mult * hip_width, 0, z_foot)), Vector((x_mult * hip_width, -height*0.1, z_foot)), leg)

    create_leg("Left", 1)
    create_leg("Right", -1)
    
    # Arms
    def create_arm(side, x_mult):
        y_loc = 0
        shoulder = add_bone(f"{side}Shoulder", Vector((x_mult * shoulder_width * 0.5, 0, z_chest)), Vector((x_mult * shoulder_width, 0, z_chest)), chest)
        arm = add_bone(f"{side}Arm", Vector((x_mult * shoulder_width, 0, z_chest)), Vector((x_mult * shoulder_width * 1.5, 0, z_chest)), shoulder)
        forearm = add_bone(f"{side}ForeArm", Vector((x_mult * shoulder_width * 1.5, 0, z_chest)), Vector((x_mult * shoulder_width * 2.0, 0, z_chest)), arm)
        hand = add_bone(f"{side}Hand", Vector((x_mult * shoulder_width * 2.0, 0, z_chest)), Vector((x_mult * shoulder_width * 2.2, 0, z_chest)), forearm)
        
    create_arm("Left", 1)
    create_arm("Right", -1)
    
    bpy.ops.object.mode_set(mode='OBJECT')
    return armature

def export_fbx(output_path):
    bpy.ops.export_scene.fbx(
        filepath=output_path,
        use_selection=False,
        mesh_smooth_type='OFF',
        add_leaf_bones=False,
        primary_bone_axis='Y',
        secondary_bone_axis='X',
        use_tspace=True,
        embed_textures=True,
        path_mode='COPY'
    )

def main():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:]
    
    if len(argv) < 2:
        print("Usage: blender -P auto_rig.py -- <input> <output>")
        sys.exit(1)
        
    input_path = argv[0]
    output_path = argv[1]
    
    clear_scene()
    
    print(f"INFO: Importing {input_path}")
    mesh_obj = import_model(input_path)
    if not mesh_obj:
        sys.exit(1)
        
    apply_transforms(mesh_obj)
    
    print("INFO: Creating Rig...")
    armature = create_humanoid_rig(mesh_obj)
    
    print("INFO: Binding Mesh to Rig...")
    # Select Mesh then Armature
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    
    # Parent with Auto Weights
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    
    print(f"INFO: Exporting to {output_path}")
    export_fbx(output_path)
    print("SUCCESS")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
