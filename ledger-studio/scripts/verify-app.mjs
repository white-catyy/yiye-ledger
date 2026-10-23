import { spawn } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9300 + (process.pid % 500);
const DEBUG_URL = `http://127.0.0.1:${DEBUG_PORT}`;
const APP_URL = 'http://127.0.0.1:8081';
const PROFILE_DIR = `${process.cwd()}\\.cdp-profile-${process.pid}`;

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const errors = [];

    socket.addEventListener('open', () => {
      resolve({
        errors,
        send(method, params = {}) {
          return new Promise((commandResolve, commandReject) => {
            const id = nextId++;
            pending.set(id, { resolve: commandResolve, reject: commandReject });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          socket.close();
        },
      });
    });

    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
          request?.reject(new Error(message.error.message));
        } else {
          request?.resolve(message.result);
        }
        return;
      }
      if (message.method === 'Runtime.exceptionThrown') {
        errors.push(message.params.exceptionDetails?.text ?? 'Runtime exception');
      }
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        errors.push(message.params.entry.text);
      }
    });

    socket.addEventListener('error', reject);
  });
}

async function getPageTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${DEBUG_URL}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page');
      if (page) {
        return page;
      }
    } catch {
      // Chrome is still starting.
    }
    await delay(250);
  }
  throw new Error('Chrome debugging target was not available.');
}

async function main() {
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--disable-default-apps',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let client;
  try {
    const target = await getPageTarget();
    client = await connect(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 412,
      screenHeight: 915,
    });
    await client.send('Page.navigate', { url: APP_URL });
    await delay(1200);

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
      }
      return result.result.value;
    }

    async function waitForText(text, timeout = 10000) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        const bodyText = await evaluate('document.body?.innerText ?? ""');
        if (bodyText.includes(text)) {
          return bodyText;
        }
        await delay(250);
      }
      throw new Error(`Timed out waiting for text: ${text}`);
    }

    async function click(text) {
      const clicked = await evaluate(`(() => {
        const needle = ${JSON.stringify(text)};
        const target = [...document.querySelectorAll('[role="button"], button, a, [role="tab"]')]
          .find((element) =>
            element.textContent?.includes(needle) ||
            element.getAttribute('aria-label')?.includes(needle)
          );
        if (!target) return false;
        target.click();
        return true;
      })()`);
      if (!clicked) {
        throw new Error(`Could not find control containing: ${text}`);
      }
      await delay(500);
    }

    async function clickAriaExact(label) {
      const clicked = await evaluate(`(() => {
        const target = [...document.querySelectorAll('[role="button"], button')]
          .find((element) => element.getAttribute('aria-label') === ${JSON.stringify(label)});
        if (!target) return false;
        target.click();
        return true;
      })()`);
      if (!clicked) {
        throw new Error(`Could not find control with aria-label: ${label}`);
      }
      await delay(500);
    }

    async function fill(label, value) {
      const filled = await evaluate(`(() => {
        const input = document.querySelector('input[aria-label=${JSON.stringify(label)}]');
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(value)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      if (!filled) {
        throw new Error(`Could not find input: ${label}`);
      }
      await delay(150);
    }

    async function typeInto(label, value) {
      const focused = await evaluate(`(() => {
        const input = document.querySelector('input[aria-label=${JSON.stringify(label)}]');
        if (!input) return false;
        input.focus();
        input.setSelectionRange(0, input.value.length);
        return true;
      })()`);
      if (!focused) {
        throw new Error(`Could not focus input: ${label}`);
      }

      await client.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Backspace',
        code: 'Backspace',
        windowsVirtualKeyCode: 8,
      });
      await client.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Backspace',
        code: 'Backspace',
        windowsVirtualKeyCode: 8,
      });

      for (const character of value) {
        await client.send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: character,
          code: /^\d$/.test(character) ? `Digit${character}` : '',
          text: character,
          unmodifiedText: character,
        });
        await client.send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: character,
          code: /^\d$/.test(character) ? `Digit${character}` : '',
        });
      }
      await delay(250);
    }

    async function screenshot(path) {
      const result = await client.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      });
      await writeFile(path, Buffer.from(result.data, 'base64'));
    }

    async function injectFile(content) {
      const injected = await evaluate(`(() => {
        const input = document.querySelector('input[type="file"]');
        if (!input) return false;
        const transfer = new DataTransfer();
        transfer.items.add(new File([${JSON.stringify(content)}], 'backup.json', {
          type: 'application/json',
        }));
        Object.defineProperty(input, 'files', {
          configurable: true,
          value: transfer.files,
        });
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      if (!injected) {
        throw new Error('Could not inject backup file into the file input.');
      }
      await delay(500);
    }

    const initialText = await waitForText('今天还没有流水');
    if (!initialText.includes('0.00') || !initialText.includes('预算')) {
      throw new Error('Initial empty state is incorrect.');
    }
    await screenshot('preview-home.png');

    await click('明细');
    const detailText = await waitForText('按月选择日期');
    if (!detailText.includes('这一天还没有流水')) {
      throw new Error('Daily detail empty state is incorrect.');
    }

    const futureDisabled = await evaluate(`(() => {
      return [...document.querySelectorAll('[role="button"][aria-disabled="true"]')]
        .some((element) => /^\\d+日/.test(element.getAttribute('aria-label') ?? ''));
    })()`);
    if (!futureDisabled) {
      throw new Error('Future calendar dates are not disabled.');
    }

    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12);
    const previousMonthLabel = new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'long',
    }).format(previousMonth);
    const previousMonthKey = `${previousMonth.getFullYear()}-${String(
      previousMonth.getMonth() + 1
    ).padStart(2, '0')}`;

    await click('查看上个月');
    await waitForText(previousMonthLabel);
    await clickAriaExact('1日');
    await click('补记这一天');
    await fill('流水名称', '历史资料');
    await fill('金额', '23.00');
    await fill('流水时间', '09:30');
    await fill('流水备注', '补记上月');
    await click('学习');
    await click('保存这笔');
    await waitForText('历史资料');

    let storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (storedState.entries?.[0]?.date !== `${previousMonthKey}-01`) {
      throw new Error('Historical entry was not saved on the selected date.');
    }
    await screenshot('preview-details.png');

    await click('我的');
    await waitForText('预算、设置和本地数据');
    const collapsedSettingsText = await evaluate('document.body.innerText');
    if (collapsedSettingsText.includes('选择一个预设色')) {
      throw new Error('Settings should be collapsed by default.');
    }
    await click('打开设置');
    await waitForText('选择一个预设色');

    await clickAriaExact('新增自定义分类');
    await waitForText('新增自定义分类');
    await fill('分类名称', '社团');
    await clickAriaExact('使用宠物图标');
    await clickAriaExact('选择颜色#C47A8A');
    await clickAriaExact('保存自定义分类');
    await waitForText('社团');

    await clickAriaExact('新增自定义分类');
    await clickAriaExact('分类类型设为收入');
    await fill('分类名称', '稿费');
    await clickAriaExact('使用工作图标');
    await clickAriaExact('选择颜色#8B7BC1');
    await clickAriaExact('保存自定义分类');
    await waitForText('稿费');

    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (
      storedState.customCategories?.length !== 2 ||
      storedState.customCategories[0]?.type !== 'expense' ||
      storedState.customCategories[1]?.type !== 'income'
    ) {
      throw new Error('Custom categories were not persisted with their types.');
    }

    await clickAriaExact('新增自定义分类');
    await fill('分类名称', '社团');
    await clickAriaExact('保存自定义分类');
    await waitForText('同类型中已有同名分类');
    await clickAriaExact('关闭分类编辑');
    await delay(350);
    await screenshot('preview-categories.png');

    await typeInto('每月预算', '2000');
    const budgetFieldValue = await evaluate(
      `document.querySelector('input[aria-label="每月预算"]')?.value`
    );
    if (budgetFieldValue !== '2000') {
      throw new Error(`Budget input did not receive typed value: ${budgetFieldValue}`);
    }
    await clickAriaExact('保存每月预算');
    await click('薄荷');

    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (storedState.monthlyBudget !== 2000 || storedState.themeColor !== '#5B9A7B') {
      throw new Error(
        `Budget or preset theme was not persisted: ${JSON.stringify({
          budget: storedState.monthlyBudget,
          theme: storedState.themeColor,
        })}`
      );
    }

    await fill('自定义主题色值', '#8B7BC1');
    await click('应用');
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (storedState.themeColor !== '#8B7BC1') {
      throw new Error('Custom theme color was not persisted.');
    }
    await evaluate(`(() => {
      const original = URL.createObjectURL;
      window.__yiyeBackupBlob = null;
      URL.createObjectURL = function (blob) {
        window.__yiyeBackupBlob = blob;
        return original.call(URL, blob);
      };
      return true;
    })()`);
    await click('导出备份');
    await waitForText('已生成备份');
    const exportedContent = await evaluate(
      `window.__yiyeBackupBlob ? window.__yiyeBackupBlob.text() : null`
    );
    const exportedBackup = JSON.parse(exportedContent);
    if (
      exportedBackup.version !== 2 ||
      exportedBackup.data?.customCategories?.length !== 2 ||
      exportedBackup.data?.entries?.some((entry) => entry.type !== 'expense')
    ) {
      throw new Error('Export did not contain the V2 category and entry schema.');
    }

    await evaluate(`(() => {
      const original = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this.type === 'file') return;
        return original.call(this);
      };
      return true;
    })()`);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = (value) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
        value.getDate()
      ).padStart(2, '0')}`;
    const importedV1 = {
      format: 'yiye-ledger-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        monthlyBudget: 1800,
        monthlySpentBeforeToday: 0,
        yesterdayTotal: 0,
        themeColor: '#5B9A7B',
        entries: [
          {
            id: 'backup-yesterday',
            categoryId: 'meal',
            name: '备份昨天',
            note: '迁移数据',
            amount: 12,
            time: '12:00',
            date: dateKey(yesterday),
          },
          {
            id: 'backup-today',
            categoryId: 'study',
            name: '备份今天',
            note: '导入测试',
            amount: 36,
            time: '18:00',
            date: dateKey(today),
          },
        ],
      },
    };
    await click('导入备份');
    await injectFile(JSON.stringify(importedV1));
    await waitForText('确认替换当前账本');
    await click('确认替换');
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (
      storedState.entries?.length !== 2 ||
      storedState.monthlyBudget !== 1800 ||
      storedState.themeColor !== '#5B9A7B' ||
      storedState.customCategories?.length !== 0 ||
      storedState.entries.some((entry) => entry.type !== 'expense')
    ) {
      throw new Error('V1 backup migration did not preserve and upgrade the ledger.');
    }

    const importedBackup = {
      format: 'yiye-ledger-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        monthlyBudget: 1800,
        monthlySpentBeforeToday: 0,
        yesterdayTotal: 0,
        themeColor: '#5B9A7B',
        customCategories: [
          {
            id: 'custom-club',
            type: 'expense',
            name: '社团',
            icon: 'pet',
            color: '#C47A8A',
          },
          {
            id: 'custom-writing',
            type: 'income',
            name: '稿费',
            icon: 'work',
            color: '#8B7BC1',
          },
        ],
        entries: [
          {
            id: 'backup-yesterday',
            type: 'expense',
            categoryId: 'custom-club',
            name: '备份昨天',
            note: '迁移数据',
            amount: 12,
            time: '12:00',
            date: dateKey(yesterday),
          },
          {
            id: 'backup-today',
            type: 'income',
            categoryId: 'salary',
            name: '备份今天',
            note: '收入导入测试',
            amount: 36,
            time: '18:00',
            date: dateKey(today),
          },
        ],
      },
    };

    await click('导入备份');
    await injectFile(JSON.stringify(importedBackup));
    await waitForText('确认替换当前账本');
    await click('确认替换');
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (
      storedState.entries?.length !== 2 ||
      storedState.customCategories?.length !== 2 ||
      storedState.entries[0]?.type !== 'expense' ||
      storedState.entries[1]?.type !== 'income'
    ) {
      throw new Error('V2 backup did not restore categories and income.');
    }

    await clickAriaExact('删除社团分类');
    await clickAriaExact('确认删除社团分类');
    await waitForText('正被 1 笔流水使用');

    await clickAriaExact('编辑稿费分类');
    await waitForText('编辑自定义分类');
    await fill('分类名称', '写作');
    await clickAriaExact('选择颜色#6B79B8');
    await clickAriaExact('保存自定义分类');
    await waitForText('写作');
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (
      storedState.customCategories?.find(
        (category) => category.id === 'custom-writing'
      )?.name !== '写作'
    ) {
      throw new Error('Editing a custom category was not persisted.');
    }

    await clickAriaExact('删除写作分类');
    await clickAriaExact('确认删除写作分类');
    await waitForText('自定义分类已删除');
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (storedState.customCategories?.length !== 1) {
      throw new Error('Unused custom category was not deleted.');
    }

    await click('导入备份');
    await injectFile('{"format":"invalid"}');
    await waitForText('这不是一页账备份文件');
    let afterInvalidImport = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (afterInvalidImport.entries?.length !== 2) {
      throw new Error('Invalid backup changed existing data.');
    }

    await click('导入备份');
    await injectFile(JSON.stringify({ ...importedBackup, version: 3 }));
    await waitForText('备份版本不受支持');

    const { customCategories: omittedCategories, ...dataWithoutCategories } =
      importedBackup.data;
    await click('导入备份');
    await injectFile(
      JSON.stringify({ ...importedBackup, data: dataWithoutCategories })
    );
    await waitForText('备份缺少自定义分类数据');

    await click('导入备份');
    await injectFile(
      JSON.stringify({
        ...importedBackup,
        data: {
          ...importedBackup.data,
          entries: [
            {
              ...importedBackup.data.entries[0],
              type: 'transfer',
            },
          ],
        },
      })
    );
    await waitForText('备份中的流水内容无效或包含未来日期');

    await click('导入备份');
    await injectFile(
      JSON.stringify({
        ...importedBackup,
        data: {
          ...importedBackup.data,
          entries: [
            {
              ...importedBackup.data.entries[0],
              id: 'unknown-category-entry',
              categoryId: 'custom-missing',
            },
          ],
        },
      })
    );
    await waitForText('备份中的流水内容无效或包含未来日期');

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await click('导入备份');
    await injectFile(
      JSON.stringify({
        ...importedBackup,
        data: {
          ...importedBackup.data,
          entries: [
            {
              ...importedBackup.data.entries[0],
              id: 'future-entry',
              date: dateKey(tomorrow),
            },
          ],
        },
      })
    );
    await waitForText('备份中的流水内容无效或包含未来日期');

    await click('导入备份');
    await injectFile(
      JSON.stringify({
        ...importedBackup,
        data: {
          ...importedBackup.data,
          entries: [
            {
              ...importedBackup.data.entries[0],
              id: 'invalid-date-entry',
              date: '2026-02-31',
            },
          ],
        },
      })
    );
    await waitForText('备份中的流水内容无效或包含未来日期');

    afterInvalidImport = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (
      afterInvalidImport.entries?.length !== 2 ||
      afterInvalidImport.customCategories?.length !== 1 ||
      afterInvalidImport.monthlyBudget !== 1800 ||
      afterInvalidImport.themeColor !== '#5B9A7B'
    ) {
      throw new Error('Rejected backups changed existing data.');
    }
    await screenshot('preview-settings.png');

    await click('首页');
    await waitForText('备份今天');
    await click('备份今天');
    await waitForText('编辑这笔流水');
    await fill('金额', '40.00');
    await click('保存这笔');
    await waitForText('40.00');
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    const importedToday = storedState.entries?.find((entry) => entry.id === 'backup-today');
    if (
      importedToday?.amount !== 40 ||
      importedToday?.date !== dateKey(today) ||
      importedToday?.type !== 'income'
    ) {
      throw new Error('Home entry editing failed.');
    }

    await click('我的');
    const settingsAfterEditText = await waitForText('预算、设置和本地数据');
    if (!settingsAfterEditText.includes('自定义分类')) {
      await click('打开设置');
      await waitForText('自定义分类');
    }

    const categoryIcons = [
      'food',
      'coffee',
      'transport',
      'shopping',
      'study',
      'entertainment',
      'home',
      'pet',
      'travel',
      'fitness',
      'health',
      'gift',
      'work',
      'education',
      'game',
      'camera',
    ];
    const categoryColors = [
      '#397A99',
      '#4B7F9D',
      '#5B9A7B',
      '#6A8F5D',
      '#C9975A',
      '#C47A8A',
      '#8B7BC1',
      '#6B79B8',
    ];
    const twentyCategories = Array.from({ length: 20 }, (_, index) => ({
      id: `custom-limit-${index + 1}`,
      type: index % 2 === 0 ? 'expense' : 'income',
      name: `限额分类${String(index + 1).padStart(2, '0')}`,
      icon: categoryIcons[index % categoryIcons.length],
      color: categoryColors[index % categoryColors.length],
    }));
    const limitBackup = {
      ...importedBackup,
      exportedAt: new Date().toISOString(),
      data: {
        ...importedBackup.data,
        customCategories: twentyCategories,
        entries: [],
      },
    };
    await click('导入备份');
    await injectFile(JSON.stringify(limitBackup));
    await waitForText('确认替换当前账本');
    await click('确认替换');
    await waitForText('20/20');
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (storedState.customCategories?.length !== 20) {
      throw new Error('The 20-category backup was not accepted.');
    }
    const addCategoryDisabled = await evaluate(`(() => {
      const button = document.querySelector('[aria-label="新增自定义分类"]');
      return Boolean(
        button &&
        (button.getAttribute('aria-disabled') === 'true' ||
          button.hasAttribute('disabled'))
      );
    })()`);
    if (!addCategoryDisabled) {
      throw new Error('The 21st custom category remained available.');
    }

    await click('首页');
    await waitForText('今天还没有流水');
    await evaluate(`localStorage.removeItem('yiye-ledger-v1'); location.reload(); true`);
    await waitForText('今天还没有流水');
    await click('记一笔');
    await waitForText('记下一笔');
    await click('关闭编辑');
    await delay(400);
    const afterCloseText = await evaluate('document.body.innerText');
    if (afterCloseText.includes('记下一笔')) {
      throw new Error('Close button did not dismiss the editor.');
    }

    await click('记一笔');
    await click('保存这笔');
    const invalidText = await waitForText('给这笔流水写个名称');
    if (!invalidText.includes('给这笔流水写个名称')) {
      throw new Error('Empty form validation did not run.');
    }

    await clickAriaExact('选择收入类型');
    await fill('流水名称', '家教收入');
    await fill('金额', '80.00');
    await fill('流水时间', '20:10');
    await fill('流水备注', '本周家教');
    await click('兼职');
    await screenshot('preview-editor.png');
    await click('保存这笔');

    const savedText = await waitForText('家教收入');
    if (
      !savedText.includes('+¥80.00') ||
      !savedText.includes('收入 +¥80.00') ||
      !savedText.includes('1 笔流水')
    ) {
      throw new Error('New income entry did not update the home ledger.');
    }
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (
      storedState.entries?.length !== 1 ||
      storedState.entries[0].categoryId !== 'parttime' ||
      storedState.entries[0].type !== 'income'
    ) {
      throw new Error('Income type or category selection was not saved.');
    }

    await click('我的');
    await waitForText('预算、设置和本地数据');
    await typeInto('每月预算', '100');
    await clickAriaExact('保存每月预算');
    await click('首页');
    const incomeBudgetText = await waitForText('收入 +¥80.00');
    if (!incomeBudgetText.includes('¥0.00 / ¥100.00')) {
      throw new Error('Income was incorrectly counted against the budget.');
    }
    await screenshot('preview-income.png');

    await click('家教收入');
    await waitForText('编辑这笔流水');
    await clickAriaExact('选择支出类型');
    await click('饮品');
    await click('保存这笔');
    const convertedText = await waitForText('−¥80.00');
    if (!convertedText.includes('¥80.00 / ¥100.00')) {
      throw new Error('Expense conversion did not update the budget total.');
    }
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (
      storedState.entries[0].type !== 'expense' ||
      storedState.entries[0].categoryId !== 'drink'
    ) {
      throw new Error('Changing the entry type did not reset to an expense category.');
    }

    await client.send('Page.reload');
    await waitForText('家教收入');
    await click('家教收入');
    await fill('金额', '10.00');
    await click('学习');
    await click('保存这笔');
    const editedText = await waitForText('10.00');
    if (!editedText.includes('10.00')) {
      throw new Error('Editing an existing entry did not update totals.');
    }
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (
      storedState.entries[0].amount !== 10 ||
      storedState.entries[0].categoryId !== 'study'
    ) {
      throw new Error('Edited expense details were not persisted.');
    }

    await client.send('Page.reload');
    await waitForText('10.00');
    await click('家教收入');
    await click('删除');
    await waitForText('确定删除这笔流水');
    await click('确认删除');
    await waitForText('今天还没有流水');

    await evaluate(`localStorage.removeItem('yiye-ledger-v1'); location.reload(); true`);
    await waitForText('今天还没有流水');

    if (client.errors.length > 0) {
      throw new Error(`Browser errors detected:\n${client.errors.join('\n')}`);
    }

    console.log(
      JSON.stringify(
        {
          emptyLedger: true,
          dailyCalendar: true,
          historyEntry: true,
          inlineSettings: true,
          customCategoryManagement: true,
          categoryDeleteProtection: true,
          categoryLimit: true,
          dataTransfer: true,
          backupV2: true,
          legacyV1Migration: true,
          invalidImportProtected: true,
          homeEntryEdit: true,
          incomeEntries: true,
          incomeBudgetExclusion: true,
          closeButton: true,
          categorySelection: true,
          budgetSetting: true,
          presetTheme: true,
          customTheme: true,
          createEditDelete: true,
          persistence: true,
          consoleErrors: 0,
        },
        null,
        2
      )
    );
  } finally {
    client?.close();
    chrome.kill();
    await delay(800);
    await rm(PROFILE_DIR, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
