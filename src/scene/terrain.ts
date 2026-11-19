import * as THREE from 'three'
import {triangles, type Point} from './geometry'

const TAU = Math.PI * 2
const meadow = ['#a2b956','#adb95b','#adbb60','#b6bd60','#95b45c','#a6b956']
const forest = ['#748f53','#8ca256','#97ac57','#8ca459']
const cliff = ['#92917e','#a0977d','#7b8173','#9b977e','#858b79']
const granite = ['#637f80','#788b83','#84958e','#8d9e94','#607875']
const sand = ['#e4cd91','#eed79e','#d7bd81','#efd9a3']

export function makeTerrain(scene: THREE.Scene, random: () => number) {
  const phase = random() * TAU
  const bend = (a: number) => 1 + .10*Math.cos(3*a+.75) + .065*Math.sin(5*a-1.7) + .042*Math.sin(7*a+phase)
  function coast(a: number, r: number): Point {
    return [Math.cos(a)*10.5*r*bend(a), 0, Math.sin(a)*7.7*r*bend(a)]
  }
  function elevation(x: number,z: number) {
    const peak = (cx:number,cz:number,w:number,d:number,h:number) => h * Math.max(0, 1-Math.hypot((x-cx)/w,(z-cz)/d))
    const hills = Math.max(peak(-2.9,-3.2,4.2,3.65,5.0),peak(-.45,-3.9,3.5,3.1,6.15),peak(1.9,-3,3.2,2.9,4.35))
    return .95 + hills + .24*Math.sin(.68*x+.3*z) + .14*Math.sin(.9*z+.25*x)
  }
  const stages = [
    [1.25,-.16],[1.13,-.11],[1.045,.035],[1.00,.18],[.965,.29],[.94,.5],[.90,.94],
    ...[.83,.74,.65,.56,.47,.38,.29,.20,.11,.0].map(v=>[v,1])
  ]
  const rings: Point[][] = []
  const segments = 74
  for (const [stage, [r,h]] of stages.entries()) {
    const ring: Point[] = []
    const count = r === 0 ? 1 : Math.max(8,Math.round(segments*Math.min(1,r/.88)))
    for (let i=0;i<count;i++) {
      const a = TAU * (i + (stage % 2 ? .36 : 0) + (random()-.5)*.38)/count
      const p = coast(a, r + ((stage>5 && r>0) ? (random()-.5)*.034 : 0))
      const tidal = .5+.5*Math.cos(3*a-.1)
      const height = elevation(p[0],p[2])
      p[1] = stage <= 4 ? h : stage === 5 ? h + tidal * .22 : height + (r === 0 ? 0 : (random()-.5)*.16)
      ring.push(p)
    }
    rings.push(ring)
  }
  const points: Point[] = [], colors: THREE.Color[] = []
  function face(stage: number, a: Point,b: Point,c: Point) {
    const y=(a[1]+b[1]+c[1])/3, x=(a[0]+b[0]+c[0])/3, z=(a[2]+b[2]+c[2])/3
    let choices: string[]
    if (stage < 2) choices = stage === 0 ? ['#369b9e','#3b9d9e','#409f9e'] : ['#76c3b2','#83c9b4','#8ac6af']
    else if (stage < 4) choices = sand
    else if (stage < 6) choices = z > 2 && x < 4 ? sand : cliff
    else if (y > 4.75 + .36*Math.sin(x*4)) choices = ['#f5f0da','#e6edde','#dbe6d8','#cbded5']
    else if (y > 2.55) choices = granite
    else if (y > 1.7 || (x<-4 && z<1.4)) choices = forest
    else choices = meadow
    const color = new THREE.Color(choices[Math.floor(random()*choices.length)])
    points.push(a,b,c)
    colors.push(color,color,color)
  }
  for (let k=0;k<rings.length-1;k++) {
    const outer=rings[k], inner=rings[k+1]
    let i=0,j=0
    while(i<outer.length || (inner.length>1 && j<inner.length)){
      const a=outer[i%outer.length],b=inner[j%inner.length]
      if(inner.length===1 || (i+1)/outer.length <= (j+1)/inner.length) {
        face(k,a,b,outer[(i+1)%outer.length]);i++
      } else {
        face(k,a,b,inner[(j+1)%inner.length]);j++
      }
    }
  }
  const land = new THREE.Mesh(triangles(points,colors),new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide}))
  land.castShadow = land.receiveShadow = true
  scene.add(land)
  // Index triangles by their footprint for paths, planting and walking villagers.
  const cells = new Map<number, number[]>()
  const cellKey = (x:number,z:number) => Math.floor(x)+128*Math.floor(z)
  for(let i=0;i<points.length;i+=3) {
    const [a,b,c]=[points[i],points[i+1],points[i+2]]
    for(let x=Math.floor(Math.min(a[0],b[0],c[0]));x<=Math.max(a[0],b[0],c[0]);x++) {
      for(let z=Math.floor(Math.min(a[2],b[2],c[2]));z<=Math.max(a[2],b[2],c[2]);z++) {
        const key=cellKey(x,z)
        const list=cells.get(key)
        if(list) list.push(i)
        else cells.set(key,[i])
      }
    }
  }
  function height(x:number,z:number) {
    let highest=-.22
    for(const i of cells.get(cellKey(x,z)) ?? []) {
      const a=points[i],b=points[i+1],c=points[i+2]
      const bx=b[0]-a[0],bz=b[2]-a[2],cx=c[0]-a[0],cz=c[2]-a[2]
      const area=bx*cz-bz*cx
      if(Math.abs(area)<1e-8)continue
      const u=((x-a[0])*cz-(z-a[2])*cx)/area,v=(bx*(z-a[2])-bz*(x-a[0]))/area
      if(u>=-.0001 && v>=-.0001 && u+v<=1.0001)highest=Math.max(highest,a[1]+u*(b[1]-a[1])+v*(c[1]-a[1]))
    }
    return highest
  }

  // Narrow broken bands follow the beach and shallow shelf.
  const foam: Point[] = []
  for (const radius of [1.047,1.16,1.26]) {
    for (let i=0;i<144;i++) {
      const a = i/144*TAU
      if (Math.sin(a*7+radius*23)+Math.cos(a*11+radius*20)<-.42) continue
      const widen = radius===1.047 ? .013 : .007
      const pair = (t:number) => [coast(t,radius),coast(t,radius+widen)]
      const [a0,a1]=pair(a), [b0,b1]=pair(a+TAU/144)
      for (const p of [a0,a1,b0,b1]) p[1] = radius < 1.05 ? .068 : -.07
      foam.push(a0,b0,a1, a1,b0,b1)
    }
  }
  scene.add(new THREE.Mesh(triangles(foam),new THREE.MeshBasicMaterial({color:'#c3edda',side:THREE.DoubleSide})))
  return {height}
}

export function ocean(scene: THREE.Scene) {
  const uniforms = { uTime:{value:0.0} }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 atlas;
      void main() { vec4 p=modelMatrix*vec4(position,1.0); atlas=p.xz; gl_Position=projectionMatrix*viewMatrix*p; }
    `,
    fragmentShader: `
      varying vec2 atlas; uniform float uTime;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main() {
        vec2 p = atlas;
        float coast = 1.0-smoothstep(8.0,35.0,length(p*vec2(.77,1.0)));
        float field = .5+.5*sin(p.x*.17+p.y*.18+sin(p.y*.29)*1.2);
        vec3 water = mix(vec3(.064,.298,.333),vec3(.125,.535,.538),coast*.88+field*.12);
        vec2 uv = vec2(p.x*.62, p.y*1.55);
        uv.x += sin(uv.y*.28)*1.7;
        vec2 cell = floor(uv);
        float r = hash(cell);
        vec2 local = fract(uv)-.5;
        float dx = local.x+.12*sin(uTime*.34+r*20.0);
        float dz = local.y-.17*sin(r*27.)-.08*sin(dx*5.0);
        float ripple = (1.0-smoothstep(.035,.095,abs(dz))) * (1.0-smoothstep(.08,.37,abs(dx))) * smoothstep(.55,.94,r);
        water += vec3(.25,.34,.29)*ripple*(.6+.4*sin(uTime*.8+r*20.));
        gl_FragColor=vec4(water,1.0);
      }
    `
  })
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(260,260),mat)
  sea.rotation.x=-Math.PI/2
  sea.position.y=-.205
  scene.add(sea)
  return uniforms.uTime
}
