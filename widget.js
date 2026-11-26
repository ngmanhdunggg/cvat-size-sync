/* Floating UI: automatic reads only; mutations require explicit button clicks. */
(() => {
    'use strict';
    if (window.CVATSizeWidget) { window.CVATSizeWidget.toggle(); return; }
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483646;';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
      :host{all:initial;font:14px/1.5 system-ui,sans-serif;color:#172033}
      *{box-sizing:border-box}button{font:inherit;cursor:pointer;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#172033;padding:9px 12px}
      button:disabled{opacity:.45;cursor:default}#panel{width:316px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 8px 32px #0003;padding:15px;margin-bottom:10px;max-height:75vh;overflow:auto}
      [hidden]{display:none!important}header{display:flex;align-items:center;justify-content:space-between;gap:8px}strong{font-size:15px}#close{padding:1px 8px;font-size:22px;border:0;background:transparent}
      #info{white-space:pre-wrap;background:white;border-radius:8px;padding:12px;margin:10px 0;font-variant-numeric:tabular-nums}
      #sync{background:#175bd8;border-color:#175bd8;color:white;font-weight:600;width:100%}#undo{width:100%;margin-top:8px}
      small{display:block;color:#64748b;font-size:12px;margin-top:10px}#status{white-space:pre-wrap;margin:8px 0;color:#175bd8;max-height:100px;overflow:auto}
      #toggle{display:flex;align-items:center;justify-content:center;margin-left:auto;width:50px;height:50px;border-radius:50%;background:#175bd8;color:white;border:2px solid white;box-shadow:0 3px 12px #0004}
      svg{width:28px;height:28px}
      </style>
      <section id="panel" aria-label="Đồng bộ kích thước cuboid">
        <header><strong>Object đang chọn</strong><button id="close" title="Thu gọn" aria-label="Thu gọn">×</button></header>
        <div id="info" aria-live="polite">Đang đọc object…</div>
        <button id="sync" disabled>Đồng bộ L/W/H</button>
        <button id="undo">Hoàn tác lần đồng bộ</button>
        <div id="status" role="status"></div>
        <small>Tự cập nhật thông tin khi chọn object. Chỉ bấm Đồng bộ mới áp dụng kích thước cho track. Bấm Save trong CVAT để lưu.</small>
      </section>
      <button id="toggle" title="Bật/tắt bảng đồng bộ kích thước" aria-label="Bật/tắt bảng đồng bộ kích thước" aria-expanded="true">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3 28 9v14l-12 6L4 23V9Z M4 9l12 6 12-6 M16 15v14"/></svg>
      </button>`;
    document.body.append(host);
    const get = (id) => shadow.getElementById(id);
    const panel = get('panel');
    let busy = false;
    let reading = false;
    let last = '';
    let timer;
    const toggle = () => {
        panel.hidden = !panel.hidden;
        get('toggle').setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) { last = ''; void read(); }
    };
    // Keep clicks in the widget from reaching the CVAT canvas.
    for (const event of ['pointerdown', 'mousedown', 'click', 'dblclick', 'keydown', 'keyup', 'wheel']) {
        host.addEventListener(event, (e) => e.stopPropagation());
    }
    async function read() {
        if (busy || reading || panel.hidden || document.hidden) return;
        reading = true;
        try {
            const value = await window.CVATSizeSync.execute('selection');
            const signature = JSON.stringify(value);
            if (signature !== last) {
                get('info').textContent = `Track #${value.id} · ${value.label}\nFrame chuẩn: ${value.frame}\nL: ${value.size[0].toFixed(4)} m\nW: ${value.size[1].toFixed(4)} m\nH: ${value.size[2].toFixed(4)} m`;
                get('status').textContent = '';
                last = signature;
            }
            get('sync').disabled = false;
        } catch (error) {
            get('info').textContent = error.message;
            get('sync').disabled = true;
            last = '';
        } finally { reading = false; }
    }
    async function mutate(command) {
        if (busy) return;
        busy = true;
        get('sync').disabled = true;
        get('undo').disabled = true;
        get('status').textContent = command === 'sync' ? 'Đang đồng bộ…' : 'Đang hoàn tác…';
        try {
            const result = await window.CVATSizeSync.execute(command);
            get('status').textContent = result.message;
        } catch (error) { get('status').textContent = error.message; }
        finally { busy = false; get('undo').disabled = false; void read(); }
    }
    get('sync').onclick = () => mutate('sync');
    get('undo').onclick = () => mutate('undo');
    get('toggle').onclick = toggle;
    get('close').onclick = toggle;
    window.CVATSizeWidget = { toggle, destroy() {
        clearInterval(timer); host.remove(); delete window.CVATSizeWidget;
    } };
    timer = setInterval(() => {
        if (!host.isConnected) { clearInterval(timer); delete window.CVATSizeWidget; return; }
        void read();
    }, 500);
    void read();
})();
