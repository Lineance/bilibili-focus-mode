import json
import struct
import tempfile
import unittest
import zipfile
from pathlib import Path

from package_release import BINARIES, build, checksums, validate_tag


class PackageReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'src').mkdir()
        (self.root / 'chromium-extension-monitor/target/release').mkdir(parents=True)
        (self.root / 'package.json').write_text(json.dumps({'version': '0.0.5'}))
        (self.root / 'src/manifest.json').write_text(json.dumps({'version': '0.0.5'}))
        (self.root / 'chromium-extension-monitor/Cargo.toml').write_text('[package]\nversion="0.1.0"\n')
        (self.root / 'chromium-extension-monitor/README.md').write_text('installation')
        (self.root / 'dist').mkdir()
        (self.root / 'dist/manifest.json').write_text(json.dumps({'version': '0.0.5'}))
        for name in BINARIES:
            data = bytearray(160)
            data[:2] = b'MZ'
            struct.pack_into('<I', data, 60, 128)
            data[128:132] = b'PE\0\0'
            struct.pack_into('<H', data, 132, 0x8664)
            (self.root / 'chromium-extension-monitor/target/release' / name).write_bytes(data)

    def test_extension_and_native_tags_validate_independent_versions(self):
        self.assertEqual(validate_tag(self.root, 'v0.0.5'), 'extension')
        self.assertEqual(validate_tag(self.root, 'monitor-v0.1.0'), 'native')
        for tag in ['main', 'v0.1.0', 'monitor-v0.0.5', 'v0.0.5/../other']:
            with self.assertRaises(ValueError):
                validate_tag(self.root, tag)

    def test_native_archive_contains_all_three_binaries_and_checksums(self):
        archive = build(self.root, 'native', self.root / 'out')
        with zipfile.ZipFile(archive) as package:
            self.assertTrue(set(BINARIES).issubset(package.namelist()))
            self.assertIn('README.md', package.namelist())
            self.assertIn('SHA256SUMS.txt', package.namelist())

    def test_missing_helper_cannot_be_published(self):
        folder = self.root / 'chromium-extension-monitor/target/release'
        (folder / BINARIES[1]).unlink()
        with self.assertRaises(FileNotFoundError):
            build(self.root, 'native', self.root / 'out')

    def test_wrong_architecture_cannot_be_labeled_windows_x64(self):
        path = self.root / 'chromium-extension-monitor/target/release' / BINARIES[0]
        data = bytearray(path.read_bytes())
        struct.pack_into('<H', data, 132, 0xAA64)
        path.write_bytes(data)
        with self.assertRaises(ValueError):
            build(self.root, 'native', self.root / 'out')

    def test_extension_archive_has_manifest_at_root_and_rejects_stale_build(self):
        archive = build(self.root, 'extension', self.root / 'out')
        with zipfile.ZipFile(archive) as package:
            self.assertIn('manifest.json', package.namelist())
            self.assertNotIn('dist/manifest.json', package.namelist())
        (self.root / 'dist/manifest.json').write_text('{"version":"0.0.4"}')
        with self.assertRaises(ValueError):
            build(self.root, 'extension', self.root / 'out')

    def test_combined_manifest_requires_both_archives(self):
        out = self.root / 'out'
        build(self.root, 'extension', out)
        with self.assertRaises(ValueError):
            checksums(out)
        build(self.root, 'native', out)
        checksums(out)
        self.assertEqual(len((out / 'SHA256SUMS.txt').read_text().splitlines()), 2)


if __name__ == '__main__':
    unittest.main()
