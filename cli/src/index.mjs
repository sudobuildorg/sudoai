#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFile, writeFile, readdir, mkdir, chmod } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { homedir } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const API_URL = (process.env.SUDOAI_API_URL || 'https://sudoai.vercel.app').replace(/\/$/, '');
const CONFIG_DIR = join(homedir(), '.sudoai');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const MODEL = process.env.SUDOAI_MODEL || '';
const cwd = process.cwd();
let apiKey = process.env.SUDOAI_API_KEY || '';

async function loadConfig(){try{const data=JSON.parse(await readFile(CONFIG_FILE,'utf8'));if(!apiKey&&typeof data.apiKey==='string')apiKey=data.apiKey;return data}catch{return {}}}
async function saveConfig(data){await mkdir(CONFIG_DIR,{recursive:true});await writeFile(CONFIG_FILE,JSON.stringify(data,null,2),'utf8');try{await chmod(CONFIG_FILE,0o600)}catch{}}

function welcome(){console.log(`\n  ╭──────────────────────────────────────────────╮
  │                                              │
  │                    SUDOAI                    │
  │             AI coding agent for CLI          │
  │                                              │
  ╰──────────────────────────────────────────────╯

  ${cwd}

  SudoAI can inspect your project, edit files, run commands,
  and help you ship code. Changes and commands require approval.

  Try:
    › fix the authentication bug
    › explain this project
    › run the tests and fix failures
    › review my git diff

  Commands:
    /help       Show help
    /clear      Start a fresh conversation
    /exit       Exit SudoAI

  ${apiKey?'✓ Account API key configured':'⚠ No API key — run sudoai login'}
  Model: ${MODEL || 'SudoAI automatic model'}
`)}

function usage(){console.log(`\nSudoAI — AI coding agent\n\nUsage:\n  sudoai                    Start interactive mode\n  sudoai "your request"     Run one request\n  sudoai login              Add your Profile CLI API key\n  sudoai logout             Remove the local API key\n  sudoai --help             Show help\n\nConfiguration:\n  SUDOAI_API_URL           SudoAI server URL\n  SUDOAI_API_KEY           Optional environment override\n  SUDOAI_MODEL             Optional model id\n\nGet your key from SudoAI → Profile → SudoAI CLI access.\n`)}
function safePath(path){const target=resolve(cwd,path);if(target!==cwd&&!target.startsWith(cwd+'/'))throw new Error('Path is outside the current workspace.');return target}
async function toolReadFile(path){return readFile(safePath(path),'utf8')}
async function toolList(path='.'){const target=safePath(path);const entries=await readdir(target,{withFileTypes:true});return entries.map(e=>`${e.isDirectory()?'dir ':'file'} ${relative(cwd,join(target,e.name))}`).join('\n')}
async function toolWriteFile(path,content){const target=safePath(path);const answer=await askConfirmation('write this file',`${relative(cwd,target)}\n\n${content.slice(0,12000)}${content.length>12000?'\n…(truncated preview)':''}`);if(!answer)return'User denied file write.';await writeFile(target,content,'utf8');return`Wrote ${relative(cwd,target)}.`}
async function toolRun(command){const answer=await execAsync(command,{cwd,maxBuffer:1024*1024*4});return[answer.stdout,answer.stderr].filter(Boolean).join('\n').slice(0,30000)}
async function requestSudoAI(messages){const headers={'Content-Type':'application/json'};if(apiKey)headers.Authorization=`Bearer ${apiKey}`;const response=await fetch(`${API_URL}/api/chat`,{method:'POST',headers,body:JSON.stringify({messages,...(MODEL?{model:MODEL}:{})})});const raw=await response.text();let data=null;try{data=raw?JSON.parse(raw):null}catch{}if(!response.ok)throw new Error(data?.error||raw||`SudoAI request failed (${response.status})`);if(!data?.message)throw new Error('SudoAI returned an empty response.');return data}
async function askConfirmation(action,detail){const rl=createInterface({input,output});const answer=await rl.question(`\n⚠ SudoAI wants to ${action}:\n\n${detail}\n\nAllow? [y/N] `);rl.close();return/^y(es)?$/i.test(answer.trim())}
function systemPrompt(){return`You are SudoAI Code, a terminal coding assistant. Workspace: ${cwd}. Use exactly one local tool request when needed:\nTOOL:read_file <path>\nTOOL:list <path>\nTOOL:write_file <path>\n<complete file content>\nTOOL_END\nTOOL:run <shell command>\nNever claim a file changed unless write_file actually ran. Never use paths outside the workspace. Mutating file writes and shell commands require user confirmation from the CLI. Keep tool requests concise.`}
async function runAgent(prompt){const messages=[{role:'system',content:systemPrompt()},{role:'user',content:prompt}];for(let turn=0;turn<8;turn++){const data=await requestSudoAI(messages);const text=data.message;const write=text.match(/^TOOL:write_file\s+([^\n]+)\n([\s\S]*?)\nTOOL_END/m);const simple=text.match(/^TOOL:(read_file|list|run)\s+([^\n]+)$/m);let name,arg,result;if(write){name='write_file';arg=write[1].trim();result=await toolWriteFile(arg,write[2])}else if(simple){name=simple[1];arg=simple[2].trim();try{if(name==='read_file')result=await toolReadFile(arg);else if(name==='list')result=await toolList(arg);else{const allowed=await askConfirmation('run this command',arg);result=allowed?await toolRun(arg):'User denied command execution.'}}catch(error){result=`Tool error: ${error instanceof Error?error.message:String(error)}`}}else return data;messages.push({role:'assistant',content:text});messages.push({role:'user',content:`TOOL RESULT (${name}):\n${result}`})}return{message:'I reached the maximum tool steps for this request.'}}

async function login(){const rl=createInterface({input,output});const key=await rl.question('\nPaste your SudoAI Profile CLI API key: ');rl.close();if(!key.trim().startsWith('sai_')){console.error('\n✗ Invalid key format. SudoAI CLI keys start with sai_\n');return false}apiKey=key.trim();await saveConfig({apiKey});console.log('\n✓ SudoAI account key saved locally.\n');return true}
async function logout(){apiKey='';try{await saveConfig({});console.log('\n✓ Local SudoAI API key removed.\n')}catch(error){console.error(`\n✗ ${error instanceof Error?error.message:String(error)}\n`)}}

async function main(){await loadConfig();const args=process.argv.slice(2);if(args.includes('--help')||args.includes('-h'))return usage();if(args[0]==='login')return login();if(args[0]==='logout')return logout();if(!apiKey){console.log('\n⚠ No SudoAI API key configured. Get one from Profile → SudoAI CLI access, then run `sudoai login`.\n');return}const oneShot=args.filter(a=>!a.startsWith('--')).join(' ').trim();if(oneShot){console.log(`\n  SudoAI · ${cwd}\n`);const data=await runAgent(oneShot);console.log(`\n${data.message}\n`);return}welcome();const rl=createInterface({input,output});try{while(true){const prompt=await rl.question('  › ');if(!prompt.trim())continue;const command=prompt.trim().toLowerCase();if(['/exit','exit','quit'].includes(command))break;if(command==='/help'){usage();continue}if(command==='/clear'){console.clear();welcome();continue}try{const data=await runAgent(prompt);console.log(`\n${data.message}\n`)}catch(error){console.error(`\n  ✗ ${error instanceof Error?error.message:String(error)}\n`)}}}finally{rl.close()}}
main().catch(error=>{console.error(error);process.exit(1)})
