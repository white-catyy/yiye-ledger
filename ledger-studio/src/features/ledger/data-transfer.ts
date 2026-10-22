import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  getBackupFilename,
  parseLedgerBackup,
  serializeLedgerBackup,
  type BackupParseResult,
} from './backup';
import type { LedgerState } from './model';

export type ImportBackupResult =
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
  | { status: 'success'; backup: Extract<BackupParseResult, { ok: true }>['backup'] };

export async function exportLedgerData(ledger: LedgerState) {
  const filename = getBackupFilename();
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true, intermediates: true });
  await file.write(serializeLedgerBackup(ledger));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('当前设备不支持系统文件分享');
  }
  await Sharing.shareAsync(file.uri, {
    dialogTitle: '导出一页账数据',
    mimeType: 'application/json',
    UTI: 'public.json',
  });
  return filename;
}

export async function importLedgerData(): Promise<ImportBackupResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });
  if (result.canceled) {
    return { status: 'cancelled' };
  }

  const asset = result.assets?.[0];
  if (!asset) {
    return { status: 'error', message: '没有读取到文件' };
  }
  if (asset.size && asset.size > 5 * 1024 * 1024) {
    return { status: 'error', message: '备份文件超过 5 MB，无法导入' };
  }

  const content = await new File(asset.uri).text();
  const parsed = parseLedgerBackup(content);
  return parsed.ok
    ? { status: 'success', backup: parsed.backup }
    : { status: 'error', message: parsed.error };
}
