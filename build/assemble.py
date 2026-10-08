import re,sys
B="/home/claude/wtd/"
old=open(B+"web/classic.html").read().split("\n")
def blk(start_pat,end_pat,incl_end=False):
    s=next(i for i,l in enumerate(old) if re.search(start_pat,l))
    e=next(i for i,l in enumerate(old) if i>s and re.search(end_pat,l))
    return "\n".join(old[s:e+1 if incl_end else e])
hours=blk(r"^function hav\(",r"^function todayHours",True)
wheel=blk(r"^/\* -+ Surprise wheel",r"^/\* -+ Map")
mapb=blk(r"^/\* -+ Map",r"^/\* -+ Native bridge")
rest=blk(r"^/\* -+ Native bridge",r"^/\* -+ Taste profile")
# wheel: pool follows the live list (feelings, service, budget all apply)
wheel=re.sub(r"function wheelPool\(\)\{.*?\n.*?\}\n",'function wheelPool(){const size=+$("#wsize").value;const pool=visible();return{all:pool,pick:pool.slice(0,size)}}\n',wheel,count=1,flags=re.S)
assert "wmax" not in wheel
wheel=re.sub(r"function reveal\(p\)\{.*?\n  \$\(\"#again\"\)\.onclick=e=>\{e\.preventDefault\(\);spin\(\)\};\}",r'''function reveal(p){fanfare();confetti();
  $("#result").innerHTML=`<div class="result pop"><span class="eyebrow">The wheel has spoken</span>${cover(p,"small")}<h3>${esc(p.n)}</h3>
    <div class="sub">${esc(p.c)} · ${budgetTxt(p)} · ${p.d.toFixed(1)} mi · <span class="mono">${p.r.toFixed(1)}★</span></div><div>${statusHTML(p.oi||openInfo(p))}</div>${badges(p)}
    <p class="say">${esc(p.s)}</p>
    <div class="acts"><a class="btn go" href="${dirUrl(p)}" target="_blank" rel="noopener" data-dir="${p.i}">Take me there</a><button class="btn" data-open="${p.i}">Hours &amp; menu</button><button class="btn" id="again">Spin again</button></div></div>`;
  $("#again").onclick=e=>{e.preventDefault();spin()};setTimeout(()=>$("#result").scrollIntoView({behavior:reduce?"auto":"smooth",block:"center"}),150);}''',wheel,count=1,flags=re.S)
assert "Spin again</button>" in wheel
# map: popups in the new style, tapping a pin's "Details" opens the sheet
mapb=re.sub(r"function popupHtml\(p,rank\)\{.*?</div></div>`\}",r'''function popupHtml(p,rank){return `<div class="pp"><span class="eyebrow">#${rank} · ${esc(p.cats[0]||p.c.split(" · ")[0])}</span><h4>${esc(p.n)}</h4>
  <div class="sub">${budgetTxt(p)} · ${p.d.toFixed(1)} mi · <span class="mono">${p.r.toFixed(1)}★</span></div><div style="margin:4px 0">${statusHTML(p.oi||openInfo(p))}</div>
  <div class="links"><a href="${dirUrl(p)}" target="_blank" rel="noopener" data-dir="${p.i}">Directions</a><a href="#" data-detail="${p.i}">Hours &amp; menu</a></div></div>`}''',mapb,count=1,flags=re.S)
assert "Hours &amp; menu</a></div></div>`}" in mapb
mapb=re.sub(r"function goTo\(i\)\{.*",'function goTo(i){openDetail(i)}',mapb,flags=re.S)
mapb=mapb.replace('sorted(vis,"smart")','sorted(vis)')
rest=rest.replace("p.r,v:o.v||p.v,","p.r,v:o.v||p.v,takeout:o.takeout??p.takeout,dineIn:o.dineIn??p.dineIn,")
assert "takeout:o.takeout??p.takeout" in rest
rest=rest.replace("st.shown=50","st.shown=8")
core=open(B+"build/core.js").read()
core=core.replace("/*@@HOURS@@*/",hours)
core=core.replace("/* ---------- Views ---------- */",wheel+"\n"+mapb+"\n"+rest+"\n/* ---------- Views ---------- */",1)
shell=open(B+"build/shell.html").read()
assert shell.count("/*@@SCRIPT@@*/")==1
open(B+"web/index.html","w").write(shell.replace("/*@@SCRIPT@@*/",core))
open(B+"build/out.js","w").write(core)
print("ok",len(core))
