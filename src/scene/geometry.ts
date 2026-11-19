import * as THREE from 'three'

export type Point = [number, number, number]
type Part = { matrix: THREE.Matrix4; color: THREE.Color }

export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let x = Math.imul(state ^ (state >>> 15), state | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

export class Shapes {
  private parts = new Map<THREE.BufferGeometry, Part[]>()
  readonly box = new THREE.BoxGeometry()
  readonly rock = new THREE.IcosahedronGeometry(1, 0)
  readonly crown = new THREE.DodecahedronGeometry(1, 0)
  readonly pine = new THREE.ConeGeometry(1, 1, 7)
  readonly pole = new THREE.CylinderGeometry(1, 1, 1, 8)
  readonly taper = new THREE.CylinderGeometry(.76, 1, 1, 10)
  readonly roof: THREE.BufferGeometry
  readonly sail: THREE.BufferGeometry

  constructor() {
    const a: Point = [-.5, 0, -.5], b: Point = [.5, 0, -.5], c: Point = [0, 1, -.5]
    const d: Point = [-.5, 0, .5], e: Point = [.5, 0, .5], f: Point = [0, 1, .5]
    this.roof = triangles([a,c,b, d,e,f, a,d,f, a,f,c, b,c,f, b,f,e, a,b,e, a,e,d])
    this.sail = triangles([[-.45, 0, 0], [.45, .08, .12], [-.45, 1, 0]])
  }

  at(geometry: THREE.BufferGeometry, color: string, pos: Point, size: Point, rotation: Point = [0, 0, 0]) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation))
    this.add(geometry, color, new THREE.Matrix4().compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...size)))
  }

  beam(color: string, from: Point, to: Point, width: number, depth = width) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to)
    const direction = b.clone().sub(a)
    const length = direction.length()
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    this.add(this.box, color, new THREE.Matrix4().compose(a.lerp(b, .5), rotation, new THREE.Vector3(width, length, depth)))
  }

  private add(geometry: THREE.BufferGeometry, color: string, matrix: THREE.Matrix4) {
    let list = this.parts.get(geometry)
    if (!list) this.parts.set(geometry, list = [])
    list.push({matrix, color: new THREE.Color(color)})
  }

  build(parent: THREE.Object3D) {
    const mat = new THREE.MeshLambertMaterial({flatShading: true, side: THREE.DoubleSide})
    for (const [geo, parts] of this.parts) {
      const mesh = new THREE.InstancedMesh(geo, mat, parts.length)
      parts.forEach((part, i) => {
        mesh.setMatrixAt(i, part.matrix)
        mesh.setColorAt(i, part.color)
      })
      mesh.castShadow = mesh.receiveShadow = true
      mesh.computeBoundingSphere()
      parent.add(mesh)
    }
    this.parts.clear()
    // These primitives are also constructed in small batches (boats, people and sails).
    for (const g of [this.box, this.rock, this.crown, this.pine, this.pole, this.taper, this.roof, this.sail]) {
      if (!parent.children.some(child => child instanceof THREE.Mesh && child.geometry === g)) g.dispose()
    }
  }
}

export function triangles(points: Point[], colors?: THREE.Color[]) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
  if (colors) geo.setAttribute('color', new THREE.Float32BufferAttribute(colors.flatMap(c => [c.r,c.g,c.b]), 3))
  geo.computeVertexNormals()
  return geo
}
