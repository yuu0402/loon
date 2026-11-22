// WeTalk 账号导出面板 —— 结构与 API 全量对齐已验证可用的 PingMe_Panel.js
// Loon 规则：http-request ^https?:\/\/wetalk\.manage\/? script-path=WeTalk_Export.js
// 浏览器访问 http://wetalk.manage/ 查看列表，/export 下载 wetalk_accounts.json（供 NAS wetalk_nas.py 使用）

const scriptName = 'WeTalk导出';
const storeKey = 'wetalk_accounts_v1';

function storeRead(key) {
  try {
    if (typeof $persistentStore !== 'undefined') {
      const v = $persistentStore.read(key);
      if (v != null) return v;
    }
  } catch (e) {}
  try {
    if (typeof $prefs !== 'undefined') {
      const v = $prefs.valueForKey(key);
      if (v != null) return v;
    }
  } catch (e) {}
  return null;
}

function resp(body, contentType, extraHeaders) {
  const headers = Object.assign({ 'Content-Type': contentType + '; charset=utf-8', 'Cache-Control': 'no-cache' }, extraHeaders || {});
  $done({ response: { status: 200, headers, body: body } });
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mainWeb() {
  const url = $request.url || '';
  const isExport = /\/export/.test(url);
  const raw = storeRead(storeKey);

  let store = null;
  try { store = raw ? JSON.parse(raw) : null; } catch (e) { store = null; }
  const ids = store && store.accounts ? (store.order || Object.keys(store.accounts)).filter(id => store.accounts[id]) : [];

  if (!ids.length) {
    if (isExport) {
      return resp(JSON.stringify({ exportedAt: Date.now(), app: 'WeTalk', note: '账号库为空：请先打开 WeTalk App 触发一次余额查询抓包', accounts: [] }, null, 2),
        'application/json', { 'Content-Disposition': 'attachment; filename="wetalk_accounts.json"' });
    }
    const diag = '诊断信息：$persistentStore=' + (typeof $persistentStore !== 'undefined') +
      '，$prefs=' + (typeof $prefs !== 'undefined') +
      '，原始数据=' + (raw ? ('长度 ' + raw.length) : '无');
    return resp('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>WeTalk 账号导出</title>' + PAGE_CSS +
      '<div class="wrap"><div class="card"><div class="hd"><span class="logo">📞</span><span>WeTalk 账号导出</span></div>' +
      '<div class="empty">账号库为空</div>' +
      '<div class="tip">打开 WeTalk App（登录状态）刷一下余额<br>收到「已入库」通知后回来刷新本页</div>' +
      '<div class="diag">' + esc(diag) + '</div></div></div>', 'text/html');
  }

  const accounts = ids.map((id, i) => {
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

  if (isExport) {
    const payload = { exportedAt: Date.now(), app: 'WeTalk', note: 'WeTalk 账号凭据导出，配合 NAS 端 wetalk_nas.py 使用', accounts: accounts };
    return resp(JSON.stringify(payload, null, 2), 'application/json',
      { 'Content-Disposition': 'attachment; filename="wetalk_accounts.json"' });
  }

  const rows = accounts.map(a =>
    '<tr><td>' + a.index + '</td><td>' + esc(a.alias) + '</td><td>' + esc(a.id) + '</td><td>' +
    (a.updatedAt ? new Date(a.updatedAt).toLocaleString('zh-CN') : '-') + '</td></tr>').join('');
  return resp('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>WeTalk 账号导出</title>' + PAGE_CSS +
    '<div class="wrap"><div class="card"><div class="hd"><span class="logo">📞</span><span>WeTalk 账号导出</span><span class="badge">' + accounts.length + ' 个账号</span></div>' +
    '<table><tr><th>#</th><th>备注</th><th>账号键</th><th>更新时间</th></tr>' + rows + '</table>' +
    '<a class="btn" href="/export">⬇️ 下载 wetalk_accounts.json</a></div></div>', 'text/html');
}

if (typeof $request !== 'undefined' && $request) {
  try {
    mainWeb();
  } catch (e) {
    // 出错也把错误内容返到页面上，不再静默掐断
    resp('WeTalk 导出脚本异常：' + (e && e.message ? e.message : String(e)) + '\n\n' + (e && e.stack ? e.stack : ''), 'text/plain');
  }
} else {
  $done();
}
