with open('pyq cgl.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the chicken-and-egg placement of window.zzOpenExam in pyq cgl.html
old_target = ';window.zzOpenExam=zzOpenExam;window.zzGetProgress=()=>U;window.SSC_PROGRESS=U;},Je='
new_replacement = '}; window.zzOpenExam = zzOpenExam; window.zzGetProgress = () => U; window.SSC_PROGRESS = U; const Je='

if old_target in content:
    content = content.replace(old_target, new_replacement, 1)
    print("Fixed zzOpenExam export placement successfully!")
else:
    print("old_target not found!")

# Also ensure window.zzOpenExam is assigned on every render via useEffect
effect_target = 'window.dispatchEvent(new CustomEvent("zz:progress-updated", { detail: U }));'
effect_replacement = '''window.dispatchEvent(new CustomEvent("zz:progress-updated", { detail: U }));
    window.zzOpenExam = zzOpenExam;
    window.zzGetProgress = () => U;
    window.SSC_PROGRESS = U;'''

if effect_target in content:
    content = content.replace(effect_target, effect_replacement, 1)
    print("Added zzOpenExam assignment to useEffect successfully!")
else:
    print("effect_target not found!")

with open('pyq cgl.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished updating pyq cgl.html")

