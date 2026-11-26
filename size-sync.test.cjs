const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const math = require('./size-sync.js');
const points = (size) => [1, 2, 3, 0.1, 0.2, 0.3, ...size, 0, 0, 0, 0, 0, 0, 0];
function fixture(failAt = null) {
    const shapes = [0, 4, 8].map((frame) => ({ frame, type: 'cuboid',
        points: points(frame === 4 ? [4, 2, 1.5] : [5, 3, 2]), outside: frame === 8,
        occluded: true, attributes: [{ spec_id: 1, value: 'x' }], rotation: 0 }));
    const original = structuredClone(shapes);
    let saves = 0;
    let fail = failAt;
    const dispatched = [];
    const job = { dimension: '3d', startFrame: 0, stopFrame: 8, annotations: {
        get: async (frame) => [state(frame), { clientID: 99, points: points([9, 9, 9]) }],
    }, actions: { get: async () => ({ undo: [], redo: [] }) },
    frames: { get: () => { throw Error('Must not reload point cloud'); } } };
    function state(frame) {
        const s = shapes.find((v) => v.frame === frame);
        return { clientID: 15, objectType: 'track', shapeType: 'cuboid', keyframe: true,
            label: { name: 'Pedestrian' }, outside: s.outside, points: s.points.slice(),
            export: async () => ({ shapes: structuredClone(shapes) }),
            async save() {
                if (fail === frame) { fail = null; throw Error('simulated failure'); }
                s.points = this.points.slice(); saves++;
            } };
    }
    const annotation = { job: { instance: job }, player: { frame: { number: 4 } },
        annotations: { activatedStateID: 15, states: [state(4)], saving: {} } };
    const sandbox = { console, CVATSizeMath: math, document: {
        createElement: () => ({ style: {}, remove() {} }), addEventListener() {},
        removeEventListener() {}, body: { append() {} },
    } };
    sandbox.window = sandbox;
    sandbox.cvatUI = { registerComponent: (build) => build({ store: { getState: () => ({ annotation }) },
        dispatch: async (action) => {
            assert.equal(action.type, 'UPDATE_ANNOTATIONS_SUCCESS');
            dispatched.push(action);
            annotation.annotations.states = [state(4)];
        },
        actionCreators: { changeFrameAsync: () => { throw Error('Must not change frame'); } } }) };
    vm.runInNewContext(fs.readFileSync(`${__dirname}/bridge.js`, 'utf8'), sandbox);
    return { execute: sandbox.CVATSizeSync.execute, shapes, original, count: () => saves, annotation, dispatched };
}
test('plan changes only dimensions and includes outside keyframes within job bounds', () => {
    const track = { shapes: [-1, 0, 8, 10].map((frame) => ({ frame, type: 'cuboid', points: points([9, 9, 9]), outside: true })) };
    const original = structuredClone(track);
    const changes = math.plan(track, points([4, 2, 1.5]), 0, 8);
    assert.deepEqual(changes.map((v) => v.frame), [0, 8]);
    assert.deepEqual(changes[0].after.slice(0, 6), track.shapes[1].points.slice(0, 6));
    assert.deepEqual(track, original);
    assert.throws(() => math.plan(track, Array(15).fill(1), 0, 8));
    assert.throws(() => math.plan(track, points([0, 2, 3]), 0, 8));
});
test('injection and inspect write nothing; explicit sync updates track, undo restores', async () => {
    const f = fixture();
    assert.equal(f.count(), 0);
    const read = await f.execute('inspect');
    const live = await f.execute('selection');
    assert.equal(live.id, 15);
    assert.deepEqual(Array.from(live.size), [4, 2, 1.5]);
    assert.equal(read.label, 'Pedestrian'); // No class restrictions.
    assert.equal(read.changed, 2);
    assert.equal(f.count(), 0);
    await f.execute('sync');
    assert.equal(f.count(), 2);
    for (const s of f.shapes) {
        assert.deepEqual(s.points.slice(6, 9), [4, 2, 1.5]);
        assert.equal(s.points.length, 16);
        assert.deepEqual(s.points.slice(9), [0, 0, 0, 0, 0, 0, 0]);
    }
    for (let i = 0; i < f.shapes.length; i++) {
        assert.deepEqual({ ...f.shapes[i], points: null }, { ...f.original[i], points: null });
        assert.deepEqual(f.shapes[i].points.slice(0, 6), f.original[i].points.slice(0, 6));
    }
    await f.execute('undo');
    assert.deepEqual(f.shapes, f.original);
});
test('supports compact and padded 3D data, preserving destination tail exactly', () => {
    const reference = points([4, 2, 1.5]).slice(0, 9);
    const destination = points([9, 9, 9]);
    destination.splice(9, 7, 7, 6, 5, 4, 3, 2, 1);
    const [change] = math.plan({ shapes: [{ type: 'cuboid', frame: 0, points: destination }] }, reference, 0, 0);
    assert.deepEqual(change.after.slice(9), destination.slice(9));
    assert.deepEqual(change.after.slice(6, 9), [4, 2, 1.5]);
    assert.equal(change.after.length, 16);
    const [compact] = math.plan({ shapes: [{ type: 'cuboid', frame: 0, points: destination.slice(0, 9) }] }, points([4, 2, 1.5]), 0, 0);
    assert.equal(compact.after.length, 9);
});
test('failed save rolls back already written keyframes', async () => {
    const f = fixture(8);
    await assert.rejects(f.execute('sync'), /simulated failure/);
    assert.deepEqual(f.shapes, f.original);
});
test('undo refuses to overwrite subsequent manual edits', async () => {
    const f = fixture();
    await f.execute('sync');
    f.shapes[0].points[0] = 123;
    const before = structuredClone(f.shapes);
    await assert.rejects(f.execute('undo'), /Track đã được chỉnh sửa/);
    assert.deepEqual(f.shapes, before);
});
test('locked objects and 2D jobs are rejected before mutation', async () => {
    const f = fixture();
    f.annotation.annotations.states[0].lock = true;
    await assert.rejects(f.execute('sync'), /mở khóa/);
    f.annotation.job.instance.dimension = '2d';
    await assert.rejects(f.execute('sync'), /job 3D/);
    assert.equal(f.count(), 0);
});
test('sync updates only annotation UI and a repeated no-op does not refresh the frame', async () => {
    const f = fixture();
    await f.execute('sync');
    assert.equal(f.dispatched.length, 1);
    assert.equal(f.dispatched[0].payload.states.length, 1);
    assert.equal(f.dispatched[0].payload.states[0].clientID, 15);
    await f.execute('sync');
    assert.equal(f.dispatched.length, 1);
    assert.equal(f.count(), 2);
});
