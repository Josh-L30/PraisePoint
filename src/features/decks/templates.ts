import type { Slide, SlideCategory, TextElement } from '../../domain/slide';
export const templateNames: Record<SlideCategory,string> = { lyrics: 'Lyrics', scripture: 'Scripture', sermon: 'Sermon', announcement: 'Announcement', 'welcome-closing': 'Welcome / closing' };
function text(value: string, y: number, height: number, fontSize: number, align: TextElement['align'] = 'center', color = '#FFFFFF'): TextElement {
  return { id: crypto.randomUUID(), kind: 'text', x: 96, y, width: 1728, height, z: 1, text: value, fontFamily: 'Figtree', fontSize, color, align };
}
export function createTemplate(category: SlideCategory): Slide {
  const content: Record<SlideCategory,TextElement[]> = {
    lyrics: [text('Enter your lyrics here\nOne line at a time',300,480,72)],
    scripture: [text('Enter the passage here',240,520,64,'left'),text('Reference',832,64,36,'left','#A8E6E9'),text('Translation',920,64,30,'left','#A8E6E9')],
    sermon: [text('Message title',220,180,96,'left'),text('Add your main points\nKeep each line easy to read',480,380,56,'left')],
    announcement: [text('Coming together',220,180,92),text('Event details\nDate · Time · Place',490,360,54)],
    'welcome-closing': [text('Welcome to worship',340,180,104),text('We’re glad you’re here.',600,130,48)],
  };
  return { id: crypto.randomUUID(), category, background: { kind: 'solid', color: category==='welcome-closing' ? '#006C78' : '#12343D' }, elements: content[category] };
}
