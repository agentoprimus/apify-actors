import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync(new URL('./fixtures/', import.meta.url), { recursive: true });
const c = createCanvas(700, 160); const x = c.getContext('2d');
x.fillStyle = '#fff'; x.fillRect(0, 0, 700, 160); x.fillStyle = '#000'; x.font = 'bold 44px sans-serif'; x.fillText('ORDER 4711 PAID', 30, 95);
writeFileSync(new URL('./fixtures/text.png', import.meta.url), c.toBuffer('image/png'));
writeFileSync(new URL('./fixtures/text.jpg', import.meta.url), c.toBuffer('image/jpeg'));
writeFileSync(new URL('./fixtures/text.webp', import.meta.url), c.toBuffer('image/webp'));
console.log('ok');
