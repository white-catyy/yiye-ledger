import {
  getBackupFilename,
  parseLedgerBackup,
  serializeLedgerBackup,
  type LedgerBackup,
} from './backup';
import type { LedgerState } from './model';

export type ImportBackupResult =
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
  | { status: 'success'; backup: LedgerBackup };

export async function exportLedgerData(ledger: LedgerState) {
  if (typeof document === 'undefined') {
    throw new Error('当前环境不支持文件导出');
  }
  const filename = getBackupFilename();
  const blob = new Blob([serializeLedgerBackup(ledger)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export function importLedgerData(): Promise<ImportBackupResult> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve({ status: 'error', message: '当前环境不支持文件导入' });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    const finish = (result: ImportBackupResult) => {
      input.remove();
      resolve(result);
    };

    input.addEventListener('cancel', () => finish({ status: 'cancelled' }));
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ status: 'cancelled' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        finish({ status: 'error', message: '备份文件超过 5 MB，无法导入' });
        return;
      }
      try {
        const parsed = parseLedgerBackup(await file.text());
        finish(
          parsed.ok
            ? { status: 'success', backup: parsed.backup }
            : { status: 'error', message: parsed.error }
        );
      } catch {
        finish({ status: 'error', message: '读取备份文件失败' });
      }
    });

    document.body.appendChild(input);
    input.click();
  });
}
