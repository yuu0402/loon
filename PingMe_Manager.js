// 2026/05/14
// PingMe 账号管理面板（Loon）
// 打开 http://pingme.manage/ 管理账号

const scriptName = 'PingMe';
const storeKey = 'pingme_accounts_v1';

function notify(title, body) {
  $notification.post(scriptName, title, body);
}

function loadStore() {
  const raw = $persistentStore.read(storeKey);
  if (!raw) return { version: 1, accounts: {}, order: [] };
  try {
    const obj = JSON.parse(raw);
    if (!obj.accounts) obj.accounts = {};
    if (!Array.isArray(obj.order)) obj.order = Object.keys(obj.accounts);
    return obj;
  } catch (e) {
    return { version: 1, accounts: {}, order: [] };
  }
}

function saveStore(store) {
  $persistentStore.write(JSON.stringify(store), storeKey);
}

function idsOf(store) {
  return (store.order || []).filter(id => store.accounts && store.accounts[id]);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function parseQuery(url) {
  const q = (url.split('?')[1] || '').split('#')[0];
  const obj = {};
  q.split('&').forEach(p => {
    if (!p) return;
    const i = p.indexOf('=');
    const k = i >= 0 ? p.slice(0, i) : p;
    const v = i >= 0 ? p.slice(i + 1) : '';
    obj[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  return obj;
}

function html(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PingMe 管理</title><style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;background:#f6f7f9;margin:0;padding:16px;color:#111}
  h1{font-size:24px;margin:8px 0 16px}.card{background:#fff;border-radius:14px;padding:14px;margin:12px 0;box-shadow:0 2px 10px rgba(0,0,0,.06)}
  .muted{color:#666;font-size:13px}.id{font-family:monospace;font-size:12px;color:#666;word-break:break-all}.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  a.btn,button{display:inline-block;text-decoration:none;background:#007aff;color:white;border:0;border-radius:10px;padding:9px 12px;font-size:14px}
  a.danger{background:#ff3b30}a.gray{background:#8e8e93}input{font-size:16px;padding:9px;border:1px solid #ddd;border-radius:10px;min-width:120px}.ok{color:#188038}.warn{color:#d93025}
  </style></head><body><h1>PingMe 账号管理</h1>${body}<div class="card muted">使用说明：本页面由 Loon 本地拦截生成，不会访问外网。管理完成后可直接关闭。</div></body></html>`;
}

function renderHome(msg) {
  const store = loadStore();
  const ids = idsOf(store);
  let body = '';
  if (msg) body += `<div class="card ok">${esc(msg)}</div>`;
  body += `<div class="card"><b>当前账号数：${ids.length}</b><div class="row"><a class="btn gray" href="/">刷新</a><a class="btn danger" href="/clear?confirm=1">清空全部</a></div></div>`;
  if (!ids.length) {
    body += `<div class="card warn">当前没有账号。请先开启抓包并打开 PingMe 触发 queryBalanceAndBonus。</div>`;
    return html(body);
  }
  ids.forEach((id, i) => {
    const acc = store.accounts[id];
    const alias = acc.alias || `账号${i + 1}`;
    const updated = acc.updatedAt ? new Date(acc.updatedAt).toLocaleString() : '未知';
    body += `<div class="card"><h3>${i + 1}. ${esc(alias)}</h3><div class="id">id: ${esc(acc.id)}</div><div class="muted">更新：${esc(updated)}</div>
      <form action="/rename" method="get" class="row"><input type="hidden" name="index" value="${i + 1}"><input name="name" placeholder="新备注名"><button type="submit">修改备注</button></form>
      <div class="row"><a class="btn danger" href="/delete?index=${i + 1}&confirm=1">删除这个账号</a></div></div>`;
  });
  return html(body);
}

function sendHtml(body) {
  $done({ response: { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body } });
}

function mainWeb() {
  const url = $request.url;
  const path = '/' + (url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] || '').replace(/^\//, '');
  const q = parseQuery(url);
  const store = loadStore();
  const ids = idsOf(store);

  if (path.startsWith('/delete')) {
    const idx = Number(q.index);
    if (q.confirm !== '1' || !Number.isInteger(idx) || idx < 1 || idx > ids.length) return sendHtml(renderHome('删除参数无效'));
    const id = ids[idx - 1];
    const alias = store.accounts[id].alias || id;
    delete store.accounts[id];
    store.order = store.order.filter(x => x !== id);
    saveStore(store);
    notify('✅ 删除成功', `已删除第 ${idx} 个账号：${alias}`);
    return sendHtml(renderHome(`已删除第 ${idx} 个账号：${alias}`));
  }

  if (path.startsWith('/rename')) {
    const idx = Number(q.index);
    const name = String(q.name || '').trim();
    if (!Number.isInteger(idx) || idx < 1 || idx > ids.length || !name) return sendHtml(renderHome('备注参数无效'));
    const id = ids[idx - 1];
    store.accounts[id].alias = name;
    store.accounts[id].updatedAt = Date.now();
    saveStore(store);
    notify('✅ 备注成功', `第 ${idx} 个账号已改为：${name}`);
    return sendHtml(renderHome(`第 ${idx} 个账号已改为：${name}`));
  }

  if (path.startsWith('/clear')) {
    if (q.confirm !== '1') return sendHtml(renderHome('清空参数无效'));
    saveStore({ version: 1, accounts: {}, order: [] });
    notify('✅ 清空成功', '已清空全部 PingMe 账号数据');
    return sendHtml(renderHome('已清空全部 PingMe 账号数据'));
  }

  return sendHtml(renderHome(''));
}

function mainAction() {
  const action = '';
  notify('PingMe账号管理', '请在浏览器打开：http://pingme.manage/');
  $done();
}

if (typeof $request !== 'undefined' && $request) mainWeb();
else mainAction();
