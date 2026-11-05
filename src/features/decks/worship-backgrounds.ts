export type WorshipBackground = {
  id: string;
  kind: 'image' | 'video';
  title: string;
  provider: string;
  detail: string;
  source: string;
  preview: string;
};
const churchRaise = 'https://www.churchraise.ai';
const stills = [
  ['floral-cross', 'Floral Cross', 'blue-gold-floral-cross-worship-slide'],
  ['barn-cross', 'Golden-hour Cross', 'barn-cross-sunrise-golden-hour-background'],
  ['sunset-cross', 'Cross on the Hill', 'sunset-cross-hilltop-painted-sky'],
  ['church-pews', 'Church Pews & Stained Glass', 'church-pews-warm-wood-stained-glass'],
  ['starry-church', 'Starry Night Church', 'starry-night-church-milky-way-bright-star'],
  ['cross-rays', 'Geometric Cross Rays', 'abstract-geometric-cross-vibrant-rays'],
  ['gold-cross', 'Gold Bokeh Cross', 'soft-gold-bokeh-cross-floral-worship-slide'],
  ['snowy-church', 'Snowy Steeple Church', 'snowy-steeple-church-winter-landscape'],
];
export const worshipBackgrounds: WorshipBackground[] = [
  ...stills.map(([id, title, file]) => ({
    id,
    kind: 'image' as const,
    title,
    provider: 'ChurchRaise',
    detail: 'Worship still · 1920 × 1080',
    source: churchRaise + '/free-resources/service-backgrounds',
    preview:
      churchRaise +
      '/_next/image?url=' +
      encodeURIComponent('/images/free-resources/service-backgrounds/' + file + '.png') +
      '&w=640&q=75',
  })),
  {
    id: 'thermal-cross',
    kind: 'video',
    title: 'Thermal Cross',
    provider: 'Visual Revival',
    detail: 'Free worship motion · provider account may be required',
    source:
      'https://www.visualrevival.com/downloads/sermon-box-studio-free-downloads/?product_id=87544',
    preview:
      'https://cdn.visualrevival.com/87542/motion-background/public/Thermal-Motion-Background---Cross/Thermal-Motion-Background---Cross-Thumbnail.jpg',
  },
  {
    id: 'ribbon-drift',
    kind: 'video',
    title: 'Ribbon Drift',
    provider: 'Visual Revival',
    detail: 'Free worship motion · provider account may be required',
    source:
      'https://www.visualrevival.com/downloads/sermon-box-studio-free-downloads/?product_id=87546',
    preview:
      'https://cdn.visualrevival.com/87542/motion-background/public/Ribbon-Drift-Motion-Background---Orange/Ribbon-Drift-Motion-Background---Orange-Thumbnail.jpg',
  },
  {
    id: 'god-rays',
    kind: 'video',
    title: 'God Rays',
    provider: 'Visual Revival',
    detail: 'Free worship motion · provider account may be required',
    source:
      'https://www.visualrevival.com/downloads/sermon-box-studio-free-downloads/?product_id=87543',
    preview:
      'https://cdn.visualrevival.com/87542/motion-background/public/God-Rays-Motion-Background---Blue/God-Rays-Motion-Background---Blue-Thumbnail.jpg',
  },
  {
    id: 'liquid-marble',
    kind: 'video',
    title: 'Liquid Marble',
    provider: 'Visual Revival',
    detail: 'Free worship motion · provider account may be required',
    source:
      'https://www.visualrevival.com/downloads/sermon-box-studio-free-downloads/?product_id=87545',
    preview:
      'https://cdn.visualrevival.com/87542/motion-background/public/Liquid-Marble-Motion-Background---Orange/Liquid-Marble-Motion-Background---Orange-Thumbnail.jpg',
  },
  {
    id: 'bokeh-candles',
    kind: 'video',
    title: 'Bokeh Candles',
    provider: 'Visual Revival',
    detail: 'Free worship motion · provider account may be required',
    source:
      'https://www.visualrevival.com/downloads/sermon-box-studio-free-downloads/?product_id=87548',
    preview:
      'https://cdn.visualrevival.com/87542/motion-background/public/Silent-Night-Motion-Background---Bokeh-Candles-01/Silent-Night-Motion-Background---Bokeh-Candles-01-Thumbnail.jpg',
  },
  {
    id: 'risen-cross',
    kind: 'video',
    title: 'The Risen Cross',
    provider: 'Visual Revival',
    detail: 'Free worship motion · provider account may be required',
    source: 'https://www.visualrevival.com/downloads/the-risen-cross/?product_id=72401',
    preview:
      'https://cdn.visualrevival.com/72394/motion-background/public/The-Risen-Cross-Motion-Background---White-04/The-Risen-Cross-Motion-Background---White-04-Thumbnail.jpg',
  },
  {
    id: 'sacred-glass',
    kind: 'video',
    title: 'Sacred Glass',
    provider: 'Visual Revival',
    detail: 'Free worship motion · provider account may be required',
    source: 'https://www.visualrevival.com/downloads/sacred-glass/?product_id=73478',
    preview:
      'https://cdn.visualrevival.com/73468/motion-background/public/Sacred-Glass-Motion-Background-07/Sacred-Glass-Motion-Background-07-Thumbnail.jpg',
  },
  {
    id: 'particle-spin-pink',
    kind: 'video',
    title: 'Particle Spin · Pink',
    provider: 'Motion Worship',
    detail: 'Free worship loop · MP4 download on source page',
    source: 'https://www.motionworship.com/free-church-media-012521/',
    preview: 'https://www.motionworship.com/thumb/Abstract/ParticleSpinPinkSlowHD.jpg',
  },
  {
    id: 'particle-spin-blue',
    kind: 'video',
    title: 'Particle Spin · Blue',
    provider: 'Motion Worship',
    detail: 'Free worship loop · MP4 download on source page',
    source: 'https://www.motionworship.com/free-church-media-012521/',
    preview: 'https://www.motionworship.com/thumb/Abstract/ParticleSpinBlueHD.jpg',
  },
  {
    id: 'worship-hands',
    kind: 'video',
    title: 'Worship Hands',
    provider: 'Church Media Drop',
    detail: 'Lifted hands · worship footage',
    source: 'https://live.churchmediadrop.com/downloads/worship-hands/',
    preview:
      'https://d12gjiltqeago3.cloudfront.net/cmd-previews/worship-hands/thumbs/Worship_hands_loop_thumb.webp',
  },
];
