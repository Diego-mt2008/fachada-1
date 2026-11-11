// Reglas compartidas para no confundir «estar detrás del frente» con estar dentro.
export function insideFootprint(x,z,f){return x>f.left&&x<f.right&&z>f.back&&z<f.front;}
export function canCrossBuilding(from,to,{footprint,entry,doorOpen,floor=0,radius=.18}){
  const wasInside=insideFootprint(from.x,from.z,footprint),willInside=insideFootprint(to.x,to.z,footprint);
  if(floor>0)return willInside;
  if(wasInside===willInside)return true;
  // La única transición exterior/interior sigue siendo la puerta existente.
  if(!doorOpen)return false;
  const dz=to.z-from.z;if(Math.abs(dz)<1e-8)return false;
  const t=(footprint.front-from.z)/dz;
  if(t<0||t>1)return false;
  const crossingX=from.x+(to.x-from.x)*t;
  return Math.abs(crossingX-entry.x)<1.2-radius;
}
