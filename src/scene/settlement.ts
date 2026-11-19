import * as THREE from 'three'
import {Shapes, triangles, type Point} from './geometry'

type Height = (x:number,z:number) => number
type Place = [number,number,number,number]
type MapPoint = [number,number]
const TAU = Math.PI * 2

// Each house turns toward the footpaths around the market.
const homes: Place[] = [
  [-3.65,1.55,.84,.10], [-2.48,2.05,.76,.1], [-3.05,3.80,.89,-.24],
  [-.91,.85,.95,.35], [.55,.56,.75,-.42], [.5,3.72,.86,.27],
  [2.03,3.95,.73,.1], [3.35,2.40,1.02,-.51], [4.55,1.47,.82,.26],
  [5.60,1.98,.67,-.65], [-.77,5.03,.66,-.20],
]
const paths: MapPoint[][] = [
  [[-6,2.7],[-4.7,2.7],[-2,3.08],[.3,2.48],[2.0,2.44],[3,1.34],[5.1,.7],[6.4,-.55]],
  [[-.65,5.7],[-1.58,4.3],[-1.63,3.0],[-1.89,1.46],[-1.9,.5],[-2.6,-.58]],
  [[.3,2.48],[1.55,1.38],[2,-.48],[3.02,-1.46],[4.5,-1.72]],
  [[2,2.44],[2.60,3.17],[3.10,4.14],[3.46,5.58],[3.67,6.66]],
]
function distanceToLine(x:number,z:number,p:MapPoint,q:MapPoint) {
  const dx=q[0]-p[0], dz=q[1]-p[1]
  const t=THREE.MathUtils.clamp(((x-p[0])*dx+(z-p[1])*dz)/(dx*dx+dz*dz),0,1)
  return Math.hypot(x-p[0]-t*dx,z-p[1]-t*dz)
}

function addPaths(scene: THREE.Scene,height:Height) {
  const faces: Point[] = []
  for (const path of paths) {
    for (let i=1;i<path.length;i++) {
      const [px,pz]=path[i-1], [qx,qz]=path[i]
      const dx=qx-px,dz=qz-pz,len=Math.hypot(dx,dz), n=Math.ceil(len/.22)
      const ox=dz/len*.16, oz=-dx/len*.16
      let last: Point[] = []
      for (let j=0;j<=n;j++) {
        const x=px+dx*j/n,z=pz+dz*j/n
        const edge: Point[] = [[x-ox,height(x-ox,z-oz)+.025,z-oz],[x+ox,height(x+ox,z+oz)+.025,z+oz]]
        if(last.length) faces.push(last[0],edge[0],last[1],last[1],edge[0],edge[1])
        last=edge
      }
    }
  }
  const mat = new THREE.MeshLambertMaterial({color:'#d8bf81',side:THREE.DoubleSide})
  const road=new THREE.Mesh(triangles(faces),mat)
  road.receiveShadow=true
  scene.add(road)
}

function house(s: Shapes,height:Height,[x,z,size,angle]:Place,i:number) {
  const base=height(x,z)
  const cos=Math.cos(angle), sin=Math.sin(angle)
  const pos = (dx:number,y:number,dz:number):Point => [x+size*(cos*dx+sin*dz),base+y*size,z+size*(-sin*dx+cos*dz)]
  const piece = (geo:THREE.BufferGeometry,color:string,dx:number,y:number,dz:number,a:number,b:number,c:number) => {
    s.at(geo,color,pos(dx,y,dz),[a*size,b*size,c*size],[0,angle,0])
  }
  const width=.91,depth=1.13
  piece(s.box,'#8a806b',0,.02,0,width+.04,.4,depth+.04)
  piece(s.box,['#e7cb94','#efd7a7','#ddbb86','#faf1cc'][i%4],0,.45,0,width,.85,depth)
  piece(s.roof,['#bd543c','#a8533d','#c77942','#477778','#aa523b'][i%5],0,.87,0,1.17,.64,1.36)
  for(const end of [-1,1]) {
    piece(s.roof,'#e6cc99',0,.88,.636*end,1.00,.51,.094)
    piece(s.box,'#806042',0,.95,.683*end,.045,.24,.025)
  }
  piece(s.box,'#553e35',0,1.49,0,.065,.065,1.4)
  piece(s.box,'#80654b',.26,1.32,-.30,.16,.5,.19)
  piece(s.box,'#9e8566',.26,1.56,-.30,.22,.10,.24)
  for (const dx of [-.40,.40]) piece(s.box,'#88664a',dx,.45,.575,.052,.85,.036)
  piece(s.box,'#8a6245',0,.79,.576,.86,.07,.036)
  piece(s.box,'#704d39',-.15,.28,.58,.26,.55,.055)
  piece(s.box,'#355c57',.225,.5,.584,.18,.22,.055)
  piece(s.box,'#ad8157',.225,.37,.60,.24,.045,.085)
  for (const dz of [-.30,.22]) piece(s.box,'#416460',.462,.51,dz,.025,.21,.19)
}

function tree(s:Shapes, x:number,y:number,z:number, scale:number, random:()=>number, broad:boolean) {
  const a=random()*TAU
  s.at(s.pole,'#6e6148',[x,y+.39*scale,z],[.115*scale,.88*scale,.115*scale])
  if (broad) {
    const foliage=['#87a64e','#a1b04c','#628c52','#b3ad51','#d5a44a']
    const col=foliage[Math.floor(random()*foliage.length)]
    s.at(s.crown,col,[x,y+1.0*scale,z],[.6*scale,.72*scale,.63*scale],[.10,a,0])
    s.at(s.crown,col,[x+.32*scale,y+.86*scale,z+.05*scale],[.38*scale,.51*scale,.39*scale],[.08,a+.4,.2])
  } else {
    const palette=[['#316951','#487c58','#639465'],['#365f50','#47785b','#598e67'],['#326e60','#3e806c','#53947c'],['#46704e','#5b8658','#739968']]
    const shade=palette[Math.floor(random()*palette.length)]
    for(let i=0;i<3;i++) {
      const r=(.62-i*.124)*scale
      s.at(s.pine,shade[i],[x,y+(.78+.42*i)*scale,z],[r,(1.12-.13*i)*scale,r],[0,a+i*.3,0])
    }
  }
}

function farm(s:Shapes,height:Height,cx:number,cz:number,random:()=>number) {
  const rows=6, length=2.15, width=1.64
  for(let r=0;r<rows;r++) {
    const x=cx-width/2+r*width/(rows-1)
    for(let j=0;j<11;j++) {
      const z=cz-length/2+j*length/10, y=height(x,z)
      s.at(s.box,'#966e42',[x,y+.038,z],[.29,.095,.224])
      s.at(s.box,r%2===0?'#dba847':'#bcb554',[x,y+.115,z],[.18,.18,.23])
      s.at(s.pine,'#e8bf61',[x+.015,y+.23+random()*.055,z],[.075,.22,.09])
    }
  }
  for (const side of [-1,1]) {
    const x=cx+side*(width/2+.24)
    let prev:Point|undefined
    for(let j=0;j<=3;j++) {
      const z=cz-length/2+j*length/3,y=height(x,z)
      s.at(s.box,'#a58a60',[x,y+.19,z],[.072,.42,.075])
      const p:Point=[x,y+.28,z]
      if(prev) s.beam('#b49a69',prev,p,.057)
      prev=p
    }
  }
}

function windmill(scene:THREE.Scene,s:Shapes,height:Height) {
  const x=4.6,z=-1.73,y=height(x,z)
  s.at(s.taper,'#ece0b2',[x,y+.93,z],[.55,1.87,.55])
  s.at(s.pine,'#a7543c',[x,y+2.14,z],[.65,.69,.64],[0,.27,0])
  s.at(s.box,'#695643',[x,y+.34,z+.46],[.30,.67,.12])
  const sails = new THREE.Group()
  sails.position.set(x,y+1.72,z+.48)
  const rotor=new Shapes()
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2+.32, dx=Math.cos(a), dy=Math.sin(a)
    rotor.beam('#745340',[0,0,0],[dx*1.28,dy*1.28,.015],.056)
    rotor.at(rotor.box,'#f2dcb0',[dx*.86-dy*.104,dy*.86+dx*.104,0],[.80,.22,.042],[0,0,a])
    for(let j=0;j<4;j++) {
      const d=.53+j*.19
      rotor.at(rotor.box,'#b39a75',[dx*d-dy*.10,dy*d+dx*.10,.032],[.029,.22,.018],[0,0,a])
    }
  }
  rotor.at(rotor.rock,'#74533c',[0,0,.04],[.13,.13,.09])
  rotor.build(sails)
  scene.add(sails)
  return sails
}

function dock(s:Shapes,height:Height) {
  const x=3.68,z=6.25,y=Math.max(.33,height(x,z))
  for(let j=0;j<13;j++) {
    s.at(s.box,j%3===0?'#a78154':'#b49161',[x,y,z+j*.195],[.77,.11,.18])
    for(const dx of [-.35,.35]) {
      if(j%4===0) s.at(s.pole,'#785b41',[x+dx,(y-.17)/2,z+j*.195],[.06,y+.61,.06])
    }
  }
  s.at(s.box,'#99714a',[x-.22,y+.22,z+.4],[.26,.31,.29])
  return z+2.1
}

function boat(scene:THREE.Scene,x:number,z:number,size:number,angle:number,sailColor:string) {
  const group=new THREE.Group(), s=new Shapes()
  // A keel, pointed bow and raised gunwales give each hull a readable silhouette.
  s.at(s.crown,'#724d38',[0,.06,0],[.40,.22,.83])
  s.at(s.crown,'#b38c54',[0,.16,0],[.35,.10,.71])
  for(const dx of [-.27,.27]) s.at(s.box,'#854d36',[dx,.19,0],[.07,.095,.89])
  s.at(s.pole,'#76523b',[0,.91,0],[.035,1.68,.035])
  s.at(s.sail,sailColor,[0,.39,0],[1.17,1.18,.72],[0,.2,0])
  s.at(s.sail,'#d3a45b',[-.1,.39,-.01],[-.48,.87,.45],[0,.2,0])
  s.at(s.sail,'#bd583f',[.12,1.60,0],[.31,.20,.1])
  s.build(group); group.scale.setScalar(size); group.rotation.y=angle; group.position.set(x,-.12,z)
  scene.add(group)
  return group
}

function market(s:Shapes,height:Height) {
  // The awning and bunting sit beside the fork in the harbor road.
  const x=1.16,z=3.13,y=height(x,z)
  s.at(s.box,'#97744a',[x,y+.25,z],[.78,.37,.40])
  for(const dx of [-.38,.38]) {
    for (const dz of [-.20,.20]) s.at(s.pole,'#885f42',[x+dx,y+.51,z+dz],[.026,1.02,.026])
  }
  for(let i=0;i<7;i++) {
    const dx=(i-3)*.137,tone=i%2?'#dba667':'#f1deb3'
    s.at(s.box,tone,[x+dx,y+.94,z],[.138,.055,.66],[.14,0,0])
    s.at(s.box,tone,[x+dx,y+.838,z+.312],[.138,.126,.035])
  }
  for(let i=0;i<9;i++) {
    s.at(s.rock,i%2?'#be7344':'#bac667',[x+(i%3-1)*.20,y+.46,z+(Math.floor(i/3)-1)*.11],[.095,.075,.078])
  }
  const a:Point=[-1.8,height(-1.8,2.39)+1.0,2.39], b:Point=[-.83,height(-.83,3.2)+1.15,3.2]
  for(const p of [a,b])s.beam('#947958',[p[0],height(p[0],p[2]),p[2]],p,.044)
  s.beam('#ab966f',a,b,.018)
  for(let i=1;i<8;i++) {
    const t=i/8
    s.at(s.pine,['#cd7553','#f0d69b','#799991'][i%3],[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-.085,a[2]+(b[2]-a[2])*t],[.073,.18,.045],[0,.3,Math.PI])
  }
}

export function populate(scene:THREE.Scene,height:Height,random:()=>number) {
  const s=new Shapes()
  addPaths(scene,height)
  homes.forEach((p,i)=>house(s,height,p,i))
  market(s,height)
  farm(s,height,4.9,-.25,random)
  farm(s,height,-5.52,.63,random)
  const blades=windmill(scene,s,height)
  const wharf=dock(s,height)
  const boats=[
    boat(scene,4.58,wharf,.89,.68,'#f1dfb6'),
    boat(scene,-8.3,8.3,1.14,-.8,'#e8bc83'),
    boat(scene,11.2,-1.78,.74,-.62,'#f1d9a8')
  ]
  // A lantern marks the narrow eastern approach to the harbor.
  const lx=9.45,lz=3.45
  s.at(s.rock,'#757f77',[lx,.06,lz],[1.0,.57,.82],[.15,.31,-.1])
  s.at(s.taper,'#ded6aa',[lx,1.24,lz],[.32,1.67,.32])
  s.at(s.taper,'#c16c52',[lx,1.47,lz],[.288,.33,.288])
  s.at(s.pole,'#615f50',[lx,2.1,lz],[.37,.09,.37])
  s.at(s.pole,'#efc76b',[lx,2.31,lz],[.205,.34,.205])
  for (let j=0;j<5;j++){
    const a=j*TAU/5
    s.at(s.pole,'#6b6658',[lx+Math.cos(a)*.23,2.31,lz+Math.sin(a)*.23],[.027,.37,.027])
  }
  s.at(s.pine,'#b5543d',[lx,2.62,lz],[.37,.31,.37])
  s.at(s.pole,'#65594b',[lx,2.84,lz],[.027,.20,.027])

  // A few low crops and split-rail fences wrap around the market.
  for(let j=0;j<10;j++){
    const x=-4.75+j*.45,z=4.5+.12*Math.cos(j*.57), y=height(x,z)
    if(y<.4)continue
    if (j%2===0) s.at(s.box,'#ad956c',[x,y+.17,z],[.08,.4,.08])
    if(j<9) s.beam('#b19a71',[x,y+.23,z],[x+.45,height(x+.45,z)+.23,z],.055)
  }
  const treeSites:MapPoint[]=[]
  for(let t=0;t<750;t++) {
    const x=(random()-.5)*20.5,z=(random()-.5)*15.8
    const y=height(x,z)
    if(y<.74 || y>3.05) continue
    if(homes.some(([hx,hz])=>Math.hypot(hx-x,hz-z)<1.26)) continue
    if(paths.some(path=>path.some((q,i)=>i>0 && distanceToLine(x,z,path[i-1],q)<.67))) continue
    if((Math.abs(x-4.9)<1.55 && Math.abs(z+.45)<2.35) || (Math.abs(x+5.52)<1.35 && Math.abs(z-.63)<1.62))continue
    if(treeSites.some(([px,pz])=>Math.hypot(px-x,pz-z)<.58))continue
    if(x>-4.1 && x<6 && z>-.35 && random()<.94)continue
    if(z>3 && random()<.67)continue
    treeSites.push([x,z])
    tree(s,x,y-.04,z,.58+random()*.64,random,random()<.27)
  }
  for(let j=0;j<180;j++){
    const x=(random()-.5)*23,z=(random()-.5)*18, y=height(x,z)
    if(y<.05 || y>.65 && y<2.3)continue
    const scale=.09+random()*.21
    s.at(s.rock,y>2.3?'#86958a':'#9a9b86',[x,y,z],[scale*1.6,scale,scale*.87],[random(),random()*3,.2])
  }
  for(let i=0;i<190;i++){
    const x=(random()-.5)*18,z=(random()-.5)*12.5,y=height(x,z)
    if(y<.75 || y>1.65 || homes.some(([hx,hz])=>Math.hypot(hx-x,hz-z)<.75))continue
    for(let j=0;j<3;j++) {
      const dx=(random()-.5)*.25,dz=(random()-.5)*.25
      s.at(s.pine,'#849b4d',[x+dx,y+.085,z+dz],[.045,.21,.045],[0,random(),.15])
      if(i%3===0) s.at(s.rock,i%2===0?'#f4dc86':'#efc3a1',[x+dx,y+.17,z+dz],[.043,.04,.043])
    }
  }
  s.build(scene)
  const walkers: {group:THREE.Group; path:MapPoint[]; phase:number; speed:number}[]=[]
  for(let i=0;i<18;i++){
    const figure=new THREE.Group(), body=new Shapes()
    const shirt=['#c66d44','#587e82','#ede1b7','#7d8f59','#b54c38'][i%5]
    body.at(body.taper,shirt,[0,.17,0],[.087,.21,.087])
    body.at(body.rock,'#dfaa78',[0,.345,0],[.071,.087,.068])
    if(i%3!==1){
      body.at(body.pole,'#ba935d',[0,.395,0],[.115,.023,.104])
      body.at(body.taper,'#c8a875',[0,.424,0],[.075,.076,.074])
    }else body.at(body.rock,'#664b3c',[0,.391,-.014],[.074,.049,.077])
    for(const leg of [-1,1]) body.at(body.box,'#655448',[leg*.036,.054,0],[.039,.105,.045])
    body.build(figure); scene.add(figure)
    const path=paths[i%paths.length]
    walkers.push({group:figure,path,phase:random(),speed:.009+random()*.009})
  }
  let nextWalk=0
  return (time:number,population:number)=>{
    blades.rotation.z=time*.47
    boats.forEach((b,i)=>{b.position.y=-.11+Math.sin(time*1.23+i)*.032;b.rotation.z=Math.sin(time*.84+i)*.027})
    if(time<nextWalk) return
    nextWalk=time+.075
    walkers.forEach(({group,path,phase,speed},i)=>{
      group.visible=i<population
      if(!group.visible)return
      const u=((time*speed+phase)%1)*2, p=Math.min(u,2-u)*(path.length-1)
      const j=Math.min(path.length-2,Math.floor(p)),f=p-j,a=path[j],b=path[j+1]
      const x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f
      group.position.set(x,height(x,z)+.035+Math.abs(Math.sin(time*6+i))*.023,z)
      group.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1])+(u>1?Math.PI:0)
    })
  }
}
