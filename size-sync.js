/* Pure planning functions, shared by the page bridge and Node tests. */
(function (root) {
    'use strict';
    function valid(points) {
        if (!Array.isArray(points) || ![9, 16].includes(points.length) ||
            points.some((n) => !Number.isFinite(n)) || points.slice(6, 9).some((n) => n <= 0)) {
            throw Error('Cần cuboid 3D có L/W/H hợp lệ.');
        }
    }
    function plan(track, reference, start, stop) {
        valid(reference);
        if (!Array.isArray(track.shapes) || !track.shapes.length) throw Error('Không tìm thấy keyframe.');
        return track.shapes.filter((s) => s.frame >= start && s.frame <= stop).map((s) => {
            if (s.type !== 'cuboid') throw Error('Track không phải cuboid.');
            valid(s.points);
            const before = s.points.slice();
            const after = before.slice();
            after.splice(6, 3, ...reference.slice(6, 9));
            return { frame: s.frame, before, after };
        }).filter((s) => s.before.some((n, i) => n !== s.after[i]));
    }
    root.CVATSizeMath = { valid, plan };
    if (typeof module !== 'undefined') module.exports = root.CVATSizeMath;
})(globalThis);
