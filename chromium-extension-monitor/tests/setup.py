"""Windows first-run and repair UI test; never enables protection."""
from pathlib import Path
import ctypes,json,os,subprocess,sys,tempfile,time
native=Path(__file__).resolve().parents[1];root=Path(tempfile.mkdtemp(prefix='setup-',dir=native/'artifacts'));data=root/'native';profile=root/'browser'
build=os.environ.get('FOCUS_BUILD_PROFILE','debug');cli=native/'target'/build/'monitor.exe';gui=native/'target'/build/'bilibili-focus-watchdog.exe'
browser=Path(sys.argv[1]) if len(sys.argv)>1 else Path(os.environ['LOCALAPPDATA'])/'ms-playwright/chromium-1248/chrome-win64/chrome.exe'
user=ctypes.WinDLL('user32',use_last_error=True);callback=ctypes.WINFUNCTYPE(ctypes.c_int,ctypes.c_void_p,ctypes.c_ssize_t)
user.GetDlgItem.argtypes=[ctypes.c_void_p,ctypes.c_int];user.GetDlgItem.restype=ctypes.c_void_p
user.SetWindowTextW.argtypes=[ctypes.c_void_p,ctypes.c_wchar_p];user.GetWindowTextW.argtypes=[ctypes.c_void_p,ctypes.c_wchar_p,ctypes.c_int]
user.PostMessageW.argtypes=[ctypes.c_void_p,ctypes.c_uint,ctypes.c_size_t,ctypes.c_ssize_t];user.SendMessageW.argtypes=[ctypes.c_void_p,ctypes.c_uint,ctypes.c_size_t,ctypes.c_ssize_t]
user.GetWindowThreadProcessId.argtypes=[ctypes.c_void_p,ctypes.POINTER(ctypes.c_uint)]

def command(args,expected=0):
 r=subprocess.run([str(cli),'--data-dir',str(data),*args],capture_output=True,text=True,encoding='utf-8',timeout=12)
 assert r.returncode==expected,(args,r.returncode,r.stdout,r.stderr)
 return json.loads(r.stdout) if r.stdout.strip() else None

def wait(test,label,seconds=18):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  value=test()
  if value:return value
  time.sleep(.1)
 raise AssertionError(label)

def window(pid,title):
 found=[]
 @callback
 def each(hwnd,_):
  actual=ctypes.c_uint();user.GetWindowThreadProcessId(hwnd,ctypes.byref(actual))
  if actual.value==pid:
   text=ctypes.create_unicode_buffer(256);user.GetWindowTextW(hwnd,text,256)
   if text.value==title:found.append(hwnd)
  return 1
 user.EnumWindows(each,0);return found[0] if found else None

def read(hwnd):
 text=ctypes.create_unicode_buffer(2048);user.SendMessageW(hwnd,0x0d,2048,ctypes.cast(text,ctypes.c_void_p).value);return text.value

def set_text(hwnd,value):
 text=ctypes.create_unicode_buffer(value);user.SendMessageW(hwnd,0x0c,0,ctypes.cast(text,ctypes.c_void_p).value)

def fill(hwnd):
 for field,text in [(601,str(browser)),(602,str(profile)),(603,'abcdefghijklmnopabcdefghijklmnop')]:set_text(user.GetDlgItem(hwnd,field),text)
 user.SendMessageW(user.GetDlgItem(hwnd,604),0xf1,0,0)

processes=[]
try:
 child=subprocess.Popen([str(gui),'--data-dir',str(data)]);processes.append(child)
 setup=wait(lambda:window(child.pid,'Bilibili 专注守护 · 配置'),'missing config opens first-run UI')
 wait(lambda:user.GetDlgItem(setup,630),'setup controls are ready')
 fill(setup)
 set_text(user.GetDlgItem(setup,603),'invalid');user.SendMessageW(setup,0x111,620,0)
 wait(lambda:'32' in read(user.GetDlgItem(setup,630)),'invalid ID is actionable');assert not (data/'config.json').exists()
 fill(setup);user.PostMessageW(setup,0x111,620,0)
 wait(lambda:child.poll() is not None,'wizard hands off to installed watchdog',25);assert child.returncode==0
 status=command(['status']);assert status['watchdogRunning'] and status['enabled'] is False
 main=wait(lambda:window(status['watchdogPid'],'Bilibili 专注守护'),'installed status window')
 user.PostMessageW(main,0x111,103,0);wait(lambda:'扩展尚未连接' in read(user.GetDlgItem(main,150)),'human readable diagnosis')
 print('PASS first-run validation, GUI installation and actionable diagnosis',flush=True)
 command(['timing','--grace-ms','12345']);command(['stop'])
 args=['install','--browser',str(browser),'--user-data-dir',str(profile),'--extension-id','abcdefghijklmnopabcdefghijklmnop']
 command(args);assert json.loads((data/'config.json').read_text())['timing']['graceMs']==12345
 print('PASS upgrade preserves custom timing and stays disabled',flush=True)
 (data/'config.json').write_text('{invalid configuration')
 child=subprocess.Popen([str(gui),'--data-dir',str(data),'--setup']);processes.append(child)
 setup=wait(lambda:window(child.pid,'Bilibili 专注守护 · 配置'),'repair UI');wait(lambda:user.GetDlgItem(setup,630),'repair controls');fill(setup);user.PostMessageW(setup,0x111,620,0)
 wait(lambda:child.poll() is not None,'repair installs valid config',25);assert child.returncode==0
 assert list(data.glob('config-backup-*.json')) and json.loads((data/'config.json').read_text())['enabled'] is False
 command(['uninstall'])
 result={'passed':True,'firstRun':True,'validation':True,'humanDiagnosis':True,'preservedTiming':True,'corruptConfigBackup':True,'disabledByDefault':True,'cleanup':True}
 (root/'result.json').write_text(json.dumps(result));print(json.dumps(result),root,flush=True)
finally:
 if (data/'config.json').exists():subprocess.run([str(cli),'--data-dir',str(data),'uninstall'],capture_output=True,timeout=15)
 for child in processes:
  if child.poll() is None:child.kill();child.wait()
