import {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowRight} from 'lucide-react';
import entranceVideo from './media/ccf-door-welcome.mp4';
import {rememberLoginEntrance} from './login-entrance-policy';

export function LoginEntrance({onComplete}: {onComplete: () => void}) {
  const [white, setWhite] = useState(false);
  const completed = useRef(false);
  const handoff = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    rememberLoginEntrance();
    onComplete();
  }, [onComplete]);
  useEffect(() => {
    const deadline = setTimeout(finish, 12000);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') finish(); };
    window.addEventListener('keydown', escape);
    return () => { clearTimeout(deadline); clearTimeout(handoff.current); window.removeEventListener('keydown', escape); };
  }, [finish]);
  function endVideo() {
    setWhite(true);
    handoff.current = setTimeout(finish, 420);
  }
  return <main className={'login-entrance' + (white ? ' is-white' : '')} aria-label="Welcome to PraisePoint">
    <h1 className="sr-only">Welcome to PraisePoint.</h1>
    <video autoPlay muted playsInline preload="auto" aria-label="AI-generated greeter opening the CCF door" onEnded={endVideo} onError={finish}
      onCanPlay={event => { void event.currentTarget.play().catch(finish); }}>
      <source src={entranceVideo} type="video/mp4" onError={finish}/>
    </video>
    <div className="entrance-white" aria-hidden="true"/>
    <button className="button entrance-skip" onClick={finish}>Skip to sign in <ArrowRight size={17} aria-hidden="true"/></button>
  </main>;
}
