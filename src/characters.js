import * as T from 'three';

// KitBitz artwork is a cutout illustration, placed on upright 3D billboards.
// Alpha testing keeps the characters in the depth buffer without transparent sorting.
export function createCharacters(scene, camera) {
  const loader = new T.TextureLoader();
  const textures = new Map();
  const geometry = new T.PlaneGeometry(1, 1, 1, 5).translate(0, .5, 0);
  const actors = [];
  const shadowGeometry = new T.CircleGeometry(1, 24);
  const shadowMaterial = new T.MeshBasicMaterial({color: '#080612', transparent: true, opacity: .25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1});
  let partyUntil = 0;
  const quotes = {
    reaper: ['I am only here for the buffet.', 'My calendar is dead. Finally, a night off.', 'Relax. The scythe is for cutting the cake.'],
    ghost: ['Boo. That was my networking pitch.', 'I came for the atmosphere.', 'Anyone seen my plus one? They are also invisible.'],
    pumpkin: ['I have no body to dance with.', 'Please do not call me seasonal.', 'My costume? Business squash.'],
  };
  function add(asset, kind, x, z, height, radius = 0, phase = 0) {
    if (!textures.has(asset)) {
      const texture = loader.load('/assets/kitbitz/' + asset + '.png');
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = 4;
      textures.set(asset, texture);
    }
    const texture = textures.get(asset);
    const material = new T.MeshBasicMaterial({map: texture, alphaTest: kind === 'ghost' ? .03 : .25, transparent: kind === 'ghost', depthWrite: kind !== 'ghost', side: T.DoubleSide, color: kind === 'ghost' ? '#cad4ee' : '#e4d7c5'});
    const mesh = new T.Mesh(geometry, material);
    // Geometry animates by scaling; bound includes the entire largest pose.
    mesh.frustumCulled = false;
    mesh.userData.kind = kind;
    const shadow = new T.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    scene.add(mesh, shadow);
    const actor = {mesh, shadow, texture, x, z, height, radius, phase, kind};
    actors.push(actor);
    return actor;
  }
  add('reaper', 'reaper', -5.5, 9, 3.3, 3, .3);
  add('reaper', 'reaper', -34, 11, 3.1, 4, 2);
  add('reaper', 'reaper', 34, 18, 3.1, 2.3, 4);
  add('reaper', 'reaper', 3, 35, 3.5, 5, 1);
  [ [-7,-2], [6,4], [12,17], [-14,21], [34,9], [39,21], [-34,22], [-5,32], [22,36], [-19,37] ].forEach(([x,z],i) => add(i%2?'ghost-playful':'ghost-friendly','ghost',x,z,2.4+(i%3)*.25,1.2+(i%3),i*1.7));
  [ [-4,14], [4,14], [-10,-4], [10,-4], [-16,3], [16,3], [-30,27], [-39,27], [30,27], [42,27], [-7,29], [7,29], [-29,5], [-40,15], [15,39], [-15,39] ].forEach(([x,z],i) => add(i%2?'pumpkin':'pumpkin-glow','pumpkin',x,z,1.5+(i%3)*.2,0,i*.8));
  return {
    count: actors.length,
    meshes: actors.map(a=>a.mesh),
    startParty(t) {partyUntil=t+10;},
    quote(mesh) {
      const kind=mesh.userData.kind, pool=quotes[kind];
      return {name:kind==='reaper'?'Grim, off duty':kind==='ghost'?'A social spirit':'Pumpkin, party guest',text:pool[Math.floor(Math.random()*pool.length)]};
    },
    update(t) {
      const dancing=t<partyUntil;
      for(const a of actors) {
        const {mesh,shadow,kind,height,phase,radius}=a;
        const speed=kind==='reaper'?.14:.25;
        const angle=t*speed+phase;
        mesh.position.x=a.x+Math.sin(angle)*radius;
        mesh.position.z=a.z+Math.cos(angle)*radius*.6;
        const beat=Math.sin(t*(dancing?7:2)+phase);
        mesh.position.y=kind==='ghost'?1.1+Math.sin(t*1.5+phase)*.35:.08+Math.max(0,beat)*(dancing?.65:kind==='pumpkin'?.12:.08);
        const aspect=a.texture.image ? a.texture.image.width/a.texture.image.height : .7;
        const squash=kind==='pumpkin'?Math.sin(t*(dancing?7:2)+phase)*(dancing?.13:.035):0;
        mesh.scale.set(height*aspect*(1+squash),height*(1-squash),1);
        mesh.rotation.set(0,Math.atan2(camera.position.x-mesh.position.x,camera.position.z-mesh.position.z),Math.sin(t*(dancing?7:1.5)+phase)*(dancing?.16:.035));
        shadow.position.set(mesh.position.x,.075,mesh.position.z);
        const size=height*(kind==='ghost'?.25:.23);
        shadow.scale.set(size,size*.65,1);
      }
    },
  };
}
