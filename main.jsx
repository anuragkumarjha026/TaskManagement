import React, {useState,useEffect,useRef,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import {Welcome,AuthMarkup,Quote,DashboardMarkup,TaskFormMarkup,AlarmPopup,Toast} from './screens.jsx';
import {DB,DEMO,read,write,id,passwordHash,demoTasks,quotes,dateKey,startAt,endAt,isLate} from './shared.jsx';

function Auth({initialMode,onHome,onSession}){
  const [mode,setModeState]=useState(initialMode),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const setMode=m=>{setModeState(m);setError('')};
  async function submit(e){
    e.preventDefault(); if(busy)return; setBusy(true);setError('');
    const data=new FormData(e.currentTarget),email=String(data.get('email')).trim().toLowerCase(),password=String(data.get('password')),name=String(data.get('name')||'').trim();
    try{const stored=read(DB,[]),accounts=Array.isArray(stored)?stored:[],existing=accounts.find(a=>a.email===email);
      if(mode==='signup'){
        if(!name)throw Error('Please enter your name.');if(existing||email===DEMO)throw Error('An account with this email already exists.');if(password.length<6)throw Error('Use at least six characters.');
        const salt=id(),hash=await passwordHash(password,salt),account={name,email,salt,hash};if(!write(DB,[...accounts,account]))throw Error('Could not save account. Enable browser storage.');onSession(account);
      }else{if(!existing||await passwordHash(password,existing.salt)!==existing.hash)throw Error('Email or password is incorrect.');onSession(existing)}
    }catch(err){setError(err.message||'Something went wrong.')}finally{setBusy(false)}
  }
  return <AuthMarkup signup={mode==='signup'} error={error} busy={busy} setMode={setMode} submit={submit} onHome={onHome} onDemo={()=>onSession({name:'Demo User',email:DEMO})}/>;
}
function TaskForm({initial,onSave,close}){
  const [task,setTask]=useState(initial),ref=useRef(document.activeElement);
  useEffect(()=>{function key(e){if(e.key==='Escape')close();if(e.key==='Tab'){const a=[...document.querySelectorAll('#task-modal button,#task-modal input,#task-modal textarea,#task-modal select')];if(e.shiftKey&&document.activeElement===a[0]){e.preventDefault();a.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===a.at(-1)){e.preventDefault();a[0]?.focus()}}}document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);ref.current?.focus()}},[close]);
  function submit(e){e.preventDefault();if(!task.title.trim())return;onSave({...task,title:task.title.trim(),description:task.description.trim(),duration:Number(task.duration),due:task.due||(task.time?dateKey():'')})}
  return <TaskFormMarkup task={task} change={(key,value)=>setTask(prev=>({...prev,[key]:value}))} submit={submit} close={close}/>;
}
function useAlarmAudio(sound){
  const ctx=useRef(null),timer=useRef(null);
  const unlock=useCallback(()=>{try{if(!ctx.current){const AC=window.AudioContext||window.webkitAudioContext;if(AC)ctx.current=new AC()}if(ctx.current?.state==='suspended')ctx.current.resume().catch(()=>{})}catch{}},[]);
  const beep=useCallback(()=>{const c=ctx.current;if(!c||c.state!=='running')return;try{[660,880,660].forEach((f,i)=>{const osc=c.createOscillator(),g=c.createGain(),at=c.currentTime+i*.22;osc.type='sine';osc.frequency.value=f;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.18,at+.025);g.gain.exponentialRampToValueAtTime(.0001,at+.19);osc.connect(g);g.connect(c.destination);osc.start(at);osc.stop(at+.2)})}catch{}},[]);
  const stop=useCallback(()=>{clearInterval(timer.current);timer.current=null},[]);
  const ring=useCallback(()=>{stop();if(!sound)return;beep();let n=0;timer.current=setInterval(()=>{if(++n>=5)stop();else beep()},1500)},[sound,beep,stop]);
  useEffect(()=>()=>{stop();ctx.current?.close().catch(()=>{})},[stop]);return {unlock,beep,stop,ring};
}
function Dashboard({user,tasks,setTasks,logout,notify,sound,setSound,audio}){
  const [view,setView]=useState('all'),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[priority,setPriority]=useState('all'),[modal,setModal]=useState(null),[alarm,setAlarm]=useState(null),[now,setNow]=useState(Date.now);
  const close=useCallback(()=>setModal(null),[]);
  const selectView=v=>{setView(v);setStatus('all')};
  const first=user.name.split(' ')[0],today=dateKey(new Date(now)),completed=tasks.filter(t=>t.status==='done').length,dueToday=tasks.filter(t=>t.due===today&&t.status!=='done').length,active=tasks.filter(t=>t.status==='inprogress').length,percent=tasks.length?Math.round(completed/tasks.length*100):0;
  const counts={all:tasks.length,today:dueToday,upcoming:tasks.filter(t=>t.due>today&&t.status!=='done').length,done:completed};
  const visible=tasks.filter(t=>(view==='all'||view==='today'&&t.due===today&&t.status!=='done'||view==='upcoming'&&t.due>today&&t.status!=='done'||view==='done'&&t.status==='done')&&(status==='all'||t.status===status)&&(priority==='all'||t.priority===priority)&&(!query||(t.title+' '+t.description).toLowerCase().includes(query.trim().toLowerCase())));
  const next=tasks.filter(t=>t.status!=='done'&&t.alarm&&(t.snoozeUntil||startAt(t))>now).sort((a,b)=>(a.snoozeUntil||startAt(a))-(b.snoozeUntil||startAt(b))),missed=tasks.filter(t=>isLate(t,now));
  const update=(key,fn)=>setTasks(prev=>prev.map(t=>t.id===key?fn(t):t));
  useEffect(()=>{const tick=()=>setNow(Date.now()),timer=setInterval(tick,1000);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick)}},[]);
  // Evaluate scheduling whenever the clock or task state changes.
  useEffect(()=>{
    if(alarm){const t=tasks.find(t=>t.id===alarm.id);if(!t||t.status==='done'){setAlarm(null);return}if(alarm.kind==='start'&&isLate(t,now)){setTasks(prev=>prev.map(x=>x.id===t.id?{...x,startNotified:true,snoozeUntil:null}:x));setAlarm(null)}return}
    if(modal)return;
    const overdue=tasks.find(t=>isLate(t,now)&&!t.missedNotified),start=tasks.find(t=>t.status!=='done'&&t.alarm&&!t.startNotified&&startAt(t)<=now&&endAt(t)>now&&(!t.snoozeUntil||t.snoozeUntil<=now));
    if(overdue)setAlarm({id:overdue.id,kind:'missed'});else if(start)setAlarm({id:start.id,kind:'start'});
  },[now,tasks,alarm,modal,setTasks]);
  const {ring,stop,unlock,beep}=audio;
  useEffect(()=>{if(alarm?.kind==='start')ring();return stop},[alarm?.id,alarm?.kind,ring,stop]);
  function openModal(t){setModal(t?{...t,time:t.time||'',duration:t.duration||30,alarm:t.alarm??true}: {id:null,title:'',description:'',status:'todo',priority:'medium',due:view==='today'?today:'',time:'',duration:30,alarm:true})}
  function saveTask(t){unlock();const old=tasks.find(x=>x.id===t.id),same=old&&old.due===t.due&&old.time===t.time&&old.duration===t.duration&&old.alarm===t.alarm;
    const item={...t,id:t.id||id(),startNotified:same?old.startNotified:false,missedNotified:same?old.missedNotified:false,snoozeUntil:same?old.snoozeUntil:null};
    setTasks(prev=>old?prev.map(x=>x.id===item.id?item:x):[item,...prev]);if(!old){setView('all');setQuery('');setStatus('all');setPriority('all')}close();setNow(Date.now());notify(old?'Task updated':'Task added');}
  function toggle(t){update(t.id,x=>({...x,status:x.status==='done'?'todo':'done'}));notify(t.status==='done'?'Task reopened':'Task completed!')}
  function remove(t){if(window.confirm('Delete this task?')){setTasks(prev=>prev.filter(x=>x.id!==t.id));notify('Task deleted')}}
  function act(action){if(!alarm)return;const {id:key,kind}=alarm;update(key,t=>{if(action==='snooze')return {...t,snoozeUntil:Date.now()+5*60000,startNotified:false};return {...t,...(kind==='missed'?{missedNotified:true}:{startNotified:true,snoozeUntil:null}),...(action==='start'?{status:'inprogress'}:action==='done'?{status:'done'}:{})}});setAlarm(null);stop();if(action!=='dismiss')notify(action==='start'?'Work started — you can do this.':action==='done'?'Task completed!':'Snoozed for 5 minutes (unless the deadline passes first).')}
  const alarmTask=alarm&&tasks.find(t=>t.id===alarm.id);
  function toggleSound(){if(!sound){unlock();setSound(true);setTimeout(beep,120)}else{setSound(false);stop()}}
  function testAlarm(){if(!sound){notify('Turn sound on first.');return}unlock();setTimeout(beep,120);notify('Alarm test — check your device volume.')}
  return <><DashboardMarkup {...{user,tasks,now,first,percent,completed,dueToday,active,counts,view,selectView,query,setQuery,status,setStatus,priority,setPriority,visible,openModal,toggle,remove,logout,next,missed,sound,toggleSound,testAlarm}}/>{modal&&<TaskForm initial={modal} onSave={saveTask} close={close}/>} {alarmTask&&!modal&&<AlarmPopup task={alarmTask} missed={alarm.kind==='missed'} act={act}/>}</>;
}
function App(){
  const [screen,setScreen]=useState('welcome'),[mode,setMode]=useState('login'),[user,setUser]=useState(null),[tasks,setTasks]=useState([]),[quote,setQuote]=useState(quotes[0]),[sound,setSound]=useState(()=>read('taskmanagement.sound',true)!==false),[message,setMessage]=useState('');
  const timer=useRef(null),audio=useAlarmAudio(sound);
  const notify=useCallback(text=>{clearTimeout(timer.current);setMessage(text);timer.current=setTimeout(()=>setMessage(''),3200)},[]);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{window.scrollTo(0,0)},[screen]);
  useEffect(()=>{if(user&&!write('taskmanagement.v1.tasks.'+user.email,tasks))notify('Browser storage unavailable. Changes may not be saved.')},[user,tasks,notify]);
  useEffect(()=>{write('taskmanagement.sound',sound)},[sound]);
  function startSession(account){const saved=read('taskmanagement.v1.tasks.'+account.email,null);setTasks(Array.isArray(saved)?saved:account.email===DEMO?demoTasks():[]);setUser(account);setQuote(quotes[Math.floor(Math.random()*quotes.length)]);setScreen('quote')}
  function openAuth(next){setMode(next);setScreen('auth')}
  function logout(){audio.stop();setUser(null);setTasks([]);openAuth('login');notify('Logged out')}
  return <>{screen==='welcome'&&<Welcome openAuth={openAuth}/>} {screen==='auth'&&<Auth initialMode={mode} onHome={()=>setScreen('welcome')} onSession={startSession}/>} {screen==='quote'&&user&&<Quote quote={quote} first={user.name.split(' ')[0]} onOpen={()=>{audio.unlock();setScreen('app')}}/>} {screen==='app'&&user&&<Dashboard {...{user,tasks,setTasks,logout,notify,sound,setSound,audio}}/>} {message&&<Toast message={message}/>}</>;
}
createRoot(document.getElementById('root')).render(<App/>);
