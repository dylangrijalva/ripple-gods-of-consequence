import {useEffect, useRef, useState} from 'react'
import * as THREE from 'three'
import {seededRandom} from './scene/geometry'
import {makeTerrain, ocean} from './scene/terrain'
import {populate} from './scene/settlement'
import {addSky, intervention, releaseScene, type PowerName} from './scene/atmosphere'

export type WorldProps = {
  seed: number
  population: number
  effect: {power:PowerName;serial:number}|null
  menu: boolean
  onReady: () => void
}

export function World(props:WorldProps) {
  const host=useRef<HTMLDivElement>(null)
  const current=useRef(props)
  current.current=props
  const [failed,setFailed]=useState(false)

  useEffect(()=>{
    const mount=host.current
    if(!mount)return
    let renderer:THREE.WebGLRenderer
    try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'})}
    catch {setFailed(true);return}
    setFailed(false)
    mount.dataset.ready='false'
    const canvas=renderer.domElement
    canvas.setAttribute('aria-label','Three-dimensional island with a mountain village and harbor')
    canvas.style.cssText='width:100%;height:100%;display:block;touch-action:none;cursor:grab'
    mount.appendChild(canvas)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6))
    renderer.shadowMap.enabled=true
    renderer.shadowMap.type=THREE.PCFShadowMap
    renderer.setClearColor('#175a60')
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,180)
    const light=new THREE.HemisphereLight('#f2f7f0','#b7cfcc',1.88)
    scene.add(light)
    const sun=new THREE.DirectionalLight('#ffefcf',2.13)
    sun.position.set(-13,23,11); sun.castShadow=true
    Object.assign(sun.shadow.camera,{left:-16,right:16,top:15,bottom:-15,far:65,near:1})
    sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00019;sun.shadow.normalBias=.025
    scene.add(sun)
    const random=seededRandom(props.seed)
    const water=ocean(scene)
    const {height}=makeTerrain(scene,random)
    const animateVillage=populate(scene,height,random)
    const animateSky=addSky(scene)
    let yaw=.34,tilt=.62,zoom=1,dragging=false,px=0,py=0
    let width=1,h=1
    function cameraPosition() {
      const isMenu=current.current.menu, ratio=width/h
      const span = Math.max(isMenu?17.9:16.8, (isMenu && ratio>1.10 ? 38.7 : 25.7)/ratio)/zoom
      const shift = isMenu && ratio>1.10 ? -.186*span*ratio : 0
      const vertical = isMenu && ratio<=1.1 ? -span*.15 : 0
      const tx=Math.cos(yaw)*shift,tz=-Math.sin(yaw)*shift
      const center=new THREE.Vector3(tx,1.50+vertical,tz)
      camera.left=-span*ratio/2;camera.right=span*ratio/2
      camera.top=span/2;camera.bottom=-span/2
      camera.position.set(tx+Math.sin(yaw)*Math.cos(tilt)*42,center.y+Math.sin(tilt)*42,tz+Math.cos(yaw)*Math.cos(tilt)*42)
      camera.lookAt(center);camera.updateProjectionMatrix()
    }
    function resize(){
      if(!mount)return
      width=Math.max(1,mount.clientWidth);h=Math.max(1,mount.clientHeight)
      renderer.setSize(width,h,false);cameraPosition()
    }
    function down(event:PointerEvent) {
      if(current.current.menu || event.button!==0)return
      dragging=true;px=event.clientX;py=event.clientY;canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing'
    }
    function move(event:PointerEvent) {
      if(!dragging)return
      yaw-=(event.clientX-px)*.006
      tilt=THREE.MathUtils.clamp(tilt+(event.clientY-py)*.004,.35,1.18)
      px=event.clientX;py=event.clientY;cameraPosition()
    }
    function up(){dragging=false;canvas.style.cursor='grab'}
    function wheel(event:WheelEvent){
      if(current.current.menu)return
      event.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(-event.deltaY*.0011),.72,2.35);cameraPosition()
    }
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move)
    canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up)
    canvas.addEventListener('wheel',wheel,{passive:false})
    const observer=new ResizeObserver(resize);observer.observe(mount);resize()
    let frame=0,framesDrawn=0,lastMenu=current.current.menu
    let active:ReturnType<typeof intervention>|undefined, activeSerial:number|undefined,effectStart=0
    const start=performance.now()
    function paint(now:number) {
      const time=(now-start)/1000
      frame=requestAnimationFrame(paint)
      if(lastMenu!==current.current.menu) {
        lastMenu=current.current.menu;zoom=1;tilt=.62;yaw=.34;cameraPosition()
      }
      const fx=current.current.effect
      if(fx?.serial!==activeSerial){
        active?.remove();active=undefined;activeSerial=fx?.serial
        if(fx){active=intervention(scene,fx.power,random);effectStart=time}
      }
      if(active && time-effectStart>=10){active.remove();active=undefined}
      active?.frame(time-effectStart)
      animateVillage(time,current.current.population);animateSky(time);water.value=time
      renderer.render(scene,camera)
      if(++framesDrawn===2){
        if(mount)mount.dataset.ready='true'
        current.current.onReady()
      }
    }
    frame=requestAnimationFrame(paint)
    return ()=>{
      cancelAnimationFrame(frame);observer.disconnect()
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move)
      canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel)
      releaseScene(scene);sun.shadow.dispose();renderer.dispose();canvas.remove()
    }
  },[props.seed])

  return <div ref={host} className="island-world" style={{width:'100%',height:'100%',position:'relative',overflow:'hidden',background:'#175a60'}}>
    {failed && <p role="alert" style={{color:'white',padding:'2rem'}}>Enable WebGL in your browser to explore the island.</p>}
  </div>
}
