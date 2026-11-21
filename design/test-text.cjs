const sharp = require('sharp');
const fs = require('fs');
const rows = [];
for (let y=0;y<24;y++){let l='';for(let x=0;x<60;x++){l+= ' .:-=+*#%@'[(x+y)%10];}rows.push(l);}
const text = rows.join('\n');
(async()=>{
  const buf = await sharp({ text: { text: `<span font="Geist Mono 9">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>`, fontfile: 'D:/Zarva/project/REA/web/.fonts/GeistMono-5.ttf', rgba: true, dpi: 72 } })
   .png().toBuffer();
  fs.writeFileSync('design/test-text.png', buf);
  console.log('ok', buf.length);
})();
