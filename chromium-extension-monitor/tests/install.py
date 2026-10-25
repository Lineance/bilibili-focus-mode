from pathlib import Path
import subprocess, tempfile, json, winreg, shutil, os, sys
native = Path(__file__).resolve().parents[1]
base=native/'artifacts'
base.mkdir(exist_ok=True)
root=Path(tempfile.mkdtemp(prefix='install-',dir=base)); data=root/'中文 install'; profile=root/'profile'
browser=Path(sys.argv[1]) if len(sys.argv)>1 else Path(os.environ['LOCALAPPDATA'])/'ms-playwright/chromium-1248/chrome-win64/chrome.exe'
cli=native/'target'/os.environ.get('FOCUS_BUILD_PROFILE','debug')/'monitor.exe'
key=r'Software\Google\Chrome\NativeMessagingHosts\com.bilibili.focus.monitor'
def reg(view):
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER,key,0,winreg.KEY_READ|view) as k: return winreg.QueryValueEx(k,'')[0]
    except FileNotFoundError: return None
assert reg(winreg.KEY_WOW64_32KEY) is None and reg(winreg.KEY_WOW64_64KEY) is None,'Existing registration; refusing test'
def call(args,ok=True,binary=cli,directory=data):
    print('CALL',args[0],flush=True)
    r=subprocess.run([str(binary),'--data-dir',str(directory),*args],capture_output=True,text=True,encoding='utf-8',timeout=12)
    assert (r.returncode==0)==ok,(args,r.stdout,r.stderr)
    return json.loads(r.stdout) if r.returncode==0 else r
args=['install','--browser',str(browser),'--user-data-dir',str(profile),'--extension-id','abcdefghijklmnopabcdefghijklmnop']
try:
    result=call(args); assert result['enabled'] is False
    assert reg(winreg.KEY_WOW64_64KEY)==str(data/'com.bilibili.focus.monitor.json')
    assert all((data/'bin'/name).exists() for name in ['monitor.exe','bilibili-focus-host.exe','bilibili-focus-watchdog.exe'])
    print('PASS Unicode install and readback',flush=True)
    state=call(['start','--no-notify']); assert state['state']=='paused'
    assert 'handshake' in call(['enable'],False).stderr
    print('PASS independent startup and enable gate',flush=True)
    call(['autostart','on']); call(['autostart','off'])
    doctor=call(['doctor'],False); assert any(c['name']=='nativeHandshake' and not c['ok'] for c in json.loads(doctor.stdout)['checks'])
    call(['uninstall']); assert reg(winreg.KEY_WOW64_64KEY) is None
    assert json.loads((data/'config.json').read_text())['enabled'] is False
    print('PASS startup, doctor and uninstall',flush=True)
    bad=root/'bad-dist'; bad.mkdir(); shutil.copy2(cli,bad/'monitor.exe'); bad_data=root/'rollback'
    call(args,False,binary=bad/'monitor.exe',directory=bad_data)
    assert not (bad_data/'config.json').exists() and not (bad_data/'bin/monitor.exe').exists()
    assert reg(winreg.KEY_WOW64_64KEY) is None
    print('PASS installation rollback',flush=True)
    sentinel=str(root/'another-install.json')
    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER,key,0,winreg.KEY_WRITE|winreg.KEY_WOW64_32KEY) as k: winreg.SetValueEx(k,'',0,winreg.REG_SZ,sentinel)
    call(args,False,directory=root/'conflict')
    assert reg(winreg.KEY_WOW64_32KEY)==sentinel and reg(winreg.KEY_WOW64_64KEY) in [None,sentinel]
    print('PASS registry view conflict is preserved',flush=True)
    (root/'result.json').write_text(json.dumps({'passed':True,'install':True,'startup':True,'autostart':True,'doctor':True,'enableGate':True,'rollback':True,'viewConflict':True}),encoding='utf-8')
    print(root,flush=True)
finally:
    if (data/'config.json').exists(): subprocess.run([str(cli),'--data-dir',str(data),'uninstall'],capture_output=True,timeout=12)
    if reg(winreg.KEY_WOW64_32KEY)==str(root/'another-install.json'): winreg.DeleteKeyEx(winreg.HKEY_CURRENT_USER,key,winreg.KEY_WOW64_32KEY)
