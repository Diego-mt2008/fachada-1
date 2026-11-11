/**
 * Dirección Nacional SENATI – recreación exterior e interior ESQUEMÁTICO.
 * Basado únicamente en dos fotografías aportadas por el usuario (2018 y otra vista).
 * NO representa planos arquitectónicos ni estructuras certificadas.
 * Las medidas están elegidas para una maqueta de demostración.
 */
import * as THREE from 'three';
import { buildCampusExterior } from './exterior-campus.js';
import {EV52_ROOMS, EV52_DOORS, EV52_ELEVATOR, EV52_STAIRWELLS, EV52_WALL_SEGMENTS, pyramidScale} from './ev52-layout.js';

const standard = (c,r=.77,met=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:met});
function box(parent,w,h,d,x,y,z,material,casts=true){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.005,w),Math.max(.005,h),Math.max(.005,d)),material);
  mesh.position.set(x,y,z);mesh.castShadow=casts;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function beam(parent,a,b,r,material){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.87,r,delta.length(),10),material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  mesh.castShadow=true;parent.add(mesh);return mesh;
}
function signTexture(signColor='#1251cb'){
  const c=document.createElement('canvas');c.width=2800;c.height=350;
  const ctx=c.getContext('2d');ctx.fillStyle=signColor;ctx.fillRect(0,0,c.width,c.height);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='white';
  ctx.font='900 260px Arial, sans-serif';ctx.fillText('SENATI',1400,174);
  ctx.font='500 43px Arial, sans-serif';ctx.fillText('DIRECCIÓN NACIONAL · MAQUETA CONCEPTUAL',1400,315);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}
function useMode({shell,envelope,roof,interior,mode='exterior',roofVisible=false}){
  for(const group of [shell,envelope]) group.traverse(o=>{if(o.isMesh&&o.userData.originalMaterial){o.material=mode==='transparente'?o.userData.ghostMaterial:o.userData.originalMaterial;}});
  shell.visible=mode!=='estructura';
  envelope.visible=mode!=='estructura';
  interior.visible=mode!=='exterior';
  // El último piso tiene cubierta modelada; la opción Mostrar/Ocultar techo controla su visibilidad.
  roof.visible=Boolean(roofVisible)&&mode!=='estructura';
}

export function buildPiramideSENATI(parent,{width=56,depth=38,levelHeight=3.8,levels=6,mode='exterior',roofVisible=false,facadeColor='#afa59b',signColor='#1251cb'}={}){
  const root=new THREE.Group();root.name='Dirección Nacional SENATI · V10: geometría a escala humana';parent.add(root);
  // V10: no estirar la escena, ya que Three.js también estira puertas, escaleras,
  // ventanales y carteles. Recalculamos las coordenadas físicas en metros.
  const {x:scaleX,z:scaleZ}=pyramidScale(width,depth);
  root.scale.set(1,1,1);
  const X=v=>v*scaleX, Z=v=>v*scaleZ;
  const rooms=EV52_ROOMS.map(r=>({...r,x0:X(r.x0),x1:X(r.x1),z0:Z(r.z0),z1:Z(r.z1)}));
  const doors=EV52_DOORS.map(d=>({...d,x:X(d.x),z:Z(d.z)}));
  const wallSegments=EV52_WALL_SEGMENTS.map(s=>({axis:s.axis,x0:X(s.x0),x1:X(s.x1),z0:Z(s.z0),z1:Z(s.z1)}));
  const stairsLayout=EV52_STAIRWELLS.map(st=>({...st,x:X(st.x),xMin:X(st.xMin),xMax:X(st.xMax),zTop:Z(st.zTop),zBottom:Z(st.zBottom)}));
  const liftLayout={...EV52_ELEVATOR,x:X(EV52_ELEVATOR.x),xMin:X(EV52_ELEVATOR.xMin),xMax:X(EV52_ELEVATOR.xMax),z:Z(EV52_ELEVATOR.z),zTop:Z(EV52_ELEVATOR.zTop),zBottom:Z(EV52_ELEVATOR.zBottom),accessZ:Z(EV52_ELEVATOR.accessZ)};
  const shell=new THREE.Group();shell.name='Fachada';root.add(shell);
  const structure=new THREE.Group();structure.name='Soportes inclinados visibles';root.add(structure);
  const envelope=new THREE.Group();envelope.name='Muros envolventes';root.add(envelope);
  const interior=new THREE.Group();interior.name='Losas esquemáticas (no verificadas)';root.add(interior);
  const roof=new THREE.Group();roof.name='Azotea';root.add(roof);
  const environment=new THREE.Group();environment.name='Acceso y entorno referencial';root.add(environment);

  const concrete=standard(facadeColor,.88),concreteLight=standard(new THREE.Color(facadeColor).lerp(new THREE.Color(0xffffff),.32),.82);
  const white=standard(0xecf0f1,.68),band=standard(0xf6f7f6,.65);
  const blue=standard(signColor,.48),deepBlue=standard(new THREE.Color(signColor).multiplyScalar(.64),.52);
  const dark=standard(0x35424c,.58,.2),metal=standard(0x576775,.38,.45);
  const glass=new THREE.MeshPhysicalMaterial({color:0x84bdd4,roughness:.16,metalness:.08,transparent:true,opacity:.63,depthWrite:false,side:THREE.DoubleSide});
  const ground=standard(0xa9b2a6,.97),paving=standard(0xd4d1c8,.9),grass=standard(0x698764,.98);
  const H=levelHeight*levels;
  const baseWidth=width,baseDepth=depth;
  const front=baseDepth/2-2.2;
  const centerX=1.15*scaleX;
  const facadeWidth=width*(27.8/34);
  const mainLeft=centerX-facadeWidth/2;
  const mainRight=centerX+facadeWidth/2;
  const towerX=mainLeft-3.3;

  // Terreno y volumen: paredes posteriores y laterales (sin asumir muros internos).
  box(envelope,facadeWidth,.48,baseDepth-2.4,centerX,-.15,0,concreteLight);
  // Acceso lateral al núcleo de la Escalera 1 (hueco en planta baja).
  box(envelope,.35,H-levelHeight,baseDepth-2.8,mainLeft,levelHeight+(H-levelHeight)/2,-.2,concrete);
  box(envelope,.35,levelHeight,7.0,mainLeft,levelHeight/2,-5.15,concrete);
  box(envelope,.35,levelHeight,5.2,mainLeft,levelHeight/2,5.20,concrete);
  box(envelope,.35,levelHeight-2.40,2.3,mainLeft,2.40+(levelHeight-2.40)/2,.9,concrete);
  box(envelope,.35,H,baseDepth-2.8,mainRight,H/2,-.2,concrete);
  box(envelope,facadeWidth,H,.28,centerX,H/2,-baseDepth/2+1.3,concreteLight);
  // Frente estriado por niveles: ventanales, parteluces y franjas horizontales.
  const bays=13;
  for(let floor=0;floor<levels;floor++){
    const base=floor*levelHeight;
    const glassY=base+1.78;
    if(floor===0){
      const doorLeft=-1.23, doorRight=1.23;
      box(shell,doorLeft-mainLeft,.70,.38,(mainLeft+doorLeft)/2,base+.50,front,concreteLight);
      box(shell,mainRight-doorRight,.70,.38,(doorRight+mainRight)/2,base+.50,front,concreteLight);
    }else box(shell,facadeWidth,.70,.38,centerX,base+.50,front,concreteLight);
    box(shell,facadeWidth,.30,.39,centerX,base+levelHeight-.25,front,band);
    for(let col=0;col<bays;col++){
      const bayW=facadeWidth/bays;
      const x=mainLeft+(col+.5)*bayW;
      if(floor>0 || Math.abs(x)>2.1) box(shell,bayW-.11,1.87,.095,x,glassY,front+.19,glass,false);
      box(shell,.055,1.97,.17,x+bayW/2-.045,glassY,front+.27,dark,false);
      box(shell,bayW-.12,.035,.14,x,glassY+.26,front+.27,dark,false);
      box(shell,bayW-.12,.025,.14,x,glassY-.35,front+.27,dark,false);
    }
    box(shell,facadeWidth,.24,.43,centerX,base+levelHeight-.66,front+.14,white);
  }
  // Volumen lateral macizo, huecos verticales y recessos azules, como en las fotos.
  box(envelope,5.3,H+.55,baseDepth-2.5,towerX,H/2+.20,-.22,concrete);
  box(shell,2.05,H*.35,.16,towerX-.15,H*.40,front+.17,deepBlue);
  for(let f=0;f<levels;f++){
    box(shell,.84,.39,.18,towerX+.15,(f+.5)*levelHeight,front+.24,dark,false);
  }
  box(envelope,4.75,1.55,2.7,towerX-1.2,H-.47,front+.65,white);
  // Contrafuertes inclinados de la fachada: elementos visibles en fotos, no cálculo estructural.
  for(const x of [mainLeft+2.0,mainLeft+facadeWidth*.30,mainLeft+facadeWidth*.62,mainRight-2.0]){
    beam(structure,[x-.65,1.0,front+1.65],[x+.40,H-.2,front+.22],.25,concreteLight);
    box(structure,.86,.42,1.35,x-.65,.22,front+1.65,concrete);
  }
  // Remate azul estrecho del frente: evita un bloque ciego sobredimensionado.
  box(envelope,1.08,H,2.65,mainRight+.76,H/2,front-1.05,blue);
  for(let f=1;f<levels;f++){
    box(shell,.095,.78,2.23,mainRight+1.37,(f+.35)*levelHeight,front-1.05,glass,false);
  }

  // V10: un mismo replanteo para los seis pisos; pasillos despejados, núcleos sin
  // tabiques que los crucen, y superficies de paso en dimensiones proporcionales.
  const slab=standard(0xb3bac0,.85),railing=standard(0x506573,.58,.26);
  const stairMat=standard(0xe4e8eb,.63),roomWall=standard(0xf2f0ea,.88);
  const boardSurface=standard(0xf8fafb,.43),deskWood=standard(0x946c4a,.77);
  const mark=standard(0x477da7,.73),elevatorMetal=standard(0x53677b,.34,.62);
  const stairGroup=new THREE.Group();stairGroup.name='Dos escaleras · comunicación vertical';interior.add(stairGroup);
  const elevatorGroup=new THREE.Group();elevatorGroup.name='Ascensor didáctico · cabina y puertas';interior.add(elevatorGroup);
  const classroomDoors=[],floorWallBoxes=Array.from({length:levels},()=>[]);
  const wallThickness=.12,wallHeight=levelHeight-.17;
  const floorBounds={left:X(-13.02*56/34),right:X(14.48*56/34),back:Z(-8.70*38/20),front:Z(8.70*38/20)};
  const holes=[...stairsLayout.map(st=>({x0:st.xMin,x1:st.xMax,z0:st.zTop,z1:st.zBottom})),
    {x0:liftLayout.xMin,x1:liftLayout.xMax,z0:liftLayout.zTop,z1:liftLayout.zBottom}];
  // Cortar las losas, sin cubrir accidentalmente los huecos del elevador y escaleras.
  function makeSlab(y,withHoles){
    const xs=[floorBounds.left,floorBounds.right,...(withHoles?holes.flatMap(h=>[h.x0,h.x1]):[])].sort((a,b)=>a-b);
    const zs=[floorBounds.back,floorBounds.front,...(withHoles?holes.flatMap(h=>[h.z0,h.z1]):[])].sort((a,b)=>a-b);
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1],cx=(x0+x1)/2,cz=(z0+z1)/2;
      if(withHoles&&holes.some(h=>cx>h.x0&&cx<h.x1&&cz>h.z0&&cz<h.z1))continue;
      if(x1-x0<.01||z1-z0<.01)continue;
      box(interior,x1-x0,.15,z1-z0,cx,y,(z0+z1)/2,slab,false);
    }
  }
  const wallX=(g,x,z0,z1,y,h=wallHeight)=>{
    if(z1-z0>.04)box(g,wallThickness,h,z1-z0,x,y+h/2,(z0+z1)/2,roomWall,false);
  };
  const wallZ=(g,z,x0,x1,y,h=wallHeight)=>{
    if(x1-x0>.04)box(g,x1-x0,h,wallThickness,(x0+x1)/2,y+h/2,z,roomWall,false);
  };
  function signCanvas(label,color='#24527a'){
    const c=document.createElement('canvas');c.width=1024;c.height=192;
    const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,c.width,c.height);
    g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='bold 79px Arial';g.fillText(label,512,96,996);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
  }
  function placeFloorLabel(g,label,x,z,w=2.7,color='#24527a',y=.06){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,.36),signCanvas(label,color));
    m.rotation.x=-Math.PI/2;m.position.set(x,y,z);g.add(m);
  }
  function addDoor(g,door,f,base){
    // Puerta de 1.40 × 2.40 m, independientemente de ancho y fondo globales.
    const pivot=new THREE.Group();pivot.position.set(door.x-.70,base,door.z);g.add(pivot);
    box(pivot,1.36,2.40,.052,.68,1.22,0,glass,false);
    box(pivot,.04,2.40,.07,1.34,1.22,0,elevatorMetal,false);
    classroomDoors.push({floor:f,id:door.id,label:door.label,
      x:door.x,z:door.z,side:'z',pivot,rotation:-Math.PI*.47,open:false,
      halfWidth:.72});
    wallZ(g,door.z,door.x-.72,door.x+.72,base+2.44,Math.max(.05,wallHeight-2.44));
  }
  for(let f=0;f<levels;f++){
    const base=f*levelHeight;
    makeSlab(base,f!==0);
    const floor=new THREE.Group();floor.name=`Planta ${f+1} · salas, pasillos, dos escaleras y ascensor`;interior.add(floor);
    for(const s of wallSegments){
      if(s.axis==='z')wallZ(floor,s.z0,s.x0,s.x1,base);
      else wallX(floor,s.x0,s.z0,s.z1,base);
      floorWallBoxes[f].push({
        x0:Math.min(s.x0,s.x1)-.11,x1:Math.max(s.x0,s.x1)+.11,
        z0:Math.min(s.z0,s.z1)-.11,z1:Math.max(s.z0,s.z1)+.11
      });
    }
    // El ascensor conserva su caja cerrada: no es atravesable caminando.
    const lf=liftLayout;
    floorWallBoxes[f].push(
      {x0:lf.xMin-.12,x1:lf.xMin+.12,z0:lf.zTop-.12,z1:lf.zBottom+.12},
      {x0:lf.xMax-.12,x1:lf.xMax+.12,z0:lf.zTop-.12,z1:lf.zBottom+.12},
      {x0:lf.xMin-.12,x1:lf.xMax+.12,z0:lf.zTop-.12,z1:lf.zTop+.12},
      {x0:lf.xMin-.12,x1:lf.xMax+.12,z0:lf.zBottom-.12,z1:lf.zBottom+.12}
    );
    for(const door of doors)addDoor(floor,door,f,base);
    for(const r of rooms){
      const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2;
      placeFloorLabel(floor,`${f+1} · ${r.label}`,cx,cz,Math.min(2.8,r.x1-r.x0-.20),'#2e5680',base+.09);
      if(r.pcs){
        box(floor,Math.min(1.60,r.x1-r.x0-.22),.80,.07,cx,base+1.69,r.z0+.18,boardSurface,false);
        box(floor,1.05,.08,.56,cx,base+.78,r.z0+.75,deskWood);
      }
    }
    // Franja continua de circulación: ~3,23 m en la escala 56 × 38.
    box(floor,X(17.9*56/34),.018,Z(1.70*38/20),X(.40*56/34),base+.088,Z(-2.36*38/20),standard(0xb4d7ce,.95),false);
    placeFloorLabel(floor,'PASADIZO · 3,2 m APROX.',0,Z(-2.36*38/20),4.60,'#246a61',base+.108);
    placeFloorLabel(floor,f===0?'VESTÍBULO CENTRAL':'VESTÍBULO · PISO '+(f+1),0,.15,4.10,'#246a61',base+.055);
    placeFloorLabel(floor,'ESCALERA A',stairsLayout[0].x,Z(2.7*38/20),2.40,'#475a70',base+.07);
    placeFloorLabel(floor,'ESCALERA B',stairsLayout[1].x,Z(2.7*38/20),2.40,'#475a70',base+.07);
    placeFloorLabel(floor,'ASCENSOR',liftLayout.x,liftLayout.accessZ+.20,1.85,'#126f7a',base+.075);
    // Letreros de llegada por nivel en el ascensor; las puertas son visuales.
    const label=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.40),signCanvas(`ASCENSOR · ${f+1}`,'#125b71'));
    label.position.set(liftLayout.x,base+2.90,liftLayout.zBottom+.08);floor.add(label);
  }
  // Las dos escaleras tienen peldaños con alturas coherentes con cada nivel.
  for(const st of stairsLayout){
    const steps=21,stepZ=(st.zBottom-st.zTop)/steps;
    for(let f=0;f<levels-1;f++)for(let i=0;i<steps;i++){
      const rise=(i+1)*levelHeight/steps,z=st.zBottom-(i+.5)*stepZ;
      box(stairGroup,st.xMax-st.xMin-.16,.13,stepZ+.02,st.x,f*levelHeight+rise-.06,z,stairMat,false);
      if(i%4===0)for(const xx of [st.xMin+.10,st.xMax-.10])
        beam(stairGroup,[xx,f*levelHeight+rise+.06,z],[xx,f*levelHeight+rise+1.03,z],.019,railing);
    }
    for(let f=0;f<levels-1;f++)for(const xx of [st.xMin+.10,st.xMax-.10])
      beam(stairGroup,[xx,f*levelHeight+1.11,st.zBottom],[xx,(f+1)*levelHeight+1.11,st.zTop],.030,railing);
  }
  // Ascensor visible en las seis plantas; el recorrido permite escoger el piso
  // desde el área de acceso mediante la tecla E. No se simula una cabina real en movimiento.
  const lift=liftLayout;
  for(const x of [lift.xMin,lift.xMax])
    box(elevatorGroup,.11,H,lift.zBottom-lift.zTop,x,H/2,(lift.zBottom+lift.zTop)/2,elevatorMetal,false);
  box(elevatorGroup,lift.xMax-lift.xMin,H,.11,lift.x,H/2,lift.zTop,elevatorMetal,false);
  for(let f=0;f<levels;f++){
    const base=f*levelHeight;
    for(const x of [lift.x-.5,lift.x+.5])
      box(elevatorGroup,.96,2.48,.07,x,base+1.28,lift.zBottom,glass,false);
    box(elevatorGroup,lift.xMax-lift.xMin,.12,.08,lift.x,base+2.57,lift.zBottom,elevatorMetal,false);
    box(elevatorGroup,.14,.38,.10,lift.xMax+.12,base+1.35,lift.zBottom+.22,blue,false);
  }
  function setClassroomDoorOpen(floor,id,opened){
    const door=classroomDoors.find(o=>o.floor===floor&&o.id===id);
    if(!door)return false;
    door.open=Boolean(opened);door.pivot.rotation.y=door.open?door.rotation:0;return true;
  }
  const staircases=stairsLayout;
  const elevator=lift;
  const corridorBounds={left:X(-8.70*56/34),right:X(8.45*56/34),back:Z(-3.15*38/20),front:Z(2.30*38/20)};

  // Azotea y cartel visibles con techo activado en vista exterior.
  box(roof,facadeWidth+6.8,.45,baseDepth-2.1,centerX-1.7,H+.15,-.1,concreteLight);
  const signY=H+2.02;
  const billboardWidth=Math.min(31,facadeWidth*.78);
  box(shell,billboardWidth,3.65,.30,centerX,signY,front+.20,blue);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(billboardWidth-.25,3.42),new THREE.MeshBasicMaterial({map:signTexture(signColor),side:THREE.DoubleSide}));
  sign.position.set(centerX,signY,front+.39);shell.add(sign);
  for(const x of [mainLeft+1,mainLeft+7,mainRight-6,mainRight-1])box(shell,.14,1.2,.17,x,H+.65,front+.17,metal);

  // Entorno reconstruido según el video y la planta 1–7.
  const campus=buildCampusExterior(environment,{width,depth,signColor});
  // Portal principal con dos hojas: la tecla E acciona este acceso en el recorrido.
  const doorRoot=new THREE.Group();doorRoot.name='Entrada principal interactiva';environment.add(doorRoot);
  const entryZ=front+.37,entryFrame=standard(0x4b626c,.38,.46);
  box(doorRoot,.08,2.58,.12,-1.24,1.29,entryZ,entryFrame);
  box(doorRoot,.08,2.58,.12,1.24,1.29,entryZ,entryFrame);
  box(doorRoot,2.55,.10,.12,0,2.55,entryZ,entryFrame);
  const leafL=new THREE.Group();leafL.position.set(-1.20,0,entryZ);doorRoot.add(leafL);
  const leafR=new THREE.Group();leafR.position.set(1.20,0,entryZ);doorRoot.add(leafR);
  box(leafL,1.15,2.37,.045,.575,1.22,0,glass,false);
  box(leafR,1.15,2.37,.045,-.575,1.22,0,glass,false);
  for(const [g,sign] of [[leafL,1],[leafR,-1]]){
    box(g,.042,2.37,.055,sign*.575,1.22,0,metal,false);
    box(g,.04,.035,.09,sign*.95,1.10,.09,metal,false);
  }
  function setDoorOpen(open){leafL.rotation.y=open?-Math.PI*.48:0;leafR.rotation.y=open?Math.PI*.48:0;}
  setDoorOpen(false);
  for(let i=0;i<6;i++){
    const x=-3.2+i*2.7;
    if(Math.abs(x)>2.75) box(environment,2.57,3.1,.12,x,1.55,front+.29,glass,false);
    box(environment,.06,3.12,.16,x+1.28,1.55,front+.37,dark,false);
  }
  // Materiales translúcidos propios de la envolvente para vista 'transparente'.
  // Se preserva el material base y así el modo exterior no pierde calidad.
  for(const layer of [shell,envelope]) layer.traverse(o=>{
    if(o.isMesh && o.material){
      if(o.position.y>H+.45)return; // El cartel SENATI permanece nítido incluso con la fachada transparente.
      o.userData.originalMaterial=o.material;
      const ghost=o.material.clone();ghost.transparent=true;ghost.opacity=.20;ghost.depthWrite=false;
      o.userData.ghostMaterial=ghost;
    }
  });
  useMode({shell,envelope,roof,interior,mode,roofVisible});
  return {root,roof,shell,envelope,interior,structure,environment,campus,
    footprint:{left:towerX-2.65,right:mainRight+1.3,back:-baseDepth/2+1.16,front},classroomDoors,setClassroomDoorOpen,
    classroomBounds:corridorBounds,scaleX,scaleZ,width,depth,
    setDoorOpen,entry:{x:0,z:entryZ,frontZ:front},stairs:staircases[1],staircases,elevator,
    firstFloorWalls:floorWallBoxes[0],floorWallBoxes,firstFloorIsEV52:true,
    walkBounds:{left:floorBounds.left,right:floorBounds.right,back:floorBounds.back},
    setMode(nextMode,nextRoof){useMode({shell,envelope,roof,interior,mode:nextMode,roofVisible:nextRoof});}};
}
