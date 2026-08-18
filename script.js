// Раскладка близка к Rust Bandit Camp: низкие множители встречаются чаще.
const sectors = [1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,3,5,5,10,20];
const values = { 1:{color:'#e6d25d',text:'#261e13'}, 3:{color:'#4e9d47',text:'#f9eed6'}, 5:{color:'#4b87ad',text:'#f7e9d1'}, 10:{color:'#a44791',text:'#fff4dc'}, 20:{color:'#bd4830',text:'#fff0d5'} };
const canvas=document.querySelector('#wheel'), ctx=canvas.getContext('2d');
const spinButton=document.querySelector('#spin-button'), dialog=document.querySelector('#result-dialog');
const resultTitle=document.querySelector('#result-title'), resultText=document.querySelector('#result-text'), resultIcon=document.querySelector('#result-icon');
const countEl=document.querySelector('#spin-count'), lastNumberEl=document.querySelector('#last-number'), balanceEl=document.querySelector('#balance');
let rotation=0, spinning=false, spins=0, balance=1000, selectedBet=1;

document.querySelector('#bet-grid').innerHTML=Object.keys(values).map(number=>`<button class="bet ${number==='1'?'selected':''}" type="button" data-number="${number}" style="--bet-color:${values[number].color}"><b>×${number}</b><span>ставка</span></button>`).join('');
document.querySelectorAll('.bet').forEach(button=>button.addEventListener('click',()=>{if(spinning)return;selectedBet=Number(button.dataset.number);document.querySelector('.bet.selected').classList.remove('selected');button.classList.add('selected');}));

function drawWheel(angle=rotation){
  const size=canvas.width,center=size/2,radius=center-9,slice=Math.PI*2/sectors.length;
  ctx.clearRect(0,0,size,size);ctx.save();ctx.translate(center,center);ctx.rotate(angle);
  sectors.forEach((number,index)=>{const start=-Math.PI/2+index*slice,item=values[number];
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,radius,start,start+slice);ctx.closePath();ctx.fillStyle=item.color;ctx.fill();ctx.strokeStyle='#312419';ctx.lineWidth=5;ctx.stroke();
    // Небольшие потертости делают сектора похожими на старую раскрашенную доску.
    ctx.save();ctx.clip();ctx.globalAlpha=.16;ctx.strokeStyle='#271b12';ctx.lineWidth=5;
    for(let line=0;line<4;line++){const y=(index*67+line*47)%radius-radius/2;ctx.beginPath();ctx.moveTo(-radius,y);ctx.lineTo(radius,y+15);ctx.stroke();}
    ctx.restore();ctx.save();ctx.rotate(start+slice/2);ctx.translate(radius*.67,0);ctx.rotate(Math.PI/2);ctx.fillStyle=item.text;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`800 ${number===20?33:number===10?30:37}px Unbounded`;ctx.shadowColor='#291b12';ctx.shadowBlur=2;ctx.fillText(number,0,0);ctx.restore();
  });
  ctx.beginPath();ctx.arc(0,0,radius*.275,0,Math.PI*2);ctx.fillStyle='#c8b998';ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#3d2d20';ctx.stroke();
  ctx.save();ctx.globalAlpha=.3;ctx.strokeStyle='#5e4936';ctx.lineWidth=5;for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(-radius*.22+i*12,-radius*.12);ctx.lineTo(radius*.2-i*8,radius*.16);ctx.stroke();}ctx.restore();
  ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fillStyle='#794c31';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle='#26170e';ctx.stroke();ctx.restore();
}
function spin(){
  if(spinning)return;spinning=true;spinButton.disabled=true;
  const winnerIndex=Math.floor(Math.random()*sectors.length),number=sectors[winnerIndex],slice=Math.PI*2/sectors.length;
  const finish=rotation+Math.PI*2*7+(-winnerIndex*slice-slice/2-rotation%(Math.PI*2)),start=rotation,duration=4800,startedAt=performance.now();
  function animate(now){const progress=Math.min((now-startedAt)/duration,1),eased=1-Math.pow(1-progress,4);rotation=start+(finish-start)*eased;drawWheel(rotation);if(progress<1)requestAnimationFrame(animate);else{rotation%=Math.PI*2;spinning=false;spinButton.disabled=false;showResult(number);}}
  requestAnimationFrame(animate);
}
function showResult(number){
  spins++;countEl.textContent=spins;lastNumberEl.textContent=`×${number}`;const won=number===selectedBet,payout=won?10*number:0;balance+=payout-10;balanceEl.textContent=balance.toLocaleString('ru-RU');resultIcon.textContent=number;resultIcon.style.background=values[number].color;resultIcon.style.color=values[number].text;resultTitle.textContent=`Выпало ×${number}`;resultText.textContent=won?`Вы угадали сектор ×${number} и получили ${payout} фишек!`:`Вы поставили на ×${selectedBet}. В этот раз выиграл сектор ×${number}.`;dialog.showModal();
}
spinButton.addEventListener('click',spin);document.querySelector('#play-again').addEventListener('click',()=>{dialog.close();spin();});drawWheel();
document.querySelector('.wallet-add').addEventListener('click',()=>{balance+=100;balanceEl.textContent=balance.toLocaleString('ru-RU');});
