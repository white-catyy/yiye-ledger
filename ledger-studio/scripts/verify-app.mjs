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
        const bodyText = await evaluate('document.body.innerText');
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

    async function screenshot(path) {
      const result = await client.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      });
      await writeFile(path, Buffer.from(result.data, 'base64'));
    }

    const initialText = await waitForText('今天还没有流水');
    if (!initialText.includes('0.00') || !initialText.includes('预算')) {
      throw new Error('Initial empty state is incorrect.');
    }
    await screenshot('preview-home.png');

    await click('明细');
    const detailText = await waitForText('本月还没有流水');
    if (!detailText.includes('本月明细') || detailText.includes('今日流水')) {
      throw new Error('Monthly detail page still duplicates the home page.');
    }

    await click('我的');
    await waitForText('主题颜色');
    await fill('每月预算', '2000');
    await click('保存');
    await click('薄荷');

    let storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (storedState.monthlyBudget !== 2000 || storedState.themeColor !== '#5B9A7B') {
      throw new Error('Budget or preset theme was not persisted.');
    }

    await fill('自定义主题色值', '#8B7BC1');
    await click('应用');
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (storedState.themeColor !== '#8B7BC1') {
      throw new Error('Custom theme color was not persisted.');
    }
    await screenshot('preview-settings.png');

    await click('首页');
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

    await fill('流水名称', '打印资料');
    await fill('金额', '5.50');
    await fill('流水时间', '20:10');
    await fill('流水备注', '论文终稿');
    await click('饮品');
    await screenshot('preview-editor.png');
    await click('保存这笔');

    const savedText = await waitForText('打印资料');
    if (!savedText.includes('5.50') || !savedText.includes('1 笔流水')) {
      throw new Error('New entry did not update the home ledger.');
    }
    storedState = await evaluate(
      `JSON.parse(localStorage.getItem('yiye-ledger-v1') ?? '{}')`
    );
    if (storedState.entries?.length !== 1 || storedState.entries[0].categoryId !== 'drink') {
      throw new Error('Category selection was not saved.');
    }

    await client.send('Page.reload');
    await waitForText('打印资料');
    await click('打印资料');
    await fill('金额', '10.00');
    await click('学习');
    await click('保存这笔');
    const editedText = await waitForText('10.00');
    if (!editedText.includes('10.00')) {
      throw new Error('Editing an existing entry did not update totals.');
    }

    await client.send('Page.reload');
    await waitForText('10.00');
    await click('打印资料');
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
          monthlyDetails: true,
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
