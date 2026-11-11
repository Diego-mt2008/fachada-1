export function insideFootprint(x, z, footprint) {
  return x>footprint.left && x<footprint.right && z>footprint.back && z<footprint.front;
}

function inDoorOpening(x, z, entry, radius) {
  const across = entry.side==='left' ? z-entry.z : x-entry.x;
  return Math.abs(across)<(entry.halfWidth??1.2)-radius;
}

function entryCrossing(from, to, footprint, entry) {
  const side = entry.side==='left';
  const axis = side?'x':'z';
  const delta = to[axis]-from[axis];
  if (Math.abs(delta)<1e-8) return null;
  const boundary = side?footprint.left:footprint.front;
  const fraction = (boundary-from[axis])/delta;
  if (fraction<0||fraction>1) return null;
  return {
    x:side?boundary:from.x+(to.x-from.x)*fraction,
    z:side?from.z+(to.z-from.z)*fraction:boundary,
  };
}

export function canCrossBuilding(from, to, {footprint, entry, doorOpen, floor=0, radius=.18}) {
  const wasInside = insideFootprint(from.x,from.z,footprint);
  const willInside = insideFootprint(to.x,to.z,footprint);
  if (floor>0) return willInside;
  if (wasInside===willInside) return true;
  if (!doorOpen) return false;
  const crossing=entryCrossing(from,to,footprint,entry);
  return crossing!==null&&inDoorOpening(crossing.x,crossing.z,entry,radius);
}

export function canWalkExterior(from, to, {footprint,entry,campus}, radius) {
  // Al salir, medir la pendiente desde el umbral, donde empieza el pavimento exterior.
  const start=insideFootprint(from.x,from.z,footprint)?entryCrossing(from,to,footprint,entry):from;
  return start!==null&&campus.canWalk(start,to,radius);
}

export function canOccupyPyramidInterior(x, z, {walkBounds, entry, doorOpen, floor=0, radius=.18}) {
  if (x>walkBounds.right-radius || z<walkBounds.back+radius) return false;
  if (x>=walkBounds.left+radius) return true;
  return floor===0 && doorOpen && entry.side==='left' && inDoorOpening(x,z,entry,radius);
}
