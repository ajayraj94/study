with open('pyq cgl.html', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '  const [U, G] = $.useState(() => Vc(false));'
replacement1 = '''  const [U, G] = $.useState(() => {
    try {
      const backup = localStorage.getItem("SSC_CGL_PROGRESS_BACKUP");
      if (backup) {
        const parsed = JSON.parse(backup);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
          window.SSC_PROGRESS = parsed;
          return parsed;
        }
      }
    } catch(e) {}
    const fresh = Vc(false);
    window.SSC_PROGRESS = fresh;
    return fresh;
  });
  $.useEffect(() => {
    try {
      if (U && Object.keys(U).length > 0) {
        localStorage.setItem("SSC_CGL_PROGRESS_BACKUP", JSON.stringify(U));
        window.SSC_PROGRESS = U;
        window.dispatchEvent(new CustomEvent("zz:progress-updated", { detail: U }));
      }
    } catch(e) {}
  }, [U]);'''

if target1 in content:
    content = content.replace(target1, replacement1, 1)
    print("target1 replaced successfully")
else:
    print("target1 not found (may already be replaced)")

target2 = 'zzSetSub(!1),zzSetExam(!0),at(!0)},Je='
replacement2 = 'zzSetSub(!1),zzSetExam(!0),at(!0);window.zzOpenExam=zzOpenExam;window.zzGetProgress=()=>U;window.SSC_PROGRESS=U;},Je='

if target2 in content:
    content = content.replace(target2, replacement2, 1)
    print("target2 replaced successfully")
else:
    print("target2 not found (may already be replaced)")

with open('pyq cgl.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done patching pyq cgl.html!")

