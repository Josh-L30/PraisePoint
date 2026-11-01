export type WorshipBackground={id:string;kind:'image'|'video';title:string;provider:string;detail:string;source:string;preview:string};
const churchRaise='https://www.churchraise.ai',studio='https://www.churchmediastudio.com';
const stills=[
 ['floral-cross','Floral Cross','blue-gold-floral-cross-worship-slide'],
 ['barn-cross','Golden-hour Cross','barn-cross-sunrise-golden-hour-background'],
 ['sunset-cross','Cross on the Hill','sunset-cross-hilltop-painted-sky'],
 ['church-pews','Church Pews & Stained Glass','church-pews-warm-wood-stained-glass'],
 ['starry-church','Starry Night Church','starry-night-church-milky-way-bright-star'],
 ['cross-rays','Geometric Cross Rays','abstract-geometric-cross-vibrant-rays'],
 ['gold-cross','Gold Bokeh Cross','soft-gold-bokeh-cross-floral-worship-slide'],
 ['snowy-church','Snowy Steeple Church','snowy-steeple-church-winter-landscape'],
];
export const worshipBackgrounds:WorshipBackground[]=[
 ...stills.map(([id,title,file])=>({id,kind:'image' as const,title,provider:'ChurchRaise',detail:'Worship still · 1920 × 1080',source:churchRaise+'/free-resources/service-backgrounds',preview:churchRaise+'/_next/image?url='+encodeURIComponent('/images/free-resources/service-backgrounds/'+file+'.png')+'&w=640&q=75'})),
 ...['Aurora','Bokeh','Nebula','Rays','Starfield'].flatMap(design=>['Cool','Warm'].map(color=>({id:(design+'-'+color).toLowerCase(),kind:'video' as const,title:design+' · '+color,provider:'Church Media Studio',detail:'Worship loop · 15 seconds · 1920 × 1080',source:studio+'/free-worship-loops',preview:studio+'/images/media/loop-'+design.toLowerCase()+'-'+color.toLowerCase()+'.jpg'}))),
];
