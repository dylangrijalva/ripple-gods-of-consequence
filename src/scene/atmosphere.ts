import * as THREE from 'three'
import {Shapes, triangles, type Point} from './geometry'

export type PowerName = 'rain'|'sun'|'bloom'|'storm'

function cloudPuffs(tones:string[], scale:number) {
  const g=new THREE.Group(), pieces=new Shapes()
  for(const [i,[x,y,z,r]] of [
    [-1.0,.0,.0,.65],[-.50,.29,.08,.75],[.18,.48,.0,.87],[.84,.18,.05,.67],[.26,.02,.33,.69]
  ].entries()) pieces.at(pieces.crown,tones[i%tones.length],[x,y,z],[r,r*.79,r*.77],[.16,i*.63,.02])
  pieces.build(g); g.scale.setScalar(scale)
  return g
}

export function addSky(scene:THREE.Scene) {
  const birds:THREE.Group[]=[]
  const wings = triangles([
    [0,0,0],[-.25,.20,0],[-.43,.16,.02], [0,0,0],[-.25,.20,0],[-.12,.09,.12],
    [0,0,0],[.25,.22,0],[.43,.16,.02], [0,0,0],[.25,.22,0],[.12,.09,.12]
  ])
  const feather=new THREE.MeshLambertMaterial({color:'#fff4d6',side:THREE.DoubleSide})
  for(let j=0;j<7;j++) {
    const bird=new THREE.Group()
    bird.add(new THREE.Mesh(wings,feather))
    bird.scale.setScalar(.76+j%3*.14)
    scene.add(bird);birds.push(bird)
  }
  const clouds=[[-13,4.1,-6,.86],[5,6.5,-9,.82],[14,4,-5,.75],[-10,2.4,11,.6]].map(([x,y,z,sc])=>{
    const g=cloudPuffs(['#d9eadf','#edf0da','#e6ecda'],sc)
    g.position.set(x,y,z);scene.add(g)
    return {g,x}
  })
  return (time:number)=>{
    clouds.forEach(({g,x},i)=>g.position.x=x+Math.sin(time*.054+i)*.8)
    birds.forEach((b,i)=>{
      const a=time*.13+i*.37, k=i<4?0:1
      b.position.set((k?4.5:-4)+Math.cos(a)*(2.4+.2*i), (k?2.9:4.25)+Math.sin(time*.7+i)*.14+i*.11, (k?5:-3)+Math.sin(a)*1.5)
      b.rotation.set(Math.sin(time*2.7+i)*.14,-a-.8,Math.sin(time*1.8+i)*.08)
    })
  }
}

export function releaseScene(root:THREE.Object3D) {
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>()
  root.traverse(obj=>{
    if(obj instanceof THREE.InstancedMesh)obj.dispose()
    if(obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points){
      geometries.add(obj.geometry)
      const mats=Array.isArray(obj.material)?obj.material:[obj.material]
      mats.forEach((m:THREE.Material)=>materials.add(m))
    }
  })
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())
}

export function intervention(scene:THREE.Scene, power:PowerName, random:()=>number) {
  const root=new THREE.Group()
  scene.add(root)
  root.position.set(.5,0,1.0)
  const animations:((t:number)=>void)[]=[]
  if(power==='rain'||power==='storm') {
    const dark=power==='storm'
    const tones=dark?['#566b79','#667d87','#889795']:['#a2c8d0','#bfd9d7','#accdd0']
    for (const [x,y,z,sc] of [[-1.2,5.7,.4,1.47],[1.17,5.64,.06,1.28],[.49,6,-.7,1.1]]){
      const cloud=cloudPuffs(tones,sc);cloud.position.set(x,y,z);root.add(cloud)
    }
    const count=210,positions=new Float32Array(count*6)
    const drops=Array.from({length:count},()=>({x:(random()-.5)*5.3,z:(random()-.5)*2.8,f:random(),d:.14+random()*.17}))
    const geo=new THREE.BufferGeometry()
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage))
    const rain=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:dark?'#b4d3ed':'#b7e9ed',transparent:true,opacity:.76}))
    rain.frustumCulled=false; root.add(rain)
    animations.push(t=>{
      drops.forEach(({x,z,f,d},i)=>{
        const n=(f+t*.67)%1,y=5.45-n*4.5,j=i*6
        positions[j]=x-n*.46;positions[j+1]=y;positions[j+2]=z
        positions[j+3]=x-n*.46-.036;positions[j+4]=y-d;positions[j+5]=z
      })
      geo.attributes.position.needsUpdate=true
    })
    if(dark){
      const bolts=new Shapes()
      const joints:Point[]=[[.28,5.53,.91],[-.32,4.17,.95],[.09,4.29,.95],[-.62,2.18,.96]]
      for(let i=1;i<joints.length;i++)bolts.beam('#fff5bb',joints[i-1],joints[i],.085)
      const bolt=new THREE.Group();bolts.build(bolt);root.add(bolt)
      animations.push(t=>{bolt.visible=t%1.7<.40})
    }
  } else if(power==='bloom'){
    const petals=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.07),new THREE.MeshBasicMaterial({color:'#ffffff'}),160)
    const spores=Array.from({length:160},(_,i)=>{
      petals.setColorAt(i,new THREE.Color(['#ffd5bc','#ec8e9e','#f4d17a','#a8e877'][i%4]))
      return {phase:random(),x:(random()-.5)*6,z:(random()-.5)*3}
    })
    const temp=new THREE.Object3D()
    root.add(petals)
    animations.push(t=>{spores.forEach(({phase,x,z},i)=>{
      const v=(phase+t*.20)%1
      temp.position.set(x+Math.sin(v*6+i)*.34,1.3+v*3.5,z)
      temp.rotation.set(v*6,i+v*4,0);temp.scale.set(.72,1.45,.65);temp.updateMatrix()
      petals.setMatrixAt(i,temp.matrix)
    });petals.instanceMatrix.needsUpdate=true;petals.frustumCulled=false})
  } else {
    const halo=new THREE.Mesh(new THREE.IcosahedronGeometry(.73,1),new THREE.MeshBasicMaterial({color:'#ffe2a2'}))
    halo.position.set(0,6.65,0);root.add(halo)
    for(let i=0;i<11;i++){
      const a=i/11*Math.PI*2
      const ray=new THREE.Mesh(new THREE.ConeGeometry(.105,.39,4),new THREE.MeshBasicMaterial({color:'#f6c765'}))
      ray.position.set(Math.cos(a)*1.04,6.65+Math.sin(a)*1.04,0);ray.rotation.z=a-Math.PI/2;root.add(ray)
    }
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.12,2.45,5.2,32,1,true), new THREE.MeshBasicMaterial({color:'#ffe991',transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide}))
    beam.position.y=3.9;root.add(beam)
    animations.push(t=>{beam.material.opacity=.15+Math.sin(t*2)*.045})
  }
  return {
    frame:(time:number)=>animations.forEach(fn=>fn(time)),
    remove:()=>{root.removeFromParent();releaseScene(root)}
  }
}
