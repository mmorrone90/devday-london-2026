// Ground-plane collision and pathfinding shared by players and 3D guests.
export function createNavigation(colliders) {
 const bounds={minX:-48,maxX:48,minZ:-18,maxZ:48};
 function clear(x,z,r=.55){
  if(x<bounds.minX+r||x>bounds.maxX-r||z<bounds.minZ+r||z>bounds.maxZ-r)return false;
  for(const c of colliders){if(c.type==='circle'){if(Math.hypot(x-c.x,z-c.z)<r+c.r)return false;}else{const dx=Math.max(Math.abs(x-c.x)-c.w/2,0),dz=Math.max(Math.abs(z-c.z)-c.d/2,0);if(dx*dx+dz*dz<r*r)return false;}}
  return true;
 }
 function move(pos,dx,dz,r=.55){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));for(let i=0;i<steps;i++){if(clear(pos.x+dx/steps,pos.z,r))pos.x+=dx/steps;if(clear(pos.x,pos.z+dz/steps,r))pos.z+=dz/steps;}return pos;}
 function segmentClear(a,b,r=.55){const d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(d/.15));for(let i=0;i<=n;i++)if(!clear(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,r))return false;return true;}
 function free(x,z,r=.55){if(clear(x,z,r))return {x,z};for(let distance=.7;distance<30;distance+=.7)for(let i=0;i<24;i++){const a=i/24*Math.PI*2,p={x:x+Math.cos(a)*distance,z:z+Math.sin(a)*distance};if(clear(p.x,p.z,r))return p;}return {x:0,z:14};}
 const width=97,height=67,grid=new Uint8Array(width*height);
 for(let iz=0;iz<height;iz++)for(let ix=0;ix<width;ix++)grid[iz*width+ix]=clear(ix-48,iz-18,.65)?1:0;
 function cell(p){const f=free(p.x,p.z,.8);let x=Math.round(f.x)+48,z=Math.round(f.z)+18;x=Math.max(0,Math.min(width-1,x));z=Math.max(0,Math.min(height-1,z));if(grid[z*width+x])return z*width+x;for(let r=1;r<5;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const nx=x+dx,nz=z+dz;if(nx>=0&&nx<width&&nz>=0&&nz<height&&grid[nz*width+nx])return nz*width+nx;}return -1;}
 function path(from,to){const start=cell(from),goal=cell(to);if(start<0||goal<0)return [];const prev=new Int32Array(grid.length).fill(-1),queue=new Int32Array(grid.length);let read=0,write=0;queue[write++]=start;prev[start]=start;while(read<write){const current=queue[read++];if(current===goal)break;const x=current%width,z=Math.floor(current/width);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,nz=z+dz,index=nz*width+nx;if(nx<0||nx>=width||nz<0||nz>=height||!grid[index]||prev[index]!==-1)continue;if(dx&&dz&&(!grid[z*width+nx]||!grid[nz*width+x]))continue;prev[index]=current;queue[write++]=index;}}
  if(prev[goal]===-1)return [];const route=[];for(let c=goal;c!==start;c=prev[c])route.push({x:c%width-48,z:Math.floor(c/width)-18});return route.reverse();
 }
 return {clear,move,free,path,segmentClear,colliderCount:colliders.length};
}
