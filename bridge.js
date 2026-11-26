/* Injected only after opening the extension; no annotation writes on load. */
(() => {
    'use strict';
    if (window.CVATSizeSync?.version === '1.1.2') return;
    window.CVATSizeWidget?.destroy();
    let bridge;
    let busy = false;
    let undo = null;
    function connect() {
        if (!bridge) {
            if (!window.cvatUI?.registerComponent) throw Error('Hãy mở job CVAT và chờ tải xong. Phiên bản này cần có cvatUI plugin entrypoint.');
            window.cvatUI.registerComponent((api) => {
                bridge = api;
                return { name: 'Manual cuboid size sync', destructor: () => { bridge = null; } };
            });
        }
        if (!bridge?.store) throw Error('CVAT không cung cấp plugin store tương thích.');
        return bridge.store.getState().annotation;
    }
    function context() {
        const a = connect();
        const job = a?.job?.instance;
        if (!job || job.dimension !== '3d') throw Error('Hãy mở job 3D.');
        if (a.player.playing || a.player.frame.fetching || a.job.saving || a.annotations.saving?.uploading) {
            throw Error('Hãy dừng phát và chờ CVAT tải/lưu xong.');
        }
        const selected = a.annotations.states.find((s) => s.clientID === a.annotations.activatedStateID);
        if (!selected || selected.objectType !== 'track' || selected.shapeType !== 'cuboid') {
            throw Error('Hãy chọn một CUBOID TRACK ở frame có kích thước chuẩn.');
        }
        if (selected.lock || selected.isGroundTruth || selected.outside) throw Error('Hãy chọn track đang hiện diện, có thể chỉnh sửa và đã mở khóa.');
        window.CVATSizeMath.valid(selected.points);
        return { job, selected, frame: a.player.frame.number };
    }
    async function inspect() {
        const c = context();
        const track = await c.selected.export();
        const changes = window.CVATSizeMath.plan(track, c.selected.points, c.job.startFrame, c.job.stopFrame);
        const latest = context();
        if (latest.job !== c.job || latest.frame !== c.frame || latest.selected.clientID !== c.selected.clientID) {
            throw Error('Bạn đã đổi frame/object. Hãy đọc lại thông tin.');
        }
        return { ...c, track, changes };
    }
    function guardJob(job) {
        if (connect().job.instance !== job) throw Error('Job đã thay đổi.');
    }
    async function at(job, id, frame) {
        guardJob(job);
        const states = await job.annotations.get(frame, true, []);
        const s = states.find((v) => v.clientID === id && v.objectType === 'track');
        if (!s || !s.keyframe) throw Error(`Keyframe ${frame} không còn tồn tại.`);
        return s;
    }
    async function refresh(job, id) {
        guardJob(job);
        const frame = connect().player.frame.number;
        const states = await job.annotations.get(frame, true, []);
        const updated = states.find((s) => s.clientID === id && s.objectType === 'track');
        const history = await job.actions.get();
        guardJob(job);
        if (connect().player.frame.number !== frame) return;
        // Use the same annotation-only update as a manual box edit. Reloading
        // the frame here needlessly tears down and reloads the LiDAR/cameras.
        await bridge.dispatch({ type: 'UPDATE_ANNOTATIONS_SUCCESS',
            payload: { states: updated ? [updated] : [], history } });
    }
    async function write(job, id, changes) {
        // Preflight every keyframe before writing any state. Only set the points field.
        for (const change of changes) {
            const s = await at(job, id, change.frame);
            if (JSON.stringify(s.points) !== JSON.stringify(change.before)) throw Error('Track đã được chỉnh sửa. Hãy đọc lại thông tin.');
        }
        const applied = [];
        try {
            for (const change of changes) {
                const s = await at(job, id, change.frame);
                s.points = change.after.slice();
                await s.save();
                applied.push(change);
            }
        } catch (error) {
            try {
                for (const change of applied.reverse()) {
                    const s = await at(job, id, change.frame);
                    s.points = change.before.slice();
                    await s.save();
                }
            } catch (rollbackError) {
                throw Error(`${error.message} Khôi phục chưa hoàn tất: ${rollbackError.message}. Hãy kiểm tra track trước khi Save.`);
            }
            throw error;
        }
    }
    async function execute(command) {
        if (busy) throw Error('Đang thực hiện, vui lòng chờ.');
        if (command === 'selection') {
            const c = context();
            return { id: c.selected.clientID, label: c.selected.label.name, frame: c.frame,
                size: c.selected.points.slice(6, 9), job: c.job.id };
        }
        if (command === 'inspect') {
            const c = await inspect();
            return { id: c.selected.clientID, label: c.selected.label.name, frame: c.frame,
                size: c.selected.points.slice(6, 9), changed: c.changes.length,
                keyframes: c.track.shapes.filter((s) => s.frame >= c.job.startFrame && s.frame <= c.job.stopFrame).length,
                canUndo: undo?.job === c.job };
        }
        if (!['sync', 'undo'].includes(command)) throw Error('Lệnh không hợp lệ.');
        busy = true;
        const shield = document.createElement('div');
        shield.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0005;color:white;display:grid;place-items:center;font:18px sans-serif;cursor:wait';
        shield.textContent = 'Đang đồng bộ kích thước…';
        const stopKeys = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
        document.addEventListener('keydown', stopKeys, true);
        document.body.append(shield);
        let touchedJob;
        let touchedID;
        try {
            if (command === 'sync') {
                const c = await inspect();
                if (!c.changes.length) return { message: 'Các keyframe đã có cùng kích thước.' };
                touchedJob = c.job;
                touchedID = c.selected.clientID;
                await write(c.job, c.selected.clientID, c.changes);
                undo = { job: c.job, id: c.selected.clientID, changes: c.changes };
                return { message: `Đã đồng bộ ${c.changes.length} keyframe của track #${c.selected.clientID}. Bấm Save trong CVAT để lưu.` };
            }
            if (!undo || connect().job.instance !== undo.job) throw Error('Không có lần đồng bộ để hoàn tác trong job này.');
            touchedJob = undo.job;
            touchedID = undo.id;
            await write(undo.job, undo.id, undo.changes.map((c) => ({ frame: c.frame, before: c.after, after: c.before })));
            undo = null;
            return { message: 'Đã hoàn tác lần đồng bộ gần nhất. Bấm Save trong CVAT nếu cần lưu.' };
        } finally {
            try { if (touchedJob) await refresh(touchedJob, touchedID); }
            finally { shield.remove(); document.removeEventListener('keydown', stopKeys, true); busy = false; }
        }
    }
    window.CVATSizeSync = { execute, version: '1.1.2' };
})();
