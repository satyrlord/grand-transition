import {expect,test,type Page} from '@playwright/test';
import {defaultSettings} from '../src/persistence/codecs/settings-codec';

async function holdGpu(page:Page,speechEnabled=true){
  await page.addInitScript(settings=>{
    localStorage.setItem('grand-transition.settings.v1',JSON.stringify(settings));
    const target=window as unknown as {finishGpu:(ready:boolean)=>void};
    class ControlledWorker extends EventTarget {
      onmessage:((event:MessageEvent)=>void)|null=null;
      onerror:null=null;
      private gpu:boolean;
      constructor(url:string|URL){
        super();this.gpu=String(url).includes('kokoro-gpu-worker');
        if(this.gpu)target.finishGpu=ready=>this.emit(ready?{type:'ready',voices:[{voiceURI:'kokoro:bm_george',name:'George',lang:'en-GB',default:true}]}:{type:'error',id:null});
        queueMicrotask(()=>this.emit({type:'booted'}));
      }
      emit(data:unknown){this.onmessage?.(new MessageEvent('message',{data}));}
      postMessage(data:{type:string}){if(data.type==='load')queueMicrotask(()=>this.emit(this.gpu?{type:'progress',loaded:40,total:100}:{type:'ready',voices:[{voiceURI:'piper:vctk-p226',name:'Piper',lang:'en-GB',default:true}]}));}
      terminate() {this.onmessage=null;}
    }
    Object.defineProperty(window,'Worker',{value:ControlledWorker,configurable:true});
    if(!('gpu' in navigator))Object.defineProperty(navigator,'gpu',{value:{},configurable:true});
  },{...defaultSettings,speechEnabled});
}

test('main-menu GPU loading gates setup, fits supported sizes, and unlocks on readiness',async({page})=>{
  await holdGpu(page);await page.goto('/grand-transition/');
  const setup=page.getByRole('button',{name:'Multiplayer'});
  const progress=page.getByRole('progressbar',{name:'GPU voices'});
  await expect(progress).toHaveAttribute('aria-valuenow','40');await expect(setup).toBeDisabled();
  await page.locator('.title-emblem').evaluate(async (image:HTMLImageElement)=>image.decode());
  await page.evaluate(()=>document.querySelector('grand-transition-title')!.dispatchEvent(new CustomEvent('show-setup',{bubbles:true,detail:{type:'show-setup',mode:'hotseat'}})));
  await expect(setup).toBeVisible();
  for(const [width,height] of [[1024,720],[1024,768],[1280,720],[1920,1080]]){
    await page.setViewportSize({width:width!,height:height!});
    const bounds=await progress.boundingBox();expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThan(height!);
    await page.screenshot({path:`.impeccable/review/title-gpu-loading-${width}x${height}.png`});
  }
  await page.setViewportSize({width:1024,height:720});await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  await expect(progress).toBeVisible();await page.screenshot({path:'.impeccable/review/title-gpu-loading-forced-colors.png'});
  await page.evaluate(()=>(window as unknown as {finishGpu:(ready:boolean)=>void}).finishGpu(true));
  await expect(progress).toHaveCount(0);await expect(setup).toBeEnabled();await setup.click();
  await expect(page.getByRole('button',{name:'Start match'})).toBeVisible();
});

test('GPU failure releases setup and presents the fallback on the menu',async({page})=>{
  await holdGpu(page);await page.goto('/grand-transition/');
  await expect(page.getByRole('button',{name:'Multiplayer'})).toBeDisabled();
  await page.evaluate(()=>(window as unknown as {finishGpu:(ready:boolean)=>void}).finishGpu(false));
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByText('GPU voices are unavailable. Using local Piper voices.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Multiplayer'})).toBeEnabled();
});

test('speech off removes the loader immediately and unlocks setup',async({page})=>{
  await holdGpu(page);await page.goto('/grand-transition/');
  await expect(page.getByRole('progressbar')).toBeVisible();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await expect(page.locator('grand-transition-settings [role="progressbar"]')).toHaveCount(0);
  await page.getByLabel('Speech enabled',{exact:true}).uncheck();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Multiplayer'})).toBeEnabled();
});

test('stored speech off opens setup without a loader',async({page})=>{
  await holdGpu(page,false);await page.goto('/grand-transition/');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Multiplayer'})).toBeEnabled();
});
