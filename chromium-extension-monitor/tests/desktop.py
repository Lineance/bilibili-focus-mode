"""Interactive Windows desktop smoke test. Only controls test-owned windows."""
from pathlib import Path
import ctypes, json, os, subprocess, sys, tempfile, time

native=Path(__file__).resolve().parents[1]
artifacts=native/'artifacts';artifacts.mkdir(exist_ok=True)
root=Path(tempfile.mkdtemp(prefix='desktop-',dir=artifacts));data=root/'native';profile=root/'browser'
cli=native/'target'/os.environ.get('FOCUS_BUILD_PROFILE','debug')/'monitor.exe'
browser=Path(sys.argv[1]) if len(sys.argv)>1 else Path(os.environ['LOCALAPPDATA'])/'ms-playwright/chromium-1248/chrome-win64/chrome.exe'
user=ctypes.WinDLL('user32',use_last_error=True)
callback=ctypes.WINFUNCTYPE(ctypes.c_int,ctypes.c_void_p,ctypes.c_ssize_t)
user.IsWindowVisible.argtypes=[ctypes.c_void_p];user.PostMessageW.argtypes=[ctypes.c_void_p,ctypes.c_uint,ctypes.c_size_t,ctypes.c_ssize_t]
user.GetWindowTextW.argtypes=[ctypes.c_void_p,ctypes.c_wchar_p,ctypes.c_int]
user.GetWindowThreadProcessId.argtypes=[ctypes.c_void_p,ctypes.POINTER(ctypes.c_uint)]

def command(args,expected=0):
    r=subprocess.run([str(cli),'--data-dir',str(data),*args],capture_output=True,text=True,encoding='utf-8',timeout=12)
    assert r.returncode==expected,(args,r.returncode,r.stdout,r.stderr)
    return json.loads(r.stdout) if r.stdout.strip() else None

def wait(test,label,seconds=15):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        value=test()
        if value:return value
        time.sleep(.1)
    raise AssertionError(label)

def windows(pid):
    result=[]
    @callback
    def each(hwnd,_):
        actual=ctypes.c_uint();user.GetWindowThreadProcessId(hwnd,ctypes.byref(actual))
        if actual.value==pid:
            title=ctypes.create_unicode_buffer(256);user.GetWindowTextW(hwnd,title,256)
            result.append((hwnd,title.value))
        return 1
    user.EnumWindows(each,0)
    return result

installed=False;child=None
try:
    command(['install','--browser',str(browser),'--user-data-dir',str(profile),'--extension-id','abcdefghijklmnopabcdefghijklmnop']);installed=True
    command(['timing','--startup-ms','1000','--grace-ms','20000'])
    status=command(['start','--dry-run']);pid=status['watchdogPid']
    wait(lambda:windows(pid),'desktop windows')
    command(['notify-test'])
    diagnostics=command(['notify-status']);assert diagnostics['registered'] and diagnostics['historyCount']>=1,diagnostics
    print('PASS Windows accepted toast and notification history contains it',flush=True)
    command(['ui']);main=wait(lambda:next((h for h,t in windows(pid) if t=='Bilibili 专注守护' and user.IsWindowVisible(h)),None),'status window opens')
    tray_status=data/'tray-status.json'
    wait(lambda:tray_status.exists() and json.loads(tray_status.read_text()).get('registered'),'tray registration')
    user.PostMessageW(main,0x10,0,0);wait(lambda:not user.IsWindowVisible(main),'hide status window')
    user.PostMessageW(main,0x8000+42,1,0x203)
    wait(lambda:user.IsWindowVisible(main),'tray double click reopens status')
    print('PASS tray registration and double-click reopen',flush=True)
    config_path=data/'config.json';config=json.loads(config_path.read_text());config['enabled']=True;config_path.write_text(json.dumps(config))
    log=(root/'browser.log').open('w');child=subprocess.Popen([str(browser),'--headless=new','--no-first-run','--disable-extensions','--disable-gpu','--user-data-dir='+str(profile),'about:blank'],stdout=log,stderr=subprocess.STDOUT)
    countdown=wait(lambda:next((h for h,t in windows(pid) if t=='专注扩展已失联' and user.IsWindowVisible(h)),None),'countdown appears')
    user.PostMessageW(countdown,0x10,0,0)
    wait(lambda:not user.IsWindowVisible(countdown),'countdown closes')
    time.sleep(.6);assert not user.IsWindowVisible(countdown),'dismissed countdown reappeared'
    print('PASS countdown dismissal is stable within one incident',flush=True)
    shell=ctypes.WinDLL('shell32',use_last_error=True)
    shell.ShellExecuteW.argtypes=[ctypes.c_void_p,ctypes.c_wchar_p,ctypes.c_wchar_p,ctypes.c_wchar_p,ctypes.c_wchar_p,ctypes.c_int];shell.ShellExecuteW.restype=ctypes.c_void_p
    uri='bilibili-focus-monitor-'+diagnostics['appId'].split('.')[-1]+'://pause'
    assert shell.ShellExecuteW(None,'open',uri,None,None,1)>32
    wait(lambda:command(['status']).get('state')=='paused','notification protocol pause')
    config['enabled']=True;config_path.write_text(json.dumps(config));wait(lambda:command(['status']).get('enabled') is True,'test reenables dry run')
    user.PostMessageW(main,0x111,101,0)
    wait(lambda:command(['status']).get('state')=='paused','GUI pause reaches watchdog')
    assert child.poll() is None
    command(['stop']);assert json.loads(tray_status.read_text()).get('registered') is False
    command(['uninstall']);installed=False
    assert not command(['notify-status'])['registered']
    result={'passed':True,'toastApiAccepted':True,'toastHistoryVerified':True,'visibleConfirmed':False,'countdownDismissal':True,'guiPause':True,'notificationProtocolPause':True,'trayRegistered':True,'trayReopen':True,'trayCleanup':True,'cleanup':True}
    (root/'result.json').write_text(json.dumps(result));print(json.dumps(result),root,flush=True)
finally:
    if installed:subprocess.run([str(cli),'--data-dir',str(data),'uninstall'],capture_output=True,timeout=12)
    if child and child.poll() is None:subprocess.run(['taskkill.exe','/PID',str(child.pid),'/T','/F'],capture_output=True)
