// Trợ lý AI bán hàng cho shop thời trang – bản prototype
// Luồng xử lý: send() -> think() (luật + dữ liệu shop) -> phrase() (tùy chọn: Claude diễn đạt, có kiểm tra số liệu)
const N=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
const money=n=>n.toLocaleString('vi-VN')+'đ';
const COL={trang:'trắng',be:'be',den:'đen',kem:'kem',xanh:'xanh',hong:'hồng'};
const SZ=['S','M','L','XL'];
const P=[
 {id:'ASM01',name:'Áo sơ mi linen',k:['so mi','linen'],price:390000,st:{trang:{S:3,M:5,L:2,XL:0},be:{S:0,M:4,L:6,XL:1}}},
 {id:'CV02',name:'Chân váy chữ A',k:['chan vay','chu a'],price:320000,st:{den:{S:2,M:0,L:3,XL:1},kem:{S:5,M:2,L:0,XL:0}}},
 {id:'DM03',name:'Đầm midi hoa',k:['dam','midi'],price:520000,st:{xanh:{S:1,M:3,L:4,XL:2},hong:{S:0,M:0,L:2,XL:0}}}];
const CH=[['S',150,158,42,48],['M',155,164,48,54],['L',160,168,54,60],['XL',165,172,60,68]];
const $=id=>document.getElementById(id);
let ctx={},S={n:0,ai:0,hu:0,ms:[],blocked:0},sample=null,useLLM=true;
const stock=(p,c,s)=>p.st[c]?.[s]??0;
const avail=(p,s)=>Object.keys(p.st).filter(c=>stock(p,c,s)>0).map(c=>COL[c]);
const sizesOf=(p,c)=>SZ.filter(s=>stock(p,c,s)>0);

function parse(t){
 const n=N(t),o={};
 const mh=n.match(/\b1\s*m\s*(\d{1,2})\b/),ch=n.match(/\b(1[4-9]\d)\s*cm\b/),w=n.match(/\b(\d{2,3})\s*(kg|ky|ki)\b/);
 if(mh)o.h=mh[1].length===1?100+ +mh[1]*10:100+ +mh[1];else if(ch)o.h=+ch[1];
 if(w)o.w=+w[1];
 const sz=n.match(/size\s*(xl|s|m|l)\b/)||n.match(/\b(xl)\b/);if(sz)o.s=sz[1].toUpperCase();
 const pr=P.find(p=>p.k.some(k=>n.includes(k)));if(pr)o.p=pr;
 const pool=(o.p||ctx.p)?Object.keys((o.p||ctx.p).st):Object.keys(COL);
 const c=pool.find(c=>new RegExp('\\b'+c+'\\b').test(n));if(c)o.c=c;
 return {n,o};
}
function think(text){
 const {n,o}=parse(text);const F=[],src=[];let intent='',hu=false,reason='',order=null;
 if(/hoan tien|khieu nai|lua dao|to cao|kien\b|buc minh|te qua|giao sai|sai hang|tranh chap|bi tru tien|loi thanh toan/.test(n)){
  F.push('Em rất tiếc về trải nghiệm này ạ. Em chuyển chị phụ trách hỗ trợ ngay để xử lý, chị chờ em một chút nhé.');
  return {F,src:['Quy tắc bắt buộc chuyển người: khiếu nại, hoàn tiền, tranh chấp'],intent:'Khiếu nại/hoàn tiền',hu:true,reason:'Chủ đề bắt buộc chuyển người'};}
 if(o.p){if(o.p!==ctx.p){ctx={p:o.p}}}
 if(o.s)ctx.s=o.s;if(o.c)ctx.c=o.c;
 const p=ctx.p;
 if(o.h&&o.w){
  const r=CH.find(x=>o.h<=x[2]&&o.w<=x[4]);
  if(!r||o.h<145||o.w<35){F.push('Số đo này nằm ngoài bảng size mẫu, em chuyển chị phụ trách tư vấn riêng để chọn size chuẩn cho mình ạ.');return {F,src:['Bảng size mẫu'],intent:'Tư vấn size',hu:true,reason:'Ngoài bảng size'};}
  ctx.s=r[0];intent='Tư vấn size';src.push('Bảng size: '+r[0]+' (cao '+r[1]+'–'+r[2]+' cm, nặng '+r[3]+'–'+r[4]+' kg)');
  F.push('Với chiều cao '+o.h+' cm, nặng '+o.w+' kg, em gợi ý size '+r[0]+' ạ.');
  if(p){const a=avail(p,r[0]);src.push('Kho: '+p.id+' size '+r[0]);F.push(a.length?p.name+' size '+r[0]+' hiện còn màu '+a.join(', ')+'. Chị thích màu nào ạ?':p.name+' size '+r[0]+' hiện đã hết, em báo chị phụ trách để gợi ý mẫu thay thế nhé.');}
  else F.push('Chị đang quan tâm mẫu nào (áo sơ mi linen, chân váy chữ A hay đầm midi hoa) ạ?');
  return {F,src,intent,hu,reason};}
 if(/chot|lay|mua|dat hang|order|dat\b/.test(n)&&p){
  intent='Tạo đơn nháp';
  if(!ctx.s){F.push('Chị lấy '+p.name+' size nào ạ? (S, M, L hoặc XL)');return {F,src,intent,hu,reason};}
  if(!ctx.c){F.push('Chị lấy '+p.name+' size '+ctx.s+' màu nào ạ? Hiện còn: '+avail(p,ctx.s).join(', ')+'.');src.push('Kho: '+p.id);return {F,src,intent,hu,reason};}
  const q=stock(p,ctx.c,ctx.s);src.push('Kho: '+p.id+'/'+COL[ctx.c]+'/'+ctx.s+' = '+q);
  if(q<1){const a=avail(p,ctx.s),b=sizesOf(p,ctx.c);F.push(p.name+' màu '+COL[ctx.c]+' size '+ctx.s+' hiện đã hết ạ.'+(a.length?' Size '+ctx.s+' còn màu '+a.join(', ')+'.':'')+(b.length?' Màu '+COL[ctx.c]+' còn size '+b.join(', ')+'.':''));return {F,src,intent:'Hết hàng',hu,reason};}
  order={id:'DH'+(1000+Math.floor(Math.random()*9000)),line:p.name+' / '+COL[ctx.c]+' / '+ctx.s,total:p.price};
  F.push('Em đã tạo đơn nháp '+order.id+': '+order.line+', giá '+money(p.price)+'. Chị gửi em tên, số điện thoại và địa chỉ để xác nhận đơn ạ.');src.push('Giá: '+p.id+' = '+money(p.price));
  return {F,src,intent,hu,reason,order};}
 if(/con hang|het hang|con khong|con size|con mau|ton kho|co san/.test(n)&&p){
  intent='Kiểm tra tồn kho';
  if(ctx.s&&ctx.c){const q=stock(p,ctx.c,ctx.s);src.push('Kho: '+p.id+'/'+COL[ctx.c]+'/'+ctx.s+' = '+q);F.push(q>0?p.name+' màu '+COL[ctx.c]+' size '+ctx.s+' còn '+q+' sản phẩm ạ.':p.name+' màu '+COL[ctx.c]+' size '+ctx.s+' hiện đã hết ạ.'+(sizesOf(p,ctx.c).length?' Màu này còn size '+sizesOf(p,ctx.c).join(', ')+'.':''));}
  else if(ctx.c){src.push('Kho: '+p.id+'/'+COL[ctx.c]);F.push(p.name+' màu '+COL[ctx.c]+' còn size '+(sizesOf(p,ctx.c).join(', ')||'(đã hết)')+' ạ.');}
  else{src.push('Kho: '+p.id);F.push(p.name+' hiện còn: '+Object.keys(p.st).map(c=>COL[c]+' (size '+sizesOf(p,c).join(', ')+')').join('; ')+'.');}
  return {F,src,intent,hu,reason};}
 if(/gia|bao nhieu|nhieu tien/.test(n)&&p&&!/ship|van chuyen/.test(n)){src.push('Giá: '+p.id);F.push(p.name+' giá '+money(p.price)+' ạ.');return {F,src,intent:'Hỏi giá',hu,reason};}
 if(/ship|giao|van chuyen|phi/.test(n)){src.push('Chính sách giao hàng');F.push('Giao 1–2 ngày nội thành và 3–5 ngày ngoại tỉnh. Phí ship 25.000đ nội thành, 35.000đ ngoại tỉnh, miễn phí cho đơn từ 599.000đ ạ.');return {F,src,intent:'Giao hàng',hu,reason};}
 if(/doi|tra hang|bao hanh|doi size/.test(n)){src.push('Chính sách đổi size');F.push('Shop hỗ trợ đổi size trong 7 ngày nếu sản phẩm còn tem mác ạ.');return {F,src,intent:'Đổi size',hu,reason};}
 if(/^(alo|hi|hello|chao|xin chao|shop oi|e oi)\b/.test(n)){F.push('Chào chị ạ, em là trợ lý AI của shop. Em hỗ trợ chọn size, kiểm tra tồn kho, báo giá và lên đơn; việc phức tạp em sẽ chuyển cho nhân viên. Chị cần em giúp gì ạ?');return {F,src:['Lời chào mặc định (có nhãn AI)'],intent:'Chào hỏi',hu,reason};}
 if(p&&(o.p)){src.push('Danh mục: '+p.id);F.push(p.name+' có size S, M, L, XL. Chị cho em chiều cao và cân nặng để em gợi ý size, hoặc hỏi tồn kho theo màu ạ.');return {F,src,intent:'Giới thiệu sản phẩm',hu,reason};}
 F.push('Câu này em chưa chắc chắn nên không dám trả lời sai. Em chuyển chị phụ trách để trả lời chính xác cho mình ạ.');
 return {F,src:['Không tìm thấy thông tin phù hợp trong dữ liệu của shop'],intent:'Không chắc chắn',hu:true,reason:'AI không chắc chắn'};
}
async function phrase(facts,text){
 const base=facts.join(' ');
 if(!useLLM||!sample)return {t:base,llm:false};
 const masked=text.replace(/(\+?84|0)\d{8,10}/g,'[SĐT]');
 try{
  const r=await sample([{role:'user',content:'Bạn là trợ lý AI của một shop thời trang, xưng "em", gọi khách là "chị". Viết lại thông tin trong DỮ LIỆU thành câu trả lời tự nhiên bằng tiếng Việt, tối đa 3 câu. TUYỆT ĐỐI không thêm giá, số lượng, chính sách hay sản phẩm không có trong DỮ LIỆU; giữ nguyên mọi con số. Nếu DỮ LIỆU có câu hỏi lại khách thì giữ câu hỏi đó. Chỉ trả về câu trả lời.\nTin nhắn khách: "'+masked+'"\nDỮ LIỆU: '+base}],{modelTier:'quick',cache:false});
  const out=(r.text||'').trim();const nums=out.match(/\d[\d.,]*/g)||[];
  if(!out||!nums.every(x=>base.replace(/[.,]/g,'').includes(x.replace(/[.,]/g,'')))){S.blocked++;return {t:base,llm:false,blocked:true};}
  return {t:out,llm:true};
 }catch(e){return {t:base,llm:false};}
}
function bubble(cls,tag,text){const d=document.createElement('div');d.className='m '+cls;if(tag){const s=document.createElement('span');s.className='tag';s.textContent=tag;d.appendChild(s);}d.appendChild(document.createTextNode(text));$('log').appendChild(d);$('log').scrollTop=1e9;return d;}
function stats(){
 $('t1').textContent=S.n;$('t2').textContent=S.ai;$('t3').textContent=S.hu;
 const m=[...S.ms].sort((a,b)=>a-b);$('t4').textContent=m.length?m[Math.floor(m.length/2)]+' ms':'0 ms';
 $('mode').textContent=(sample&&useLLM?'Chế độ: Claude diễn đạt câu trả lời từ dữ liệu của shop; số liệu lạ bị chặn và thay bằng câu trả lời chuẩn':'Chế độ: bộ luật nội bộ (không gọi mô hình AI ngoài)')+'. Câu trả lời bị chặn: '+S.blocked+'.';
}
function addList(id,text,first){const b=$(id);if(first&&b.firstElementChild&&b.firstElementChild.classList.contains('mut'))b.innerHTML='';const u=b.querySelector('ul')||b.appendChild(document.createElement('ul'));const l=document.createElement('li');l.textContent=text;u.prepend(l);}
async function send(text){
 text=text.trim();if(!text)return;const t0=performance.now();
 bubble('me','',text);S.n++;
 const w=bubble('ai','Trợ lý AI','…');
 const r=think(text);const ph=await phrase(r.F,text);
 w.lastChild.textContent=ph.t;
 const ms=Math.round(performance.now()-t0);S.ms.push(ms);
 if(r.hu){w.className='m hu';w.firstChild.textContent='Trợ lý AI → chuyển nhân viên';S.hu++;
  addList('inbox',new Date().toLocaleTimeString('vi-VN')+' – '+r.reason+'. Khách hỏi: “'+text.replace(/(\+?84|0)\d{8,10}/g,'[SĐT]')+'”'+(ctx.p?' (đang xem '+ctx.p.name+(ctx.s?', size '+ctx.s:'')+')':''),true);
  setTimeout(()=>bubble('hu','Nhân viên (demo)','Em đã nhận ca này kèm tóm tắt hội thoại và sẽ phản hồi chị ngay ạ.'),700);}
 else S.ai++;
 if(r.order)addList('audit','Đơn nháp '+r.order.id+': '+r.order.line+' – '+money(r.order.total)+' (chờ khách xác nhận)',true);
 $('src').innerHTML='';const u=document.createElement('ul');r.src.forEach(x=>{const l=document.createElement('li');l.textContent=x;u.appendChild(l);});
 const h=document.createElement('div');h.innerHTML='<span class="pill '+(r.hu?'hu-p':'ai-p')+'"></span> ';h.firstChild.textContent=r.hu?'Chuyển nhân viên':'AI tự xử lý';
 const meta=document.createElement('span');meta.className='mut';meta.textContent='Ý định: '+r.intent+' • '+ms+' ms • '+(ph.llm?'diễn đạt bởi Claude':ph.blocked?'câu của Claude bị chặn (số liệu lạ), dùng câu chuẩn':'câu trả lời chuẩn');
 h.appendChild(meta);$('src').appendChild(h);$('src').appendChild(u);
 addList('audit',(r.hu?'[NGƯỜI] ':'[AI] ')+r.intent+' – '+ms+' ms – nguồn: '+(r.src[0]||'–'),true);
 stats();
}
function renderCat(){
 let h='<tr><th>Mã</th><th>Sản phẩm</th><th>Giá</th><th>Tồn theo màu (S/M/L/XL)</th></tr>';
 P.forEach(p=>{h+='<tr><td>'+p.id+'</td><td>'+p.name+'</td><td>'+money(p.price)+'</td><td>'+Object.keys(p.st).map(c=>COL[c]+': '+SZ.map(s=>p.st[c][s]).join('/')).join('<br>')+'</td></tr>';});
 $('cat').innerHTML=h;
}
const Q=['Mình cao 1m60 nặng 52kg, áo sơ mi linen mặc size nào?','Áo sơ mi linen màu be size M còn không?','Chốt cho mình áo sơ mi linen trắng size L','Phí ship về Đà Nẵng bao nhiêu?','Mình muốn hoàn tiền, shop giao sai màu!','Shop có áo khoác không?'];
Q.forEach(q=>{const b=document.createElement('button');b.type='button';b.textContent=q;b.onclick=()=>send(q);$('chips').appendChild(b);});
$('f').onsubmit=e=>{e.preventDefault();const v=$('q').value;$('q').value='';send(v);};
renderCat();bubble('ai','Trợ lý AI','Chào chị ạ, em là trợ lý AI của shop. Chị cần chọn size, kiểm tra hàng hay báo giá, em hỗ trợ ngay; việc phức tạp em sẽ chuyển cho nhân viên ạ.');stats();
(async()=>{try{sample=await window.claude?.use?.('sample')||null;}catch(e){sample=null;}stats();})();
