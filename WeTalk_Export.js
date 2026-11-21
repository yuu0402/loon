// WeTalk 账号导出面板 —— 读取 WeTalk.js 入库的 wetalk_accounts_v1
// Loon 规则：http-request ^https?:\/\/wetalk\.manage(\/|$) script-path=WeTalk_Export.js
// 浏览器访问 http://wetalk.manage/ 查看列表，/export 下载 wetalk_accounts.json（供 NAS wetalk_nas.py 使用）

const storeKey = 'wetalk_accounts_v1';

function jsonResponse(obj, download) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (download) headers['Content-Disposition'] = 'attachment; filename="wetalk_accounts.json"';
  $done({ response: { status: 200, headers, body: JSON.stringify(obj, null, 2) } });
}

function htmlResponse(html) {
  $done({ response: { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html } });
}

function buildAccounts(store) {
  return (store.order || Object.keys(store.accounts))
    .filter(id => store.accounts[id])
    .map((id, i) => {
      const acc = store.accounts[id];
      const cap = acc.capture || {};
      return {
        index: i + 1,
        id: acc.id || id,
        alias: acc.alias || acc.email || id,
        uaSeed: i,
        baseUA: cap.baseUA || acc.baseUA || '',
        paramsRaw: cap.params || cap.paramsRaw || {},
        headers: cap.headers || {},
        updatedAt: acc.updatedAt || 0
      };
    });
}

const raw = $prefs.valueForKey(storeKey);
let store = null;
try { store = raw ? JSON.parse(raw) : null; } catch (e) { store = null; }

const isExport = /\/export/.test($request.url || '');

if (!store || !store.accounts || !(store.order || []).length) {
  const empty = { exportedAt: Date.now(), app: 'WeTalk', note: '账号库为空：请先打开 WeTalk App 触发一次余额查询抓包', accounts: [] };
  if (isExport) jsonResponse(empty, true);
  else htmlResponse('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WeTalk 账号导出</title><h3>账号库为空</h3><p>请先打开 WeTalk App（登录状态）刷一下余额，收到「已入库」通知后再回来刷新。</p>');
} else {
  const accounts = buildAccounts(store);
  const payload = {
    exportedAt: Date.now(),
    app: 'WeTalk',
    note: 'WeTalk 账号凭据导出，配合 NAS 端 wetalk_nas.py 使用',
    accounts
  };
  if (isExport) {
    jsonResponse(payload, true);
  } else {
    const rows = accounts.map(a =>
      '<tr><td>' + a.index + '</td><td>' + a.alias + '</td><td>' + a.id + '</td><td>' +
      (a.updatedAt ? new Date(a.updatedAt).toLocaleString('zh-CN') : '-') + '</td></tr>'
    ).join('');
    htmlResponse('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>WeTalk 账号导出</title><h3>WeTalk 账号（' + accounts.length + '）</h3>' +
      '<table border="1" cellpadding="6" cellspacing="0"><tr><th>#</th><th>备注</th><th>账号键</th><th>更新时间</th></tr>' + rows + '</table>' +
      '<p><a href="/export">⬇️ 下载 wetalk_accounts.json</a></p>');
  }
}
