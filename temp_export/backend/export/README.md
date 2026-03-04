# Blender Export Scripts

This directory contains Python scripts for Blender automation.

## export_animation.py

Automates animation retargeting from source character to target character.

### Features
- Automatic bone mapping (supports Mixamo and common naming conventions)
- BVH and FBX animation support
- Animation baking
- Embedded texture export

### Usage

```bash
blender --background --python export_animation.py -- \
    --character path/to/character.fbx \
    --animation path/to/animation.fbx \
    --output path/to/output.fbx
```

### Exit Codes
- `0` - Success
- `1` - Missing required argument
- `2` - Character file has no armature
- `3` - Animation file has no armature
- `4` - No animation data found
- `5` - Retargeting failed
- `6` - Export failed

### Requirements
- Blender 3.0+ (tested with 4.0)
- FBX I/O addon enabled (default)

### Bone Mapping

The script automatically maps bones using common naming conventions:
- Mixamo naming (Hips, Spine, LeftArm, etc.)
- Generic naming (pelvis, spine, shoulder.L, etc.)
- Custom variations can be added to `name_variations` dict

### Extending

To add support for new export formats:
1. Add new export function (e.g., `export_gltf`)
2. Add format parameter to command line args
3. Call appropriate export function based on format
