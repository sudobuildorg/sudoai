'use client';

import { useEffect } from 'react';

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_FILES = 3;
const TEXT_EXTENSIONS = new Set(['txt','md','csv','json','js','jsx','ts','tsx','py','java','c','cpp','h','hpp','cs','go','rs','php','rb','swift','kt','sql','html','css','scss','xml','yaml','yml','toml','sh','bash','env','log']);
const ACCEPT = '.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rs,.php,.rb,.swift,.kt,.sql,.html,.css,.scss,.xml,.yaml,.yml,.toml,.sh,.bash,.env,.log,.pdf,.docx,.zip,.png,.jpg,.jpeg,.webp,.gif';

function ext(name:string){ return name.toLowerCase().split('.').pop() || ''; }
function readDataUrl(file:File){ return new Promise<string>((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result)); r.onerror=()=>reject(r.error); r.readAsDataURL(file); }); }

export default function FileAttach(){
  useEffect(()=>{
    const attach=()=>{
      const composer=document.querySelector('.composer');
      const textarea=composer?.querySelector('textarea') as HTMLTextAreaElement|null;
      const bottom=composer?.querySelector('.composeBottom') as HTMLElement|null;
      if(!composer||!textarea||!bottom||bottom.querySelector('[data-file-attach]')) return;
      const wrap=document.createElement('span');
      wrap.dataset.fileAttach='true';
      wrap.style.display='inline-flex'; wrap.style.alignItems='center'; wrap.style.gap='6px';
      const input=document.createElement('input'); input.type='file'; input.multiple=true; input.accept=ACCEPT; input.style.display='none';
      const button=document.createElement('button'); button.type='button'; button.textContent='＋ File'; button.title='Attach image, PDF, DOCX, ZIP, text or code';
      const status=document.createElement('span'); status.style.fontSize='12px'; status.style.opacity='.7'; status.style.maxWidth='180px'; status.style.overflow='hidden'; status.style.textOverflow='ellipsis'; status.style.whiteSpace='nowrap';
      button.onclick=()=>input.click();
      input.onchange=async()=>{
        const files=Array.from(input.files||[]).slice(0,MAX_FILES); const chunks:string[]=[]; const errors:string[]=[];
        let total=0;
        for(const file of files){
          if(file.size>MAX_BYTES){errors.push(`${file.name}: max 3 MB`);continue;}
          total+=file.size; if(total>MAX_BYTES*MAX_FILES){errors.push('Attachment total is too large');break;}
          const e=ext(file.name);
          try{
            if(TEXT_EXTENSIONS.has(e)||file.type.startsWith('text/')){
              const text=await file.text(); chunks.push(`\n\n--- Attached text/code file: ${file.name} ---\n${text}\n--- End ${file.name} ---`);
            }else if(file.type.startsWith('image/')){
              const data=await readDataUrl(file); chunks.push(`\n\n[[SUDOAI_IMAGE name="${file.name}" type="${file.type}" data="${data}"]]\n`);
            }else if(e==='pdf'||e==='docx'||e==='zip'){
              const data=await readDataUrl(file); chunks.push(`\n\n[[SUDOAI_FILE name="${file.name}" type="${file.type||e}" data="${data}"]]\n`);
            }else errors.push(`${file.name}: unsupported file type`);
          }catch{errors.push(`${file.name}: could not read`);}
        }
        if(chunks.length){
          const prefix=textarea.value.trim(); textarea.value=`${prefix}${chunks.join('')}`.trimStart(); textarea.dispatchEvent(new Event('input',{bubbles:true})); textarea.focus();
          status.textContent=errors.length?`${chunks.length} attached · ${errors[0]}`:`${chunks.length} file${chunks.length>1?'s':''} attached`;
        }else status.textContent=errors[0]||'No files attached';
        input.value='';
      };
      wrap.append(button,input,status); bottom.prepend(wrap);
    };
    attach();
    const observer=new MutationObserver(attach); observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
