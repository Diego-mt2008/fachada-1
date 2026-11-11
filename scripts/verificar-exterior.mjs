import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {buildCampusExterior,isDefaultEntrancePerson} from '../src/exterior-campus.js';
import {buildPiramideSENATI} from '../src/piramide-senati.js';
import {canCrossBuilding,insideFootprint} from '../src/exterior-navigation.js';
// Las pruebas de geometría no requieren GPU ni un navegador.
const ctx=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const campus=buildCampusExterior(new THREE.Group());
const current=buildPiramideSENATI(new THREE.Group());
for(const g of [campus.root,current.root])g.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.position.toArray().every(Number.isFinite));assert(o.scale.toArray().every(v=>v>0));}});
assert.equal(campus.route.length,7);
assert(campus.inventory.length>100);
assert.equal(campus.heightAt(0,21),0,'El acceso principal permanece en cota cero');
assert.equal(campus.heightAt(0,-25),-1.15,'La calle entre edificios queda bajo la vereda');
assert(Math.abs(campus.heightAt(-34.4,24.8)+.575)<.04,'Escalera en el extremo izquierdo');
assert(Math.abs(campus.heightAt(33,20.5)+.575)<.04,'Escalera del tramo 7');
assert.equal(campus.heightAt(-13.5,24),-1.15,'La escalera anterior ya no ocupa la calle');

function verifyWalk(campus, from, to) {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .1);
  let previous = from;
  for (let step = 1; step <= steps; step++) {
    const point = {
      x: THREE.MathUtils.lerp(from.x, to.x, step / steps),
      z: THREE.MathUtils.lerp(from.z, to.z, step / steps),
    };
    assert(campus.canWalk(previous, point, .20), `Paso exterior bloqueado en ${point.x.toFixed(2)}, ${point.z.toFixed(2)}`);
    previous = point;
  }
}

for (const [width, depth] of [[56, 38], [48, 32], [64, 44]]) {
  const site = width === 56 ? campus : buildCampusExterior(new THREE.Group(), {width, depth});
  const x = value => value * width / 56;
  const z = value => value * depth / 38;
  const road = {x:x(-17.9), z:z(24.35)};
  const landing = {x:x(-30.2), z:z(24.35)};
  const plaza = {x:x(-30.2), z:z(22.3)};
  verifyWalk(site, road, landing);
  verifyWalk(site, landing, road);
  verifyWalk(site, landing, plaza);
  verifyWalk(site, {x:x(-34.4),z:z(27)}, {x:x(-34.4),z:z(22.5)});
  verifyWalk(site, {x:0,z:z(21)}, {x:0,z:depth/2-2.1});

  // La altura de la cámara y el tablero visible deben coincidir a lo largo de la subida.
  site.root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  for (let offset = 1; offset < 10; offset++) {
    const point = {x:x(-18.8-offset), z:z(24.35)};
    ray.set(new THREE.Vector3(point.x, 3, point.z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(site.root, true)[0];
    assert(hit && Math.abs(hit.point.y - site.heightAt(point.x, point.z)) < .005,
      `La vereda tapa la rampa en ${point.x.toFixed(2)}, ${point.z.toFixed(2)}`);
  }
}
assert(isDefaultEntrancePerson({catalog_key:'man-senati',pos_x:'-1.800',pos_y:'0.000',pos_z:'22.500'},38));
assert(isDefaultEntrancePerson({catalog_key:'woman-senati',pos_x:2,pos_y:0,pos_z:22.1},38));
assert(!isDefaultEntrancePerson({catalog_key:'woman-senati',pos_x:2,pos_y:0,pos_z:14},38));
console.log('Acceso frontal OK: escalera a la izquierda, rampas transitables y tablero a la cota del recorrido.');
const fp=current.footprint,entry=current.entry;
assert(!insideFootprint(-40,-10,fp),'La plaza izquierda es exterior');
assert(!insideFootprint(0,-25,fp),'El pasaje trasero es exterior');
assert(canCrossBuilding({x:-40,z:17},{x:-40,z:16},{footprint:fp,entry,doorOpen:false}),'Rodear lateral no exige abrir puerta');
assert(!canCrossBuilding({x:0,z:17},{x:0,z:16},{footprint:fp,entry,doorOpen:false}),'Se conserva la puerta cerrada');
assert(canCrossBuilding({x:0,z:17},{x:0,z:16},{footprint:fp,entry,doorOpen:true}),'La puerta abierta permite entrar');
assert(!canCrossBuilding({x:fp.left-.1,z:0},{x:fp.left+.1,z:0},{footprint:fp,entry,doorOpen:true}),'No se atraviesa muro lateral');
assert(!canCrossBuilding({x:0,z:16},{x:0,z:17},{footprint:fp,entry,doorOpen:true,floor:1}),'En plantas altas no se sale al vacío');
// Buscar paso continuo por los puntos 1–7 y vuelta al inicio. Rejilla exterior de 25 cm.
const step=.25,minX=-55,minZ=-43,cols=477,rows=345;
const index=(x,z)=>Math.round((z-minZ)/step)*cols+Math.round((x-minX)/step);
const point=i=>({x:minX+(i%cols)*step,z:minZ+Math.floor(i/cols)*step});
const free=p=>!insideFootprint(p.x,p.z,fp)&&!campus.collisions.some(b=>p.x>b.x0-.18&&p.x<b.x1+.18&&p.z>b.z0-.18&&p.z<b.z1+.18);
const heights=new Float32Array(cols*rows),allowed=new Uint8Array(cols*rows);
for(let i=0;i<allowed.length;i++){const p=point(i);allowed[i]=free(p)?1:0;heights[i]=campus.heightAt(p.x,p.z);}
function connected(a,b){
 const start=index(a.x,a.z),goal=index(b.x,b.z);assert(allowed[start],`Punto ${a.n} no debe estar dentro de objeto`);assert(allowed[goal],`Punto ${b.n} no debe estar dentro de objeto`);
 const visited=new Uint8Array(allowed.length),q=new Int32Array(allowed.length);let h=0,t=1;q[0]=start;visited[start]=1;
 while(h<t){const i=q[h++];if(i===goal)return true;for(const d of [-1,1,-cols,cols]){const n=i+d;if(n<0||n>=allowed.length||visited[n]||!allowed[n]||Math.abs(heights[n]-heights[i])>.30)continue;if(Math.abs(point(i).x-point(n).x)>step*1.1&&Math.abs(d)===1)continue;visited[n]=1;q[t++]=n;}}
 return false;
}
for(let i=0;i<campus.route.length;i++)assert(connected(campus.route[i],campus.route[(i+1)%7]),`Debe existir paso del punto ${i+1} al ${(i+1)%7+1}`);
console.log('Exterior OK: geometría finita, cotas, puerta conservada y recorrido 1–7 continuo en ambas direcciones.');
// Comparación contra la versión previa al exterior. Sólo se usa si está disponible.
const baselineCommit='8bafe7aa9971e3964c92bd23f52bf34d2eeb436e';
let original;
try{original=execFileSync('git',['show',`${baselineCommit}:piramide-fachada/src/piramide-senati.js`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});}catch{}
if(original){
 const temp=new URL('../src/.baseline-exterior-test.mjs',import.meta.url);
 try{
  writeFileSync(temp,original);const before=(await import(temp.href)).buildPiramideSENATI(new THREE.Group());
  function digest(group){const data=[];group.traverse(o=>{if(o.isMesh)data.push({p:o.position.toArray(),r:o.quaternion.toArray(),s:o.scale.toArray(),g:o.geometry.type,vertices:Array.from(o.geometry.attributes.position.array),indices:o.geometry.index?Array.from(o.geometry.index.array):null,color:o.material.color?.getHex(),opacity:o.material.opacity});});return createHash('sha256').update(JSON.stringify(data)).digest('hex');}
  for(const name of ['shell','envelope','structure','roof','interior'])assert.equal(digest(current[name]),digest(before[name]),`${name}: geometría y materiales originales intactos`);
  assert.deepEqual(current.entry,before.entry);assert.deepEqual(current.floorWallBoxes,before.floorWallBoxes);assert.deepEqual(current.staircases,before.staircases);assert.deepEqual(current.elevator,before.elevator);
  const beforeDoor=before.environment.children.find(o=>o.name==='Entrada principal interactiva'),afterDoor=current.environment.children.find(o=>o.name==='Entrada principal interactiva');
  assert.equal(digest(beforeDoor),digest(afterDoor));
  console.log('Conservación OK: fachada del edificio, envolvente, soportes, techo, interiores, entrada, muros, escaleras y ascensor idénticos a la versión original.');
 }finally{if(existsSync(temp))unlinkSync(temp);}
}
