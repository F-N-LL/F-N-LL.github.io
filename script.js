import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
const canvas=document.querySelector('#scene'), scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100);camera.position.z=6;
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
const group=new THREE.Group();scene.add(group);const material=new THREE.MeshStandardMaterial({color:0xc58a3a,metalness:.85,roughness:.22,wireframe:true});
const torus=new THREE.Mesh(new THREE.TorusKnotGeometry(1.15,.035,180,12,2,3),material);group.add(torus);
const brass=new THREE.MeshStandardMaterial({color:0xc29b61,metalness:.9,roughness:.3});const ring=new THREE.Mesh(new THREE.TorusGeometry(1.65,.018,10,96),brass);group.add(ring);
const ring2=new THREE.Mesh(new THREE.TorusGeometry(2.05,.009,8,96),brass);ring2.rotation.x=.8;group.add(ring2);
const ticks=new THREE.Group();for(let i=0;i<36;i++){const a=i*Math.PI*2/36;const mark=new THREE.Mesh(new THREE.BoxGeometry(.015,i%3===0?.16:.08,.015),brass);mark.position.set(Math.cos(a)*1.65,Math.sin(a)*1.65,0);mark.rotation.z=a;ticks.add(mark)}group.add(ticks);
const nodes=[];const nodeMat=new THREE.MeshBasicMaterial({color:0xd8b65b});for(let i=0;i<18;i++){const a=i*Math.PI*2/18,r=1.1+(i%3)*.35;const n=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),nodeMat);n.position.set(Math.cos(a)*r,Math.sin(a)*r,(i%4-1.5)*.12);group.add(n);nodes.push(n)}
const routeMat=new THREE.LineBasicMaterial({color:0x9c4d35,transparent:true,opacity:.6});for(let i=0;i<8;i++){const a=i*Math.PI*2/8;const pts=[new THREE.Vector3(Math.cos(a)*.3,Math.sin(a)*.3,0),new THREE.Vector3(Math.cos(a+.7)*1.6,Math.sin(a+.7)*1.6,.2),new THREE.Vector3(Math.cos(a+1.2)*2.2,Math.sin(a+1.2)*2.2,0)];group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),routeMat))}
scene.add(new THREE.AmbientLight(0xb8a68b,.7));const light=new THREE.PointLight(0xc45b3d,18,10);light.position.set(3,2,4);scene.add(light);const light2=new THREE.PointLight(0x557b8c,10,8);light2.position.set(-3,-2,2);scene.add(light2);
function animate(){requestAnimationFrame(animate);const t=performance.now()*.001;group.rotation.x+=.001;group.rotation.y+=.002;ring.rotation.z-=.002;ring2.rotation.z+=.001;nodes.forEach((n,i)=>n.scale.setScalar(1+Math.sin(t*2+i)*.25));renderer.render(scene,camera)}animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
