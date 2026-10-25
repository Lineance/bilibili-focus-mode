"""Validate component versions and build complete, self-checking release archives."""
import argparse
import hashlib
import json
import re
import struct
import subprocess
import tomllib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BINARIES = ('monitor.exe', 'bilibili-focus-host.exe', 'bilibili-focus-watchdog.exe')


def versions(root):
    package = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
    manifest = json.loads((root / 'src/manifest.json').read_text(encoding='utf-8'))['version']
    if package != manifest:
        raise ValueError('package.json and extension manifest versions differ')
    native = tomllib.loads((root / 'chromium-extension-monitor/Cargo.toml').read_text(encoding='utf-8'))['package']['version']
    return {'extension': manifest, 'native': native}


def validate_tag(root, tag):
    available = versions(root)
    if tag.startswith('monitor-v'):
        component, value = 'native', tag[len('monitor-v'):]
    elif tag.startswith('v'):
        component, value = 'extension', tag[1:]
    else:
        raise ValueError('expected vX.Y.Z or monitor-vX.Y.Z')
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?', value):
        raise ValueError('invalid version tag')
    if value != available[component]:
        raise ValueError(f'{tag} does not match {component} version {available[component]}')
    return component


def digest(data):
    return hashlib.sha256(data).hexdigest()


def check_pe(path):
    data = path.read_bytes()
    if len(data) < 64 or data[:2] != b'MZ':
        raise ValueError(f'{path.name} is not a Windows PE executable')
    offset = struct.unpack_from('<I', data, 60)[0]
    if offset + 6 > len(data) or data[offset:offset + 4] != b'PE\0\0' or struct.unpack_from('<H', data, offset + 4)[0] != 0x8664:
        raise ValueError(f'{path.name} is not a Windows x64 executable')
    return data


def build(root, component, out, tag=''):
    available = versions(root)
    if tag:
        validate_tag(root, tag)
    version = available[component]
    entries = {}
    if component == 'extension':
        folder = root / 'dist'
        built = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
        if built['version'] != version:
            raise ValueError('built extension version does not match source')
        for path in sorted(folder.rglob('*')):
            if path.is_file():
                if not path.resolve().is_relative_to(folder.resolve()):
                    raise ValueError('extension output contains an external symlink')
                entries[path.relative_to(folder).as_posix()] = path.read_bytes()
        name = f'bilibili-focus-mode-v{version}.zip'
    else:
        folder = root / 'chromium-extension-monitor/target/release'
        for executable in BINARIES:
            entries[executable] = check_pe(folder / executable)
        entries['README.md'] = (root / 'chromium-extension-monitor/README.md').read_bytes()
        name = f'bilibili-focus-monitor-v{version}-windows-x64.zip'
    revision = subprocess.run(['git', '-C', str(root), 'rev-parse', 'HEAD'], capture_output=True, text=True, check=False)
    entries['BUILD-INFO.json'] = json.dumps({'component': component, 'version': version, 'tag': tag or None, 'commit': revision.stdout.strip() if revision.returncode == 0 else None}, indent=2).encode()
    entries['SHA256SUMS.txt'] = ''.join(f'{digest(data)}  {path}\n' for path, data in sorted(entries.items())).encode()
    out.mkdir(parents=True, exist_ok=True)
    destination = out / name
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path, data in entries.items():
            archive.writestr(path, data)
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise ValueError('archive integrity check failed')
    (out / f'SHA256SUMS-{component}.txt').write_text(f'{digest(destination.read_bytes())}  {name}\n', encoding='utf-8')
    return destination


def checksums(directory):
    archives = sorted(directory.glob('*.zip'))
    if len(archives) != 2 or not any(p.name.startswith('bilibili-focus-mode-') for p in archives) or not any(p.name.startswith('bilibili-focus-monitor-') for p in archives):
        raise ValueError('release must contain exactly one extension and one Windows monitor archive')
    for archive in archives:
        with zipfile.ZipFile(archive) as package:
            if package.testzip() is not None:
                raise ValueError('damaged release archive')
    (directory / 'SHA256SUMS.txt').write_text(''.join(f'{digest(path.read_bytes())}  {path.name}\n' for path in archives), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    commands = parser.add_subparsers(dest='command', required=True)
    validate = commands.add_parser('validate-tag')
    validate.add_argument('--tag', required=True)
    package = commands.add_parser('build')
    package.add_argument('--component', choices=['extension', 'native'], required=True)
    package.add_argument('--tag', default='')
    package.add_argument('--out', type=Path, required=True)
    combined = commands.add_parser('checksums')
    combined.add_argument('--directory', type=Path, required=True)
    args = parser.parse_args()
    if args.command == 'validate-tag':
        print(validate_tag(args.root, args.tag))
    elif args.command == 'build':
        print(build(args.root, args.component, args.out, args.tag))
    else:
        checksums(args.directory)


if __name__ == '__main__':
    main()
