import * as pc from "playcanvas";

/** Beveled, rounded extrusion along Z; dimensions match the rule-space plate. */
export function plateMesh(
  device: pc.GraphicsDevice,
  width: number,
  height: number,
) {
  const positions: number[] = [];
  const indices: number[] = [];
  const radius = Math.min(0.32, height / 2);
  const rings = [
    { z: -0.14, inset: 0.06 },
    { z: -0.08, inset: 0 },
    { z: 0.08, inset: 0 },
    { z: 0.14, inset: 0.06 },
  ];
  for (const { z, inset } of rings) {
    for (let corner = 0; corner < 4; corner++) {
      const cx = (corner === 0 || corner === 3 ? 1 : -1) * (width / 2 - radius);
      const cy = (corner < 2 ? 1 : -1) * (height / 2 - radius);
      for (let j = 0; j <= 8; j++) {
        const a = ((corner * 90 + (j * 90) / 8) * Math.PI) / 180;
        positions.push(
          cx + (radius - inset) * Math.cos(a),
          cy + (radius - inset) * Math.sin(a),
          z,
        );
      }
    }
  }
  const count = 36;
  for (let ring = 0; ring < 3; ring++) {
    for (let i = 0; i < count; i++) {
      const a = ring * count + i,
        b = ring * count + ((i + 1) % count);
      indices.push(a, b, a + count, b, b + count, a + count);
    }
  }
  // Separate cap vertices retain a crisp flat surface at the bevel.
  for (const front of [false, true]) {
    const center = positions.length / 3;
    const z = front ? 0.14 : -0.14;
    positions.push(0, 0, z);
    const source = front ? 3 * count : 0;
    for (let i = 0; i < count; i++)
      positions.push(
        ...positions.slice((source + i) * 3, (source + i) * 3 + 3),
      );
    for (let i = 0; i < count; i++) {
      const a = center + 1 + i,
        b = center + 1 + ((i + 1) % count);
      indices.push(...(front ? [center, a, b] : [center, b, a]));
    }
  }
  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setNormals(pc.calculateNormals(positions, indices));
  mesh.setIndices(indices);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  return mesh;
}
