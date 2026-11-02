const d3=require('d3-geo'); const topo=require('topojson-client');
const world=require('world-atlas/countries-50m.json');
const land=topo.feature(world, world.objects.countries);
const W=3840,H=2160;
const proj=d3.geoMercator().fitExtent([[0,0],[W,H]],{type:'MultiPoint',coordinates:[[-14,6],[64,60]]});
const path=d3.geoPath(proj);
const out={W,H,countries:[],cities:{},nile:[]};
const bb=[-25,0,75,66];
for(const f of land.features){
  const b=d3.geoBounds(f);
  if(b[1][0]<bb[0]||b[0][0]>bb[2]||b[1][1]<bb[1]||b[0][1]>bb[3]) continue;
  const d=path(f); if(!d) continue;
  out.countries.push({id:f.id,name:f.properties.name,d:d.replace(/(\.\d)\d+/g,'$1')});
}
const cities={basra:[47.78,30.51],baghdad:[44.36,33.31],cairo:[31.24,30.04],aswan:[32.90,24.09],oxford:[-1.26,51.75],viterbo:[12.1,42.42],basel:[7.59,47.56],prague:[14.42,50.08],toledo:[-4.02,39.86],damascus:[36.29,33.51],mecca:[39.82,21.42]};
for(const k in cities) out.cities[k]=proj(cities[k]).map(v=>+v.toFixed(1));
const nile=[[31.0,31.55],[31.1,30.6],[31.24,30.04],[31.1,29.07],[30.75,28.1],[31.18,27.18],[31.7,26.56],[32.4,26.15],[32.72,26.16],[32.64,25.69],[32.55,25.29],[32.87,24.98],[32.93,24.47],[32.90,24.09],[32.88,23.97],[32.6,23.0],[31.4,21.9],[30.6,20.5],[30.3,19.5]];
out.nile=nile.map(c=>proj(c).map(v=>+v.toFixed(1)));
const tig=[[48.5,29.95],[47.78,30.51],[47.4,31.0],[46.4,31.0],[45.2,31.6],[44.36,33.31],[43.8,34.4],[43.2,36.3]];
out.tigris=tig.map(c=>proj(c).map(v=>+v.toFixed(1)));
require('fs').writeFileSync('map.json',JSON.stringify(out));
console.log(out.countries.length,'countries', JSON.stringify(out.cities));
