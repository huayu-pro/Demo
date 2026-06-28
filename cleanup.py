import sys

with open('app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def replace_in_line(idx, old, new):
    lines[idx] = lines[idx].replace(old, new)

# 替换对全局 utils.js 里面工具函数的调用（加入 enabledFingers 上下文）
replace_in_line(3388-1, 'isJointEnabled(conn.from.joint) && isJointEnabled(conn.to.joint)', 'isJointEnabled(conn.from.joint, this.state.enabledFingers) && isJointEnabled(conn.to.joint, this.state.enabledFingers)')
replace_in_line(3724-1, 'isJointEnabled(joint)', 'isJointEnabled(joint, this.state.enabledFingers)')
replace_in_line(3774-1, 'isJointEnabled(str.anchorA.joint)', 'isJointEnabled(str.anchorA.joint, this.state.enabledFingers)')
replace_in_line(3774-1, 'isJointEnabled(str.anchorB.joint)', 'isJointEnabled(str.anchorB.joint, this.state.enabledFingers)')
replace_in_line(4351-1, 'isJointEnabled()', 'isJointEnabled(joint, this.state.enabledFingers)')

def delete_lines(start, end):
    global lines
    del lines[start-1:end]

# 由下往上切除，确保行号不偏移
delete_lines(4363, 4369) # hexToRgba 3
delete_lines(4343, 4350) # isJointEnabled 3
delete_lines(4282, 4287) # hexToRgba 2
delete_lines(4189, 4194) # hexToRgba 1
delete_lines(3446, 3453) # isJointEnabled 2
delete_lines(3379, 3386) # isJointEnabled 1
delete_lines(182, 1926)  # AudioSynth, VerletString, ParticleSystem, RippleSystem, ChallengeSystem
delete_lines(36, 56)     # lerpColorHex

with open('app.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Cleanup complete! Lines removed:", 4510 - len(lines))
