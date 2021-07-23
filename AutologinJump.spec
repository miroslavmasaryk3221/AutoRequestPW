# -*- mode: python ; coding: utf-8 -*-


block_cipher = None


a = Analysis(['Autologin.py'],
             pathex=['C:\\Users\\MIMASARY\\Desktop\\AutologinPython'],
             binaries=[('./driver/chromedriver.exe', './driver')],
             datas=[('AutologinJumpo.json', '.'), ('settings.ini', '.')],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          [],
          name='Autologin',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          upx_exclude=[],
          runtime_tmpdir=None,
          console=True )
import shutil
shutil.copyfile('settings.ini', '{0}/settings.ini'.format(DISTPATH))
shutil.copyfile('AutologinJumpo.json', '{0}/AutologinJumpo.json'.format(DISTPATH))
